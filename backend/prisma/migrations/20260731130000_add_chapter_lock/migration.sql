-- Per-chapter lock toggle (spec: toggle is_locked per subject/chapter)
ALTER TABLE "Chapter" ADD COLUMN "isLocked" BOOLEAN NOT NULL DEFAULT true;
