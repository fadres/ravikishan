-- 4c: record who decided a content block's type (rule-based classifier vs admin).
-- Plain TEXT column: "auto" | "manual", null for rows created before this migration.
ALTER TABLE "ContentBlock" ADD COLUMN "classifiedBy" TEXT;
