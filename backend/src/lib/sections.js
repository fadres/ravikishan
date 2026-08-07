// Canonical educational schema for every topic.
//
// Single source of truth for the structured-note architecture:
//   • the exact section hierarchy every topic must follow
//   • the block types that belong to each section
//   • the default access tier of each section (used by the importer and the
//     degradation engine)
//   • per-viewer section visibility limits that implement automatic content
//     degradation (public ≈10% → level 1 = 100%)
//
// Render order is ALWAYS sectionIndex (this list), then sortOrder. Neither
// the API nor the frontend may reorder sections.

// sectionIndex → section definition. Never reorder — append only.
export const SECTION_ORDER = [
  {
    key: 'topic',
    label: 'Topic',
    blockTypes: ['note_topic'],
    defaultAccess: 3,
    description: 'Topic title / intro — the widest overview.',
  },
  {
    key: 'learning',
    label: 'Learning Outcomes',
    blockTypes: ['learning_outcome'],
    defaultAccess: 3,
    description: 'What the student will be able to do after this topic.',
  },
  {
    key: 'diagram',
    label: 'Topic Diagram',
    blockTypes: ['mindmap'],
    defaultAccess: 1,
    description: 'Hierarchical diagram of the whole topic (symbols + legend). Premium only.',
  },
  {
    key: 'concept',
    label: 'Concept',
    blockTypes: ['note_concept', 'note_statement', 'formula', 'symbols', 'byakaran'],
    defaultAccess: 3,
    description: 'Definition, statement, formula, explanation — the core idea.',
  },
  {
    key: 'examples',
    label: 'Examples',
    blockTypes: ['note_example', 'numerical'],
    defaultAccess: 2,
    description: 'Conceptual → practical → numerical → real-life, easiest first.',
  },
  {
    key: 'important',
    label: 'Important Points',
    blockTypes: ['note_important', 'important_points'],
    defaultAccess: 2,
    description: 'Common mistakes, misconceptions, exceptions, shortcuts, examiner traps.',
  },
  {
    key: 'mind_recall',
    label: 'Mind Recall',
    blockTypes: ['keywords', 'mind_recall'],
    defaultAccess: 1,
    description: 'Keywords, one-line concepts, memory hacks, rapid revision — 2-minute recap.',
  },
  {
    key: 'pyq',
    label: 'Past Year Questions',
    blockTypes: ['pyq'],
    defaultAccess: 2,
    description: 'Board / entrance / repeated questions, chronological when possible.',
  },
  {
    key: 'solved',
    label: 'Solved Examples',
    blockTypes: ['solved_example'],
    defaultAccess: 1,
    description: 'Step-by-step solutions, sorted easy → medium → hard.',
  },
  {
    key: 'premium',
    label: 'Advanced Learning',
    blockTypes: ['premium_expansion'],
    defaultAccess: 1,
    description: 'Premium Level 1 — higher concepts, deep explanations, advanced MCQs.',
  },
  {
    key: 'references',
    label: 'References',
    blockTypes: ['reference', 'revision_summary', 'summary'],
    defaultAccess: 1,
    description: 'Sources and a closing revision summary.',
  },
];

const INDEX = new Map();
SECTION_ORDER.forEach((section, i) => {
  INDEX.set(section.key, i);
  for (const bt of section.blockTypes) INDEX.set(bt, i);
});

export function sectionIndexForBlockType(blockType) {
  return INDEX.get(blockType) ?? 0;
}

export function sectionKeyForBlockType(blockType) {
  const i = sectionIndexForBlockType(blockType);
  return SECTION_ORDER[i]?.key ?? 'topic';
}

export function sectionLabelForBlockType(blockType) {
  const i = sectionIndexForBlockType(blockType);
  return SECTION_ORDER[i]?.label ?? 'Topic';
}

// ── Automatic content degradation ─────────────────────────────────────────
//
// Each viewer tier may see sections up to a limit index (inclusive). This is
// combined with the per-block accessLevel gate: a block is visible when
//   sectionIndex(block) <= sectionLimit(viewerLevel)
//   AND block.accessLevel >= viewerLevel
//
// Approximate topic coverage per tier (typical 10–14 block topic):
//   level 4 (public, no account) → sections 0–1   → ≈15%
//   level 3 (logged in)          → sections 0–3   → ≈25%
//   level 2 (member, approved)   → sections 0–5   → ≈50%
//   level 1 (premium)            → all sections   → 100%
//
// The diagram section (index 2) and its mindmap blocks are premium only
// (accessLevel 1): guests/members may see the section slot, but the block
// accessLevel gate hides the actual content. An anonymous visitor is
// modelled as viewerLevel 4 (public).

export function viewerSectionLimit(viewerLevel) {
  const level = viewerLevel || 4; // missing token ⇒ public
  if (level >= 4) return 1; // public ≈15%
  if (level === 3) return 3; // logged-in ≈25% (topic + learning + concept)
  if (level === 2) return 5; // member ≈50%
  return SECTION_ORDER.length - 1; // premium = everything
}

export function isSectionVisible(sectionIndex, blockAccessLevel, viewerLevel) {
  const level = viewerLevel || 4;
  const limit = viewerSectionLimit(level);
  const idx = sectionIndex ?? 0;
  // Public (4) still reads the widest tier of blocks (accessLevel 3 = the
  // most general content) but only inside their section limit (~15%).
  const minBlockAccess = Math.min(level, 3);
  return idx <= limit && (blockAccessLevel ?? 3) >= minBlockAccess;
}

export function coverageForTopic(blocks, viewerLevel) {
  const total = blocks.length;
  if (!total) return 0;
  const visible = blocks.filter((b) => isSectionVisible(b.sectionIndex ?? 0, b.accessLevel ?? 3, viewerLevel)).length;
  return Math.round((visible / total) * 100);
}
