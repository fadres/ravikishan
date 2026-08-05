-- import-notes pipeline state:
--   • Chapter.metadata   — per-chapter tab order + import provenance (Json)
--   • ContentBlock.status — block-level publish/archive state (draft|published|archived)

ALTER TABLE "Chapter" ADD COLUMN IF NOT EXISTS "metadata" JSONB NOT NULL DEFAULT '{}';

ALTER TABLE "ContentBlock" ADD COLUMN IF NOT EXISTS "status" "ContentStatus" NOT NULL DEFAULT 'draft';
