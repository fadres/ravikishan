-- Access tiers (spec: level 3 = free for everyone, 2 = approved members,
-- 1 = most premium). A block is readable when its accessLevel is >= the
-- viewer's accessLevel.
ALTER TABLE "User" ADD COLUMN "accessLevel" INTEGER NOT NULL DEFAULT 3;
ALTER TABLE "ContentBlock" ADD COLUMN "accessLevel" INTEGER NOT NULL DEFAULT 3;
