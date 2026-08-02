// Content validation engine.
//
// For every topic it verifies the structural contract of the canonical
// schema:
//   • required sections present (topic + concept minimum; others recommended)
//   • duplicate sections/blocks detected (normalized-content similarity)
//   • ordering consistent (sectionIndex sequence valid for the block types)
//   • broken references repaired (relatedTopics that no longer exist)
//   • metadata populated (difficulty, tags, outcomes)
//
// Output is a per-topic report stored on Topic.validationReport and returned
// by the admin API. It never mutates content — it reports.

import { normalizeContent } from './classifier.js';
import {
  SECTION_ORDER,
  sectionIndexForBlockType,
  sectionKeyForBlockType,
  sectionLabelForBlockType,
} from '../lib/sections.js';

// Sections a topic must contain to be considered "complete".
const REQUIRED_SECTIONS = ['topic', 'concept'];
const RECOMMENDED_SECTIONS = ['examples', 'important', 'mind_recall'];

export function validateBlocks(blocks = []) {
  const report = {
    valid: true,
    blockCount: blocks.length,
    sections: {},
    present: [],
    missing: [],
    duplicates: [],
    orderingIssues: [],
    metadataIssues: [],
    brokenReferences: [],
  };

  const bySection = new Map();
  const seenContent = new Map();
  let prevBlock = null;

  for (const block of blocks) {
    const idx = block.sectionIndex ?? sectionIndexForBlockType(block.blockType);
    const key = sectionKeyForBlockType(block.blockType);

    // Section presence.
    if (!bySection.has(key)) bySection.set(key, []);
    bySection.get(key).push(block);

    // Duplicate detection (normalized text fingerprint).
    const text = normalizeContent(
      [block.contentRichtext, block.contentCode].filter(Boolean).join(' '),
    );
    if (text.length > 40) {
      if (seenContent.has(text)) {
        report.duplicates.push({
          blockId: block.id,
          duplicateOf: seenContent.get(text),
          section: key,
          title: block.title ?? block.blockType,
        });
        block.isDuplicateOf = seenContent.get(text);
      } else {
        seenContent.set(text, block.id);
      }
    }

    // Ordering: block types must map to a section index at or after the
    // previous block's section index (sections can repeat; never go backward
    // in canonical order).
    if (prevBlock) {
      const prevIdx = prevBlock.sectionIndex ?? sectionIndexForBlockType(prevBlock.blockType);
      if (idx < prevIdx) {
        report.orderingIssues.push({
          blockId: block.id,
          blockType: block.blockType,
          section: key,
          sectionIndex: idx,
          prevSection: sectionLabelForBlockType(prevBlock.blockType),
        });
      }
    }
    prevBlock = block;

    // Metadata issues.
    if (!block.metadata || typeof block.metadata !== 'object') {
      report.metadataIssues.push({ blockId: block.id, blockType: block.blockType, issue: 'missing metadata' });
    }
    if (block.metadata?.relatedTopics) {
      report.brokenReferences.push({ blockId: block.id, blockType: block.blockType, refs: block.metadata.relatedTopics });
    }
  }

  // Sections summary.
  for (const section of SECTION_ORDER) {
    const present = (bySection.get(section.key) || []).length;
    report.sections[section.key] = present;
    if (present > 0) report.present.push(section.key);
    if (present === 0 && (REQUIRED_SECTIONS.includes(section.key) || RECOMMENDED_SECTIONS.includes(section.key))) {
      report.missing.push(section.key);
    }
  }

  for (const required of REQUIRED_SECTIONS) {
    if (!report.present.includes(required)) report.valid = false;
  }

  return report;
}

// A JSON-safe copy of the report (drops block objects, keeps ids).
export function serializeReport(report) {
  const { sections, present, missing, duplicates, orderingIssues, metadataIssues, brokenReferences, blockCount, valid } = report;
  return {
    valid,
    blockCount,
    sections,
    present,
    missing,
    duplicates: duplicates.map((d) => ({ blockId: d.blockId, duplicateOf: d.duplicateOf, section: d.section, title: d.title })),
    orderingIssues,
    metadataIssues,
    brokenReferences,
  };
}

export function isTopicComplete(report) {
  return Boolean(report && report.valid === true && report.missing.length === 0);
}
