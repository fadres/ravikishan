-- Class 11E draft system: every block carries an explicit draft "type"
-- (type 1 = first draft, 2, 3, ...). Class 11 always stores noteType 1
-- (the promoted "original"); Class 11E keeps every draft side by side and
-- the chapter UI renders per-note Type tabs from this column.

ALTER TABLE "ContentBlock" ADD COLUMN IF NOT EXISTS "noteType" INTEGER NOT NULL DEFAULT 1;
