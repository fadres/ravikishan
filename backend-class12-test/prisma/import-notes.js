// Ravikishan import-notes pipeline — production-grade import for the
// 7-tab note taxonomy (concept / note / example / formula / pyq / set /
// mindmap). Supersedes the loose legacy import for new-style content.
//
// Section-aware: --section resolves the content root AND the database
// client from the section registry (src/lib/sections.config.js). The script
// only ever writes to that section's own DB. Unknown section ids fail fast
// (error + exit 1) BEFORE any DB access — never falls back to another
// section's data. The section's Class row is always taken from the registry
// (section.classSlug), never from the tree, so an import can never create
// or touch a foreign section's class.
//
// Content root (default: the shared backend/content/ dir — the section's
// own folder is <section.contentDir>, e.g. content/class-11; overridable
// with --dir or NOTES_DIR):
//   content/
//     class-11/                          ← section.classSlug folder
//       physics/
//         thermodynamics/
//           concepts/01-first-law.json   → concept  (block: note_concept)
//           notes/01-quick-revision.json → note     (block: note_important)
//           examples/01-heat-engine.json → example  (block: note_example)
//           formula/01-key-equations.json→ formula  (block: formula)
//           pyqs/01-neb-2023.json        → pyq      (block: pyq)
//           sets/01-drill.json           → set      (block: solved_example)
//           mindmap/01-thermo-map.json   → mindmap  (block: mindmap)
//
// Files outside the section's own classSlug folder are skipped (logged, not
// counted as errors) — a run never reads or writes another section's tree.
//
// Every file is a flat JSON object: { title, notes: string[] } plus optional
// per-type fields: order (int), year, examSource, latex (bool), type.
//
// CLI flags:
//   --section <id>     section id from the registry (default: class-11)
//   --apply            write to the DB (default is a read-only dry-run)
//   --dry-run          explicit dry-run (default)
//   --publish          new imports get status "published" instead of "draft";
//                      changed published blocks are applied in place
//   --allow-create     create missing subject/chapter records instead of
//                      failing loudly per file
//   --archive-missing  mark blocks whose source file disappeared as archived
//   --dir <path>       content root (default: backend/content/, env: NOTES_DIR)
//   --log-dir <path>   log output dir (default backend/logs/, env: NOTES_LOG_DIR)
//   --threshold <n>    confidence below this is flagged needs-review (0.7)
//
// Safety:
//   • Dry-run by default — prints the full classification + diff report.
//   • Unknown section → error + non-zero exit before anything else.
//   • Foreign trees are never touched; the Class row comes from the registry,
//     so --allow-create can never create another section's classes here.
//   • Idempotent — stable key = chapterId + blockType + title; unchanged
//     blocks are skipped, so re-runs write nothing.
//   • A changed PUBLISHED block never mutates live content: a pending
//     ContentVersion is written and the block stays untouched until
//     --publish (or an admin-panel action) applies it.
//   • One bad file never aborts the run — errors are collected and reported.
//   • Structured run log written to logs/import-notes-<timestamp>.log.

import 'dotenv/config';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, appendFileSync } from 'node:fs';
import { join, basename, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SUBJECTS, slugify, humanize, loadJson } from './import-common.js';
import {
  classify,
  validateNoteSchema,
  TAB_TO_BLOCK_TYPE,
  TAB_ACCESS_LEVEL,
  DEFAULT_TAB_ORDER,
  CLASSIFICATION_THRESHOLD,
} from '../src/services/classifier.js';
import { sectionIndexForBlockType } from '../src/lib/sections.js';
import { defaultBlockMetadata } from '../src/ai/contentTemplate.js';
import { requireSection, SECTION } from '../src/lib/section.js';
import { prismaForSection } from '../src/config/db.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_LOG_DIR = join(HERE, 'logs');

// ── CLI ───────────────────────────────────────────────────────────────────

export function parseArgs(argv) {
  const args = argv.slice(2);
  const flags = {
    section: SECTION.id,
    apply: false,
    publish: false,
    allowCreate: false,
    archiveMissing: false,
    dir: process.env.NOTES_DIR || null,
    logDir: process.env.NOTES_LOG_DIR || DEFAULT_LOG_DIR,
    threshold: CLASSIFICATION_THRESHOLD,
  };
  let unknown = null;
  for (let i = 0; i < args.length; i += 1) {
    const a = args[i];
    if (a === '--apply') flags.apply = true;
    else if (a === '--dry-run') flags.apply = false;
    else if (a === '--publish') flags.publish = true;
    else if (a === '--allow-create') flags.allowCreate = true;
    else if (a === '--archive-missing') flags.archiveMissing = true;
    else if (a === '--section') flags.section = args[++i];
    else if (a.startsWith('--section=')) flags.section = a.slice('--section='.length);
    else if (a === '--dir') flags.dir = args[++i];
    else if (a.startsWith('--dir=')) flags.dir = a.slice('--dir='.length);
    else if (a === '--log-dir') flags.logDir = args[++i];
    else if (a.startsWith('--log-dir=')) flags.logDir = a.slice('--log-dir='.length);
    else if (a === '--threshold') flags.threshold = Number(args[++i]);
    else if (a.startsWith('--threshold=')) flags.threshold = Number(a.slice('--threshold='.length));
    else unknown = unknown || a;
  }
  if (unknown) {
    console.error(`✗ unknown flag: ${unknown}\n  run: npm run import-notes -- [--section <id>] [--apply] [--publish] [--allow-create] [--archive-missing] [--dir <path>] [--threshold <n>]`);
    process.exitCode = 1;
  }
  return flags;
}

// ── Pure helpers (unit-tested) ────────────────────────────────────────────

/**
 * Fail-fast section resolution for CLI runs: returns the registered section
 * or null (message printed, exitCode set). Runs BEFORE any DB access or
 * content walk — an unknown section id can never fall back to Class 11's
 * (or any other section's) database.
 */
export function resolveSectionFromFlags(flags) {
  try {
    return requireSection(flags.section);
  } catch (err) {
    console.error(`✗ ${err.message}`);
    process.exitCode = 1;
    return null;
  }
}

/**
 * Pure filter: is this file part of the given section's tree? True when the
 * file's first path segment is the section's own classSlug. Foreign trees
 * are skipped (never read, never written) — never treated as errors, so a
 * run can coexist with other sections' content in the shared root.
 */
export function isSectionFile(parts, section) {
  return slugify(parts.classSlug) === section.classSlug;
}

/**
 * Walk the content root for *.json files (sorted for determinism).
 * @returns {Array<{abs: string, relPath: string}>}
 */
export function discoverNoteFiles(root) {
  const files = [];
  const walk = (dir, rel) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue;
      const abs = join(dir, entry.name);
      const relPath = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(abs, relPath);
      else if (entry.name.toLowerCase().endsWith('.json')) files.push({ abs, relPath });
    }
  };
  if (existsSync(root)) walk(root, '');
  return files.sort((a, b) => a.relPath.localeCompare(b.relPath));
}

/**
 * Split a content-relative path into class / subject / chapter / typeFolder
 * / fileName. Returns null when the path is too shallow.
 */
export function pathParts(relPath) {
  const segs = String(relPath || '').replace(/\\/g, '/').split('/').filter(Boolean);
  if (segs.length < 4) return null;
  return {
    classSlug: segs[0],
    subjectSlug: segs[1],
    chapterSlug: segs[2],
    typeFolder: segs.length >= 5 ? segs[segs.length - 2] : null,
    fileName: segs[segs.length - 1],
  };
}

/**
 * Block order within its contentType group: explicit "order" in the JSON
 * wins, then a numeric filename prefix ("03-…"), then the group fallback.
 */
export function extractOrder(fileName, note, fallback) {
  if (note && Number.isInteger(note.order) && note.order >= 0) return note.order;
  const m = String(fileName || '').match(/^(\d+)[-\s._]/);
  if (m) return Number(m[1]);
  return fallback;
}

/**
 * Stable content hash for change detection. Any content change produces a
 * different hash; unchanged content re-runs as a skip (zero writes).
 */
export function contentHash(data) {
  const stable = JSON.stringify({
    blockType: data.blockType,
    title: data.title,
    contentRichtext: data.contentRichtext,
    accessLevel: data.accessLevel,
    sectionIndex: data.sectionIndex,
    mindmapJson: data.mindmapJson ?? null,
    order: data.metadata.order,
  });
  return createHash('sha256').update(stable).digest('hex');
}

/**
 * Convert indented "- " tree lines into the mindmap JSON shape
 * ({ name, children: [...] }). Returns null when the notes are not a tree.
 */
export function buildMindmapTree(notes) {
  const items = [];
  for (const raw of Array.isArray(notes) ? notes : [notes]) {
    for (const line of String(raw).split('\n')) {
      const m = line.match(/^(\s*)[-•*]\s+(.+)$/);
      if (!m) continue;
      const text = m[2].replace(/\s+/g, ' ').trim();
      if (text) items.push({ indent: m[1].length, text });
    }
  }
  if (items.length < 2) return null;
  const root = { name: items[0].text.slice(0, 100), children: [] };
  const stack = [{ indent: items[0].indent, node: root }];
  for (let i = 1; i < items.length; i += 1) {
    const it = items[i];
    while (stack.length > 1 && it.indent <= stack[stack.length - 1].indent) stack.pop();
    const node = { name: it.text.slice(0, 100), children: [] };
    stack[stack.length - 1].node.children.push(node);
    stack.push({ indent: it.indent, node });
  }
  return root;
}

/**
 * Build the ContentBlock payload from a classified note file. Pure — no DB.
 */
export function buildBlockData(note, classification, sourceKey, order) {
  const blockType = TAB_TO_BLOCK_TYPE[classification.type];
  const contentRichtext = Array.isArray(note.notes)
    ? note.notes.map((n) => String(n).trim()).filter(Boolean).join('\n\n')
    : '';
  const metadata = {
    ...defaultBlockMetadata({ source: 'import-notes', year: note.year ?? null, examType: note.examSource ?? null }),
    sourceKey,
    contentType: classification.type,
    classifiedConfidence: classification.confidence,
    classifiedReason: classification.reason,
    order,
  };
  const data = {
    blockType,
    title: note.title.trim(),
    contentRichtext,
    accessLevel: TAB_ACCESS_LEVEL[classification.type],
    sectionIndex: sectionIndexForBlockType(blockType),
    metadata,
  };
  if (classification.type === 'mindmap') {
    const tree = buildMindmapTree(note.notes);
    if (tree) data.mindmapJson = tree;
  }
  data.metadata.contentHash = contentHash(data);
  return data;
}

// ── Run log ───────────────────────────────────────────────────────────────

export function startRunLog(logDir) {
  mkdirSync(logDir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const path = join(logDir, `import-notes-${ts}.log`);
  const write = (line) => {
    const full = `[${new Date().toISOString()}] ${line}\n`;
    try {
      appendFileSync(path, full);
    } catch {
      /* logging must never abort the run */
    }
  };
  return { path, write };
}

// ── DB steps (guarded: never called during dry-run) ───────────────────────

async function findExistingBlock(db, chapterId, blockType, title) {
  return db.contentBlock.findFirst({
    where: { chapterId, blockType, title },
    orderBy: { createdAt: 'asc' },
  });
}

async function writePendingVersion(db, blockId, data) {
  const last = await db.contentVersion.findFirst({
    where: { blockId },
    orderBy: { version: 'desc' },
    select: { version: true },
  });
  const version = (last?.version ?? 0) + 1;
  await db.contentVersion.create({
    data: {
      blockId,
      version,
      title: data.title,
      contentRichtext: data.contentRichtext,
      mindmapJson: data.mindmapJson ?? undefined,
      changedBy: 'import-notes',
    },
  });
  return version;
}

/**
 * Upsert one block. Returns { action, detail } where action is one of
 * create | update | pending-version | skip. In dry-run nothing is written;
 * actions are still predicted from a DB read.
 *
 * Publish safety: a changed PUBLISHED block never mutates live content —
 * its edit is staged as a pending ContentVersion and the block stays
 * untouched. Only --publish (or an admin-panel action) applies it.
 */
async function upsertBlock(db, chapter, data, flags, log) {
  const existing = await findExistingBlock(db, chapter.id, data.blockType, data.title);

  if (!existing) {
    const status = flags.publish ? 'published' : 'draft';
    if (flags.apply) {
      await db.contentBlock.create({
        data: {
          chapterId: chapter.id,
          blockType: data.blockType,
          title: data.title,
          contentRichtext: data.contentRichtext,
          mindmapJson: data.mindmapJson ?? undefined,
          accessLevel: data.accessLevel,
          sectionIndex: data.sectionIndex,
          sortOrder: data.metadata.order,
          status,
          metadata: data.metadata,
          classifiedBy: 'auto',
        },
      });
    }
    log(`create title=${data.title} type=${data.blockType} status=${status}`);
    return { action: 'create', detail: `status=${status}` };
  }

  const unchanged = existing.metadata?.contentHash === data.metadata.contentHash;
  // A pending version staged earlier for exactly this file state: --publish
  // now applies it (no duplicate version is written — it already exists).
  const pendingReady =
    Boolean(existing.metadata?.pendingImport) &&
    unchanged &&
    existing.contentRichtext !== data.contentRichtext;

  if (unchanged && !pendingReady) {
    log(`skip file=… block=${existing.id} title=${data.title} — content unchanged`);
    return { action: 'skip', detail: 'content unchanged' };
  }

  if (existing.status === 'published' && !flags.publish) {
    // Never mutate live content: stage a pending version, keep the block as
    // it is, and record the pending state in metadata.
    let version = 0;
    if (flags.apply) {
      version = await writePendingVersion(db, existing.id, data);
      await db.contentBlock.update({
        where: { id: existing.id },
        data: {
          metadata: {
            ...(existing.metadata ?? {}),
            contentHash: data.metadata.contentHash,
            pendingImport: { version, pendingAt: new Date().toISOString(), title: data.title },
          },
        },
      });
    }
    log(`pending-version block=${existing.id} version=${version} title=${data.title} — published block changed without --publish`);
    return { action: 'pending-version', detail: `version=${version}; published block untouched` };
  }

  // Apply path: --publish, or the block is draft/archived.
  const status =
    existing.status === 'archived' && !flags.publish
      ? 'draft' // revived file: like a fresh import
      : flags.publish
        ? 'published'
        : existing.status;
  if (flags.apply) {
    if (flags.publish && !pendingReady) {
      // Fresh publish of changed content: record an audit version.
      await writePendingVersion(db, existing.id, data);
    }
    const metadata = { ...data.metadata };
    delete metadata.pendingImport;
    await db.contentBlock.update({
      where: { id: existing.id },
      data: {
        title: data.title,
        contentRichtext: data.contentRichtext,
        mindmapJson: data.mindmapJson ?? undefined,
        accessLevel: data.accessLevel,
        sectionIndex: data.sectionIndex,
        sortOrder: data.metadata.order,
        status,
        metadata,
      },
    });
  }
  log(`update block=${existing.id} title=${data.title} status=${status}${pendingReady ? ' (applied pending version)' : ''}`);
  return { action: 'update', detail: `status=${status}${pendingReady ? '; applied pending version' : ''}` };
}

// ── Main ──────────────────────────────────────────────────────────────────

function printTable(rows) {
  const pad = (s, n) => String(s).padEnd(n).slice(0, n);
  console.log(`\n  ${pad('filepath', 66)} ${pad('type', 9)} ${pad('conf', 6)} action`);
  console.log(`  ${'-'.repeat(66)} ${'-'.repeat(9)} ${'-'.repeat(6)} ${'-'.repeat(20)}`);
  for (const r of rows) {
    console.log(`  ${pad(r.filepath, 66)} ${pad(r.type ?? '—', 9)} ${pad(r.confidence != null ? r.confidence.toFixed(2) : '—', 6)} ${r.action}${r.detail ? ` (${r.detail})` : ''}`);
  }
}

async function main() {
  const flags = parseArgs(process.argv);

  // Fail fast on unknown section ids BEFORE any DB access or content walk —
  // never falls back to another section's database (see ARCHITECTURE.md).
  const section = resolveSectionFromFlags(flags);
  if (!section) return;
  const db = prismaForSection(flags.section);

  const mode = flags.apply ? 'apply' : 'dry-run';
  // Content root from the registry: <contentDir> is the section's folder
  // under the shared backend/content/ root (e.g. content/class-11) — the
  // WALK root is that root, so trees are class-first. --dir / NOTES_DIR
  // override the walk root entirely.
  const dir = flags.dir ?? join(dirname(HERE), dirname(section.contentDir));
  if (!existsSync(dir)) {
    console.error(`✗ content dir not found: ${dir}\n  place the taxonomy tree there or pass --dir <path>`);
    process.exit(1);
  }
  const runLog = startRunLog(flags.logDir);
  const log = (line) => runLog.write(line);
  log(`run section=${section.id} mode=${mode} dir=${dir} publish=${flags.publish} allowCreate=${flags.allowCreate} archiveMissing=${flags.archiveMissing} threshold=${flags.threshold}`);
  console.log(`→ import-notes [${mode}]  section: ${section.id}  dir: ${dir}`);

  const files = discoverNoteFiles(dir);
  const report = { created: 0, updated: 0, pendingVersion: 0, archived: 0, skipped: 0, skippedForeign: 0, needsReview: 0, errors: 0 };
  const rows = [];
  const errors = [];

  // ── Pass 1 (pure): parse, validate, classify, assign intra-group order.
  const plan = [];
  const groupOrder = new Map();
  for (const file of files) {
    const parts = pathParts(file.relPath);
    if (!parts) {
      report.errors += 1;
      errors.push(`path too shallow: ${file.relPath} (need class/subject/chapter/…)`);
      rows.push({ filepath: file.relPath, type: null, confidence: null, action: 'error', detail: 'path too shallow' });
      continue;
    }
    // Other sections' trees (e.g. content/class-12 under a class-11 run) are
    // skipped — never parsed, never written, never counted as errors.
    if (!isSectionFile(parts, section)) {
      report.skippedForeign += 1;
      log(`skip foreign tree file=${file.relPath} — not part of section "${section.id}"`);
      continue;
    }
    const note = loadJson(file.abs);
    if (!note) {
      report.errors += 1;
      errors.push(`unparseable JSON: ${file.relPath}`);
      rows.push({ filepath: file.relPath, type: null, confidence: null, action: 'error', detail: 'unparseable JSON' });
      continue;
    }
    const schema = validateNoteSchema(note);
    if (!schema.valid) {
      report.errors += 1;
      errors.push(`schema error ${file.relPath}: ${schema.errors.join('; ')}`);
      rows.push({ filepath: file.relPath, type: null, confidence: null, action: 'error', detail: schema.errors.join('; ') });
      continue;
    }
    const classification = classify(note, file.relPath, {
      type: note.type,
      year: note.year,
      examSource: note.examSource,
      latex: note.latex,
    });
    if (classification.needsReview) {
      report.needsReview += 1;
      rows.push({ filepath: file.relPath, type: classification.type, confidence: classification.confidence, action: 'needs-review', detail: classification.reason });
      log(`needs-review file=${file.relPath} type=${classification.type} confidence=${classification.confidence} — ${classification.reason}`);
      continue;
    }
    const groupKey = `${parts.classSlug}|${parts.subjectSlug}|${parts.chapterSlug}|${classification.type}`;
    if (!groupOrder.has(groupKey)) groupOrder.set(groupKey, []);
    groupOrder.get(groupKey).push({ fileName: parts.fileName, relPath: file.relPath });
    plan.push({ file, note, classification, parts, explicitOrder: Number.isInteger(note.order) ? note.order : null });
  }
  for (const list of groupOrder.values()) {
    list.sort((a, b) => a.fileName.localeCompare(b.fileName));
    list.forEach((f, i) => {
      const entry = plan.find((p) => p.parts.fileName === f.fileName && p.parts.relPath === f.relPath);
      if (entry) entry.groupIndex = i;
    });
  }

  // ── Pass 2: resolve records + upsert (writes only with --apply).
  for (const entry of plan) {
    const { file, note, classification, parts } = entry;
    const sourceKey = `import-notes:${file.relPath}`;
    try {
      const resolved = await resolvePlace(db, parts, flags, section);
      if (resolved.error) {
        report.errors += 1;
        errors.push(`${file.relPath}: ${resolved.error}`);
        rows.push({ filepath: file.relPath, type: classification.type, confidence: classification.confidence, action: 'error', detail: resolved.error });
        continue;
      }
      const order = extractOrder(parts.fileName, note, entry.groupIndex ?? 0);
      const data = buildBlockData(note, classification, sourceKey, order);
      const result = await upsertBlock(db, resolved.chapter, data, flags, log);
      rows.push({ filepath: file.relPath, type: classification.type, confidence: classification.confidence, action: result.action, detail: result.detail });
      if (result.action === 'create') report.created += 1;
      else if (result.action === 'update') report.updated += 1;
      else if (result.action === 'pending-version') report.pendingVersion += 1;
      else if (result.action === 'skip') report.skipped += 1;
    } catch (err) {
      report.errors += 1;
      errors.push(`${file.relPath}: ${err.message}`);
      rows.push({ filepath: file.relPath, type: classification.type, confidence: classification.confidence, action: 'error', detail: err.message });
    }
  }

  // ── Archive missing (--archive-missing only).
  const seen = new Set(plan.map((p) => `import-notes:${p.file.relPath}`));
  if (flags.archiveMissing) {
    const stale = await db.contentBlock.findMany({
      where: { metadata: { path: ['sourceKey'], string_starts_with: 'import-notes:' } },
      select: { id: true, chapterId: true, blockType: true, title: true, status: true, metadata: true },
    });
    for (const b of stale) {
      if (seen.has(b.metadata?.sourceKey) || b.status === 'archived') continue;
      report.archived += 1;
      if (flags.apply) {
        await db.contentBlock.update({ where: { id: b.id }, data: { status: 'archived' } });
      }
      rows.push({ filepath: b.metadata?.sourceKey, type: b.blockType, confidence: null, action: 'archive', detail: 'source file missing from content dir' });
      log(`archive block=${b.id} title=${b.title} — source file no longer present`);
    }
  }

  // ── Report ──────────────────────────────────────────────────────────────
  printTable(rows);
  console.log(`\n  summary (${mode}): created=${report.created} updated=${report.updated} pending-version=${report.pendingVersion} archived=${report.archived} skipped=${report.skipped} foreign-skipped=${report.skippedForeign} needs-review=${report.needsReview} errors=${report.errors}`);
  if (report.errors) {
    console.log('\n  errors:');
    for (const e of errors) console.log(`    ✗ ${e}`);
  }
  if (!flags.apply) {
    console.log(`\n  dry-run: no DB writes performed. Re-run with --apply to import.`);
  }
  console.log(`  log: ${runLog.path}`);
  log(`done mode=${mode} created=${report.created} updated=${report.updated} pendingVersion=${report.pendingVersion} archived=${report.archived} skipped=${report.skipped} skippedForeign=${report.skippedForeign} needsReview=${report.needsReview} errors=${report.errors}`);

  if (report.errors > 0) process.exitCode = 1;
}

/**
 * Resolve (or create with --allow-create) class / subject / chapter rows for
 * a path's segments. The Class row is the section's identity and always comes
 * from the registry (section.classSlug) — NEVER from the tree, so an import
 * can never create or touch a foreign section's class. Never writes during
 * dry-run.
 */
async function resolvePlace(db, parts, flags, section) {
  const klass = await db.class.findUnique({ where: { slug: section.classSlug } });
  if (!klass) {
    return { error: `class "${section.classSlug}" not found in section "${section.id}" database — run the section's seed/migrate first` };
  }

  const subjectSlug = slugify(parts.subjectSlug);
  let subject = await db.subject.findFirst({ where: { classId: klass.id, slug: subjectSlug } });
  if (!subject) {
    const cfg = SUBJECTS[subjectSlug];
    if (!flags.allowCreate) return { error: `subject "${parts.subjectSlug}" not found under "${parts.classSlug}" — pass --allow-create` };
    if (!cfg) return { error: `no subject config for "${parts.subjectSlug}" (known: ${Object.keys(SUBJECTS).join(', ')})` };
    if (flags.apply) {
      subject = await db.subject.create({
        data: { classId: klass.id, name: cfg.name, slug: subjectSlug, subjectType: cfg.subjectType, icon: cfg.icon, themeColor: cfg.themeColor, isLocked: true, sortOrder: 0, status: flags.publish ? 'published' : 'draft' },
      });
    } else {
      subject = { id: `__new__${subjectSlug}`, slug: subjectSlug };
    }
  }

  const chapterSlug = slugify(parts.chapterSlug);
  let chapter = await db.chapter.findFirst({ where: { subjectId: subject.id, slug: chapterSlug } });
  if (!chapter) {
    if (!flags.allowCreate) return { error: `chapter "${parts.chapterSlug}" not found under "${parts.subjectSlug}" — pass --allow-create` };
    if (flags.apply) {
      chapter = await db.chapter.create({
        data: {
          subjectId: subject.id,
          title: humanize(parts.chapterSlug),
          slug: chapterSlug,
          isLocked: true,
          sortOrder: 0,
          status: flags.publish ? 'published' : 'draft',
          metadata: { tabOrder: DEFAULT_TAB_ORDER, importedBy: 'import-notes' },
        },
      });
    } else {
      chapter = { id: `__new__${chapterSlug}`, slug: chapterSlug };
    }
  }
  return { klass, subject, chapter };
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isDirectRun) {
  main()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(async () => {
      const section = resolveSectionFromFlags(parseArgs(process.argv));
      if (section) await prismaForSection(section.id).$disconnect();
    });
}
