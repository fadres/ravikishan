-- Structured notes: canonical educational schema for every topic.
--
-- Non-destructive: adds new block types (enum extension), explicit topic
-- grouping, canonical section ordering, per-block metadata, duplicate
-- tracking, and an extended search vector (subLevel + tags). No existing
-- content is dropped or rewritten — sectionIndex/topicId are backfilled by
-- scripts, never migrated destructively.

-- ── 1. Extend BlockType enum (backward compatible) ───────────────────────
DO $notes$
BEGIN
  ALTER TYPE "BlockType" ADD VALUE IF NOT EXISTS 'learning_outcome';
  ALTER TYPE "BlockType" ADD VALUE IF NOT EXISTS 'mind_recall';
  ALTER TYPE "BlockType" ADD VALUE IF NOT EXISTS 'pyq';
  ALTER TYPE "BlockType" ADD VALUE IF NOT EXISTS 'solved_example';
  ALTER TYPE "BlockType" ADD VALUE IF NOT EXISTS 'premium_expansion';
  ALTER TYPE "BlockType" ADD VALUE IF NOT EXISTS 'reference';
  ALTER TYPE "BlockType" ADD VALUE IF NOT EXISTS 'revision_summary';
END
$notes$;

-- ── 2. ContentBlock: topic grouping, section order, metadata, duplicates ──
ALTER TABLE "ContentBlock" ADD COLUMN IF NOT EXISTS "topicId" TEXT;
ALTER TABLE "ContentBlock" ADD COLUMN IF NOT EXISTS "sectionIndex" INTEGER;
ALTER TABLE "ContentBlock" ADD COLUMN IF NOT EXISTS "metadata" JSONB;
ALTER TABLE "ContentBlock" ADD COLUMN IF NOT EXISTS "isDuplicateOf" TEXT;

CREATE INDEX IF NOT EXISTS "ContentBlock_topicId_idx" ON "ContentBlock"("topicId");
CREATE INDEX IF NOT EXISTS "ContentBlock_sectionIndex_idx" ON "ContentBlock"("sectionIndex");

-- ── 3. Topic: structured metadata + validation report ────────────────────
ALTER TABLE "Topic" ADD COLUMN IF NOT EXISTS "metadata" JSONB;
ALTER TABLE "Topic" ADD COLUMN IF NOT EXISTS "validationReport" JSONB;

-- ── 4. Foreign key: ContentBlock → Topic (SET NULL keeps blocks safe) ─────
DO $notes$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ContentBlock_topicId_fkey'
  ) THEN
    ALTER TABLE "ContentBlock"
      ADD CONSTRAINT "ContentBlock_topicId_fkey"
      FOREIGN KEY ("topicId") REFERENCES "Topic"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$notes$;

-- ── 5. Extend search vectors: subLevel (level markers) + tag keywords ────
DROP INDEX IF EXISTS "idx_content_search_english";
DROP INDEX IF EXISTS "idx_content_search_simple";
ALTER TABLE "ContentBlock" DROP COLUMN IF EXISTS "search_vector_english";
ALTER TABLE "ContentBlock" DROP COLUMN IF EXISTS "search_vector_simple";
ALTER TABLE "ContentBlock"
  ADD COLUMN "search_vector_english" tsvector GENERATED ALWAYS AS (
    to_tsvector(
      'english',
      COALESCE(title, '') || ' ' ||
      COALESCE("subLevel", '') || ' ' ||
      COALESCE(("metadata"->>'keywords')::text, '') || ' ' ||
      COALESCE("contentRichtext", '') || ' ' ||
      COALESCE("contentCode", '')
    )
  ) STORED;
ALTER TABLE "ContentBlock"
  ADD COLUMN "search_vector_simple" tsvector GENERATED ALWAYS AS (
    to_tsvector(
      'simple',
      COALESCE(title, '') || ' ' ||
      COALESCE("subLevel", '') || ' ' ||
      COALESCE(("metadata"->>'keywords')::text, '') || ' ' ||
      COALESCE("contentRichtext", '') || ' ' ||
      COALESCE("contentCode", '')
    )
  ) STORED;
CREATE INDEX "idx_content_search_english" ON "ContentBlock" USING GIN ("search_vector_english");
CREATE INDEX "idx_content_search_simple" ON "ContentBlock" USING GIN ("search_vector_simple");
