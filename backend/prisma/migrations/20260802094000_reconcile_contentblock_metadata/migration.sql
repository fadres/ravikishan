-- Final metadata reconciliation: adds ContentBlock.classifiedBy (used by the
-- block-classifier bookkeeping) and normalises full-text-search index names
-- to the legacy convention. All statements are guarded no-ops where the
-- target already exists.

DO $recon$
BEGIN
  ALTER TABLE "ContentBlock" ADD COLUMN IF NOT EXISTS "classifiedBy" TEXT;
  DROP INDEX IF EXISTS "ContentBlock_search_vector_english_idx";
  DROP INDEX IF EXISTS "ContentBlock_search_vector_simple_idx";
  CREATE INDEX IF NOT EXISTS "idx_content_search_english" ON "ContentBlock" USING GIN ("search_vector_english");
  CREATE INDEX IF NOT EXISTS "idx_content_search_simple" ON "ContentBlock" USING GIN ("search_vector_simple");
END
$recon$;
