-- Full-text search support for databases that predate the search_vector
-- columns (e.g. the reconciled dev database). Fresh databases already get
-- these as generated columns from the earlier migrations — every statement
-- here is a guarded no-op in that case.

-- AddEnum
DO $search$
BEGIN
  ALTER TABLE "ContentBlock" ADD COLUMN IF NOT EXISTS "search_vector_english" tsvector GENERATED ALWAYS AS (to_tsvector('english'::regconfig, ((((COALESCE(title, ''::text) || ' '::text) || COALESCE("contentRichtext", ''::text)) || ' '::text) || COALESCE("contentCode", ''::text)))) STORED;
  ALTER TABLE "ContentBlock" ADD COLUMN IF NOT EXISTS "search_vector_simple" tsvector GENERATED ALWAYS AS (to_tsvector('simple'::regconfig, ((((COALESCE(title, ''::text) || ' '::text) || COALESCE("contentRichtext", ''::text)) || ' '::text) || COALESCE("contentCode", ''::text)))) STORED;
  CREATE INDEX IF NOT EXISTS "idx_content_search_english" ON "ContentBlock" USING GIN ("search_vector_english");
  CREATE INDEX IF NOT EXISTS "idx_content_search_simple" ON "ContentBlock" USING GIN ("search_vector_simple");
END
$search$;
