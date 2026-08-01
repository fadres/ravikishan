-- Access-level + content-flow round 2:
--   1. New block types: formula (formula section), symbols (symbols section).
--   2. Index on Chapter.subjectId (faster chapter lookups per subject).

ALTER TYPE "BlockType" ADD VALUE IF NOT EXISTS 'formula';
ALTER TYPE "BlockType" ADD VALUE IF NOT EXISTS 'symbols';

CREATE INDEX IF NOT EXISTS "Chapter_subjectId_idx" ON "Chapter" ("subjectId");
