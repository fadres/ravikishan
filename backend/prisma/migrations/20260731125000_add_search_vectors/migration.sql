-- Full-text search support for content blocks.
-- Generated columns: kept in sync automatically by PostgreSQL on every write.
-- 'english' config ranks English text; 'simple' config indexes raw word tokens
-- (lowercased), which also works for Devanagari/Nepali content.

ALTER TABLE "ContentBlock"
  ADD COLUMN search_vector_english tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce("contentRichtext", '') || ' ' || coalesce("contentCode", ''))
  ) STORED;

ALTER TABLE "ContentBlock"
  ADD COLUMN search_vector_simple tsvector
  GENERATED ALWAYS AS (
    to_tsvector('simple', coalesce(title, '') || ' ' || coalesce("contentRichtext", '') || ' ' || coalesce("contentCode", ''))
  ) STORED;

CREATE INDEX idx_content_search_english ON "ContentBlock" USING GIN (search_vector_english);
CREATE INDEX idx_content_search_simple ON "ContentBlock" USING GIN (search_vector_simple);
