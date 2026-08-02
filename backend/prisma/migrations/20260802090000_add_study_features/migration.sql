-- ───────────────────────────────────────────────────────────────────────
-- Reconciliation of schema drift: objects that exist in the database but
-- were never recorded in migration history (created via db push before
-- migrations were reconciled). All statements are guarded so they are
-- no-ops on databases that already contain them.
-- ───────────────────────────────────────────────────────────────────────

-- CreateEnum (guarded)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Role') THEN
    CREATE TYPE "Role" AS ENUM ('owner', 'admin', 'member', 'guest');
  END IF;
END
$$;
-- CreateEnum (guarded)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RequestStatus') THEN
    CREATE TYPE "RequestStatus" AS ENUM ('pending', 'approved', 'denied');
  END IF;
END
$$;
-- CreateEnum (guarded)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SubjectType') THEN
    CREATE TYPE "SubjectType" AS ENUM ('science_math', 'biology', 'english', 'nepali', 'general_knowledge');
  END IF;
END
$$;
-- CreateEnum (guarded)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Difficulty') THEN
    CREATE TYPE "Difficulty" AS ENUM ('easy', 'medium', 'hard', 'expert');
  END IF;
END
$$;
-- CreateEnum (guarded)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ContentStatus') THEN
    CREATE TYPE "ContentStatus" AS ENUM ('draft', 'published', 'archived');
  END IF;
END
$$;
-- CreateEnum (guarded)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BlockType') THEN
    CREATE TYPE "BlockType" AS ENUM ('note_topic', 'note_statement', 'note_example', 'note_concept', 'note_important', 'numerical', 'mindmap', 'diagram_compare', 'summary', 'keywords', 'important_points', 'byakaran', 'formula', 'symbols');
  END IF;
END
$$;
-- CreateEnum (guarded)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UploadStatus') THEN
    CREATE TYPE "UploadStatus" AS ENUM ('pending', 'complete', 'failed', 'deleted');
  END IF;
END
$$;
-- CreateTable (guarded: drift object present in databases that were reconciled)
-- CreateTable
CREATE TABLE IF NOT EXISTS "PasswordHash" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PasswordHash_pkey" PRIMARY KEY ("id")
);
-- CreateTable (guarded: drift object present in databases that were reconciled)
-- CreateTable
CREATE TABLE IF NOT EXISTS "DecisionMaker" (
    "id" TEXT NOT NULL,
    "contentBlockId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DecisionMaker_pkey" PRIMARY KEY ("id")
);
-- CreateTable (guarded: drift object present in databases that were reconciled)
-- CreateTable
CREATE TABLE IF NOT EXISTS "R2Upload" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "fileUrl" TEXT,
    "bucket" TEXT,
    "fileSize" INTEGER,
    "mimeType" TEXT NOT NULL,
    "fileHash" TEXT,
    "status" "UploadStatus" NOT NULL DEFAULT 'pending',
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "R2Upload_pkey" PRIMARY KEY ("id")
);
-- CreateTable (guarded: drift object present in databases that were reconciled)
-- CreateTable
CREATE TABLE IF NOT EXISTS "Topic" (
    "id" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" "ContentStatus" NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Topic_pkey" PRIMARY KEY ("id")
);
-- CreateTable (guarded: drift object present in databases that were reconciled)
-- CreateTable
CREATE TABLE IF NOT EXISTS "ContentVersion" (
    "id" TEXT NOT NULL,
    "blockId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT,
    "contentRichtext" TEXT,
    "contentCode" TEXT,
    "codeLanguage" TEXT,
    "mindmapJson" JSONB,
    "diagramData" JSONB,
    "subLevel" TEXT,
    "changedBy" TEXT NOT NULL,
    "changedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ContentVersion_pkey" PRIMARY KEY ("id")
);
-- CreateTable (guarded: drift object present in databases that were reconciled)
-- CreateTable
CREATE TABLE IF NOT EXISTS "Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);
-- CreateTable (guarded: drift object present in databases that were reconciled)
-- CreateTable
CREATE TABLE IF NOT EXISTS "BlockTag" (
    "id" TEXT NOT NULL,
    "blockId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    CONSTRAINT "BlockTag_pkey" PRIMARY KEY ("id")
);
-- CreateTable (guarded: drift object present in databases that were reconciled)
-- CreateTable
CREATE TABLE IF NOT EXISTS "UserProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "blocksCompleted" INTEGER NOT NULL DEFAULT 0,
    "totalBlocks" INTEGER NOT NULL DEFAULT 0,
    "lastBlockId" TEXT,
    "lastAccessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserProgress_pkey" PRIMARY KEY ("id")
);
-- CreateTable (guarded: drift object present in databases that were reconciled)
-- CreateTable
CREATE TABLE IF NOT EXISTS "Bookmark" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "blockId" TEXT,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Bookmark_pkey" PRIMARY KEY ("id")
);
-- CreateTable (guarded: drift object present in databases that were reconciled)
-- CreateTable
CREATE TABLE IF NOT EXISTS "StudyStreak" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "streak" INTEGER NOT NULL DEFAULT 1,
    "lastDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "longestStreak" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StudyStreak_pkey" PRIMARY KEY ("id")
);
-- CreateTable (guarded: drift object present in databases that were reconciled)
-- CreateTable
CREATE TABLE IF NOT EXISTS "LearningAnalytics" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "chapterId" TEXT,
    "blockId" TEXT,
    "timeSpent" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LearningAnalytics_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE INDEX "PasswordHash_userId_idx" ON "PasswordHash"("userId");
-- CreateIndex
CREATE INDEX "PasswordHash_expiresAt_idx" ON "PasswordHash"("expiresAt");
-- CreateIndex
CREATE UNIQUE INDEX "DecisionMaker_contentBlockId_key" ON "DecisionMaker"("contentBlockId");
-- CreateIndex
CREATE INDEX "DecisionMaker_userId_idx" ON "DecisionMaker"("userId");
-- CreateIndex
CREATE UNIQUE INDEX "R2Upload_key_key" ON "R2Upload"("key");
-- CreateIndex
CREATE INDEX "R2Upload_uploadedById_idx" ON "R2Upload"("uploadedById");
-- CreateIndex
CREATE INDEX "R2Upload_createdAt_idx" ON "R2Upload"("createdAt");
-- CreateIndex
CREATE INDEX "R2Upload_status_idx" ON "R2Upload"("status");
-- CreateIndex
CREATE INDEX "R2Upload_fileHash_idx" ON "R2Upload"("fileHash");
-- CreateIndex
CREATE INDEX "Topic_chapterId_idx" ON "Topic"("chapterId");
-- CreateIndex
CREATE UNIQUE INDEX "Topic_chapterId_slug_key" ON "Topic"("chapterId", "slug");
-- CreateIndex
CREATE INDEX "ContentVersion_blockId_idx" ON "ContentVersion"("blockId");
-- CreateIndex
CREATE INDEX "ContentVersion_changedById_idx" ON "ContentVersion"("changedById");
-- CreateIndex
CREATE UNIQUE INDEX "ContentVersion_blockId_version_key" ON "ContentVersion"("blockId", "version");
-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");
-- CreateIndex
CREATE UNIQUE INDEX "Tag_slug_key" ON "Tag"("slug");
-- CreateIndex
CREATE INDEX "BlockTag_blockId_idx" ON "BlockTag"("blockId");
-- CreateIndex
CREATE INDEX "BlockTag_tagId_idx" ON "BlockTag"("tagId");
-- CreateIndex
CREATE UNIQUE INDEX "BlockTag_blockId_tagId_key" ON "BlockTag"("blockId", "tagId");
-- CreateIndex
CREATE INDEX "UserProgress_userId_idx" ON "UserProgress"("userId");
-- CreateIndex
CREATE INDEX "UserProgress_chapterId_idx" ON "UserProgress"("chapterId");
-- CreateIndex
CREATE UNIQUE INDEX "UserProgress_userId_chapterId_key" ON "UserProgress"("userId", "chapterId");
-- CreateIndex
CREATE INDEX "Bookmark_userId_idx" ON "Bookmark"("userId");
-- CreateIndex
CREATE INDEX "Bookmark_chapterId_idx" ON "Bookmark"("chapterId");
-- CreateIndex
CREATE UNIQUE INDEX "Bookmark_userId_chapterId_blockId_key" ON "Bookmark"("userId", "chapterId", "blockId");
-- CreateIndex
CREATE UNIQUE INDEX "StudyStreak_userId_key" ON "StudyStreak"("userId");
-- CreateIndex
CREATE INDEX "LearningAnalytics_userId_idx" ON "LearningAnalytics"("userId");
-- CreateIndex
CREATE INDEX "LearningAnalytics_eventType_idx" ON "LearningAnalytics"("eventType");
-- CreateIndex
CREATE INDEX "LearningAnalytics_createdAt_idx" ON "LearningAnalytics"("createdAt");
-- AddForeignKey (guarded)
DO $$
BEGIN
  -- AddForeignKey
ALTER TABLE "PasswordHash" ADD CONSTRAINT "PasswordHash_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;
-- AddForeignKey (guarded)
DO $$
BEGIN
  -- AddForeignKey
ALTER TABLE "DecisionMaker" ADD CONSTRAINT "DecisionMaker_contentBlockId_fkey" FOREIGN KEY ("contentBlockId") REFERENCES "ContentBlock"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;
-- AddForeignKey (guarded)
DO $$
BEGIN
  -- AddForeignKey
ALTER TABLE "DecisionMaker" ADD CONSTRAINT "DecisionMaker_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;
-- AddForeignKey (guarded)
DO $$
BEGIN
  -- AddForeignKey
ALTER TABLE "R2Upload" ADD CONSTRAINT "R2Upload_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;
-- AddForeignKey (guarded)
DO $$
BEGIN
  -- AddForeignKey
ALTER TABLE "Topic" ADD CONSTRAINT "Topic_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;
-- AddForeignKey (guarded)
DO $$
BEGIN
  -- AddForeignKey
ALTER TABLE "ContentVersion" ADD CONSTRAINT "ContentVersion_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "ContentBlock"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;
-- AddForeignKey (guarded)
DO $$
BEGIN
  -- AddForeignKey
ALTER TABLE "ContentVersion" ADD CONSTRAINT "ContentVersion_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;
-- AddForeignKey (guarded)
DO $$
BEGIN
  -- AddForeignKey
ALTER TABLE "BlockTag" ADD CONSTRAINT "BlockTag_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "ContentBlock"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;
-- AddForeignKey (guarded)
DO $$
BEGIN
  -- AddForeignKey
ALTER TABLE "BlockTag" ADD CONSTRAINT "BlockTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;
-- AddForeignKey (guarded)
DO $$
BEGIN
  -- AddForeignKey
ALTER TABLE "UserProgress" ADD CONSTRAINT "UserProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;
-- AddForeignKey (guarded)
DO $$
BEGIN
  -- AddForeignKey
ALTER TABLE "UserProgress" ADD CONSTRAINT "UserProgress_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;
-- AddForeignKey (guarded)
DO $$
BEGIN
  -- AddForeignKey
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;
-- AddForeignKey (guarded)
DO $$
BEGIN
  -- AddForeignKey
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;
-- AddForeignKey (guarded)
DO $$
BEGIN
  -- AddForeignKey
ALTER TABLE "StudyStreak" ADD CONSTRAINT "StudyStreak_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;
-- AddForeignKey (guarded)
DO $$
BEGIN
  -- AddForeignKey
ALTER TABLE "LearningAnalytics" ADD CONSTRAINT "LearningAnalytics_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;

-- ───────────────────────────────────────────────────────────────────────
-- Study features: quizzes, flashcards, planner, gamification, security.
-- ───────────────────────────────────────────────────────────────────────

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('mcq', 'true_false', 'fill_blank', 'short_answer');

-- CreateEnum
CREATE TYPE "AttemptStatus" AS ENUM ('in_progress', 'completed', 'abandoned');

-- CreateEnum
CREATE TYPE "GoalPeriod" AS ENUM ('daily', 'weekly', 'monthly');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avatarUrl" TEXT,
ADD COLUMN     "bio" TEXT,
ADD COLUMN     "emailVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastActiveAt" TIMESTAMP(3),
ADD COLUMN     "totalXp" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "RefreshToken" ADD COLUMN     "ip" TEXT,
ADD COLUMN     "lastUsedAt" TIMESTAMP(3),
ADD COLUMN     "userAgent" TEXT;

-- CreateTable
CREATE TABLE "EmailVerificationToken" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "device" TEXT,
    "location" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LoginHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "link" TEXT,
    "icon" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "keys" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "XpEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "sourceId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "XpEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Badge" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "criteria" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Badge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserBadge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserBadge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyStudy" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "minutesStudied" INTEGER NOT NULL DEFAULT 0,
    "quizzesTaken" INTEGER NOT NULL DEFAULT 0,
    "cardsReviewed" INTEGER NOT NULL DEFAULT 0,
    "blocksCompleted" INTEGER NOT NULL DEFAULT 0,
    "goalsCompleted" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DailyStudy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quiz" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "subjectId" TEXT,
    "chapterId" TEXT,
    "topicId" TEXT,
    "status" "ContentStatus" NOT NULL DEFAULT 'draft',
    "timeLimitSeconds" INTEGER,
    "shuffle" BOOLEAN NOT NULL DEFAULT true,
    "isTimed" BOOLEAN NOT NULL DEFAULT false,
    "questionCount" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Quiz_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizQuestion" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "questionType" "QuestionType" NOT NULL,
    "question" TEXT NOT NULL,
    "options" JSONB,
    "correctAnswer" TEXT NOT NULL,
    "explanation" TEXT,
    "points" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "QuizQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizAttempt" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "AttemptStatus" NOT NULL DEFAULT 'in_progress',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "score" INTEGER NOT NULL DEFAULT 0,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "correctCount" INTEGER NOT NULL DEFAULT 0,
    "totalQuestions" INTEGER NOT NULL DEFAULT 0,
    "timeSpentSeconds" INTEGER NOT NULL DEFAULT 0,
    "answers" JSONB,
    "xpEarned" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QuizAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlashcardDeck" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "subjectId" TEXT,
    "chapterId" TEXT,
    "topicId" TEXT,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FlashcardDeck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Flashcard" (
    "id" TEXT NOT NULL,
    "deckId" TEXT NOT NULL,
    "front" TEXT NOT NULL,
    "back" TEXT NOT NULL,
    "hint" TEXT,
    "difficulty" "Difficulty" NOT NULL DEFAULT 'easy',
    "isBookmarked" BOOLEAN NOT NULL DEFAULT false,
    "ease" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "interval" INTEGER NOT NULL DEFAULT 0,
    "repetitions" INTEGER NOT NULL DEFAULT 0,
    "dueAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastReviewedAt" TIMESTAMP(3),
    "timesReviewed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Flashcard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudyGoal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "period" "GoalPeriod" NOT NULL DEFAULT 'daily',
    "targetUnits" INTEGER NOT NULL DEFAULT 1,
    "unitType" TEXT NOT NULL DEFAULT 'minutes',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "date" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StudyGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Exam" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subjectId" TEXT,
    "examDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Exam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudyPlanItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "time" TEXT,
    "durationMinutes" INTEGER NOT NULL DEFAULT 30,
    "chapterId" TEXT,
    "topicId" TEXT,
    "reminderEnabled" BOOLEAN NOT NULL DEFAULT false,
    "reminderTime" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StudyPlanItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailVerificationToken_tokenHash_key" ON "EmailVerificationToken"("tokenHash");

-- CreateIndex
CREATE INDEX "EmailVerificationToken_userId_idx" ON "EmailVerificationToken"("userId");

-- CreateIndex
CREATE INDEX "EmailVerificationToken_expiresAt_idx" ON "EmailVerificationToken"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE INDEX "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt");

-- CreateIndex
CREATE INDEX "LoginHistory_userId_createdAt_idx" ON "LoginHistory"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "LoginHistory_createdAt_idx" ON "LoginHistory"("createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");

-- CreateIndex
CREATE INDEX "XpEntry_userId_createdAt_idx" ON "XpEntry"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "XpEntry_source_idx" ON "XpEntry"("source");

-- CreateIndex
CREATE UNIQUE INDEX "Badge_code_key" ON "Badge"("code");

-- CreateIndex
CREATE INDEX "Badge_code_idx" ON "Badge"("code");

-- CreateIndex
CREATE INDEX "UserBadge_userId_idx" ON "UserBadge"("userId");

-- CreateIndex
CREATE INDEX "UserBadge_badgeId_idx" ON "UserBadge"("badgeId");

-- CreateIndex
CREATE UNIQUE INDEX "UserBadge_userId_badgeId_key" ON "UserBadge"("userId", "badgeId");

-- CreateIndex
CREATE INDEX "DailyStudy_userId_date_idx" ON "DailyStudy"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyStudy_userId_date_key" ON "DailyStudy"("userId", "date");

-- CreateIndex
CREATE INDEX "Quiz_subjectId_idx" ON "Quiz"("subjectId");

-- CreateIndex
CREATE INDEX "Quiz_chapterId_idx" ON "Quiz"("chapterId");

-- CreateIndex
CREATE INDEX "Quiz_topicId_idx" ON "Quiz"("topicId");

-- CreateIndex
CREATE INDEX "Quiz_status_idx" ON "Quiz"("status");

-- CreateIndex
CREATE INDEX "QuizQuestion_quizId_sortOrder_idx" ON "QuizQuestion"("quizId", "sortOrder");

-- CreateIndex
CREATE INDEX "QuizAttempt_quizId_idx" ON "QuizAttempt"("quizId");

-- CreateIndex
CREATE INDEX "QuizAttempt_userId_createdAt_idx" ON "QuizAttempt"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "FlashcardDeck_userId_idx" ON "FlashcardDeck"("userId");

-- CreateIndex
CREATE INDEX "FlashcardDeck_subjectId_idx" ON "FlashcardDeck"("subjectId");

-- CreateIndex
CREATE INDEX "FlashcardDeck_chapterId_idx" ON "FlashcardDeck"("chapterId");

-- CreateIndex
CREATE INDEX "FlashcardDeck_topicId_idx" ON "FlashcardDeck"("topicId");

-- CreateIndex
CREATE INDEX "Flashcard_deckId_idx" ON "Flashcard"("deckId");

-- CreateIndex
CREATE INDEX "Flashcard_dueAt_idx" ON "Flashcard"("dueAt");

-- CreateIndex
CREATE INDEX "StudyGoal_userId_period_idx" ON "StudyGoal"("userId", "period");

-- CreateIndex
CREATE INDEX "StudyGoal_userId_date_idx" ON "StudyGoal"("userId", "date");

-- CreateIndex
CREATE INDEX "Exam_userId_idx" ON "Exam"("userId");

-- CreateIndex
CREATE INDEX "Exam_examDate_idx" ON "Exam"("examDate");

-- CreateIndex
CREATE INDEX "StudyPlanItem_userId_date_idx" ON "StudyPlanItem"("userId", "date");

-- CreateIndex
CREATE INDEX "StudyPlanItem_chapterId_idx" ON "StudyPlanItem"("chapterId");

-- CreateIndex
CREATE INDEX "StudyPlanItem_topicId_idx" ON "StudyPlanItem"("topicId");

-- CreateIndex
CREATE INDEX "User_totalXp_idx" ON "User"("totalXp");

-- AddForeignKey
ALTER TABLE "EmailVerificationToken" ADD CONSTRAINT "EmailVerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoginHistory" ADD CONSTRAINT "LoginHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "XpEntry" ADD CONSTRAINT "XpEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBadge" ADD CONSTRAINT "UserBadge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBadge" ADD CONSTRAINT "UserBadge_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "Badge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyStudy" ADD CONSTRAINT "DailyStudy_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizQuestion" ADD CONSTRAINT "QuizQuestion_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlashcardDeck" ADD CONSTRAINT "FlashcardDeck_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlashcardDeck" ADD CONSTRAINT "FlashcardDeck_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlashcardDeck" ADD CONSTRAINT "FlashcardDeck_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlashcardDeck" ADD CONSTRAINT "FlashcardDeck_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Flashcard" ADD CONSTRAINT "Flashcard_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "FlashcardDeck"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyGoal" ADD CONSTRAINT "StudyGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyPlanItem" ADD CONSTRAINT "StudyPlanItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- ───────────────────────────────────────────────────────────────────────
-- Reconciliation (part 2): stale columns/indexes left by migrations that
-- predate the schema refactor. All statements are guarded no-ops on
-- databases already in the refactored shape.
-- ───────────────────────────────────────────────────────────────────────

ALTER TABLE IF EXISTS "AuditLog" DROP COLUMN IF EXISTS "actorEmail";
ALTER TABLE IF EXISTS "Chapter" ADD COLUMN IF NOT EXISTS "prerequisites" TEXT, ADD COLUMN IF NOT EXISTS "readingTime" INTEGER, ADD COLUMN IF NOT EXISTS "status" "ContentStatus" NOT NULL DEFAULT 'draft';;
ALTER TABLE IF EXISTS "ContentBlock" ADD COLUMN IF NOT EXISTS "difficulty" "Difficulty" NOT NULL DEFAULT 'easy';
ALTER TABLE IF EXISTS "RefreshToken" ADD COLUMN IF NOT EXISTS "ip" TEXT, ADD COLUMN IF NOT EXISTS "lastUsedAt" TIMESTAMP(3), ADD COLUMN IF NOT EXISTS "userAgent" TEXT;;
ALTER TABLE IF EXISTS "Subject" ADD COLUMN IF NOT EXISTS "description" TEXT, ADD COLUMN IF NOT EXISTS "difficulty" "Difficulty" NOT NULL DEFAULT 'easy', ADD COLUMN IF NOT EXISTS "status" "ContentStatus" NOT NULL DEFAULT 'draft';;
ALTER TABLE IF EXISTS "User" DROP COLUMN IF EXISTS "passwordHash", ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT, ADD COLUMN IF NOT EXISTS "bio" TEXT, ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN NOT NULL DEFAULT false, ADD COLUMN IF NOT EXISTS "lastActiveAt" TIMESTAMP(3), ADD COLUMN IF NOT EXISTS "totalXp" INTEGER NOT NULL DEFAULT 0;;
DO $$
BEGIN
  ALTER TABLE IF EXISTS "PasswordHash" ADD CONSTRAINT "PasswordHash_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;
DO $$
BEGIN
  ALTER TABLE IF EXISTS "EmailVerificationToken" ADD CONSTRAINT "EmailVerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;
DO $$
BEGIN
  ALTER TABLE IF EXISTS "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;
DO $$
BEGIN
  ALTER TABLE IF EXISTS "LoginHistory" ADD CONSTRAINT "LoginHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;
DO $$
BEGIN
  ALTER TABLE IF EXISTS "DecisionMaker" ADD CONSTRAINT "DecisionMaker_contentBlockId_fkey" FOREIGN KEY ("contentBlockId") REFERENCES "ContentBlock"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;
DO $$
BEGIN
  ALTER TABLE IF EXISTS "DecisionMaker" ADD CONSTRAINT "DecisionMaker_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;
DO $$
BEGIN
  ALTER TABLE IF EXISTS "R2Upload" ADD CONSTRAINT "R2Upload_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;
DO $$
BEGIN
  ALTER TABLE IF EXISTS "Topic" ADD CONSTRAINT "Topic_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;
DO $$
BEGIN
  ALTER TABLE IF EXISTS "ContentVersion" ADD CONSTRAINT "ContentVersion_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "ContentBlock"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;
DO $$
BEGIN
  ALTER TABLE IF EXISTS "ContentVersion" ADD CONSTRAINT "ContentVersion_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;
DO $$
BEGIN
  ALTER TABLE IF EXISTS "BlockTag" ADD CONSTRAINT "BlockTag_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "ContentBlock"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;
DO $$
BEGIN
  ALTER TABLE IF EXISTS "BlockTag" ADD CONSTRAINT "BlockTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;
DO $$
BEGIN
  ALTER TABLE IF EXISTS "UserProgress" ADD CONSTRAINT "UserProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;
DO $$
BEGIN
  ALTER TABLE IF EXISTS "UserProgress" ADD CONSTRAINT "UserProgress_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;
DO $$
BEGIN
  ALTER TABLE IF EXISTS "Bookmark" ADD CONSTRAINT "Bookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;
DO $$
BEGIN
  ALTER TABLE IF EXISTS "Bookmark" ADD CONSTRAINT "Bookmark_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;
DO $$
BEGIN
  ALTER TABLE IF EXISTS "StudyStreak" ADD CONSTRAINT "StudyStreak_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;
DO $$
BEGIN
  ALTER TABLE IF EXISTS "LearningAnalytics" ADD CONSTRAINT "LearningAnalytics_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;
DO $$
BEGIN
  ALTER TABLE IF EXISTS "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;
DO $$
BEGIN
  ALTER TABLE IF EXISTS "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;
DO $$
BEGIN
  ALTER TABLE IF EXISTS "XpEntry" ADD CONSTRAINT "XpEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;
DO $$
BEGIN
  ALTER TABLE IF EXISTS "UserBadge" ADD CONSTRAINT "UserBadge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;
DO $$
BEGIN
  ALTER TABLE IF EXISTS "UserBadge" ADD CONSTRAINT "UserBadge_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "Badge"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;
DO $$
BEGIN
  ALTER TABLE IF EXISTS "DailyStudy" ADD CONSTRAINT "DailyStudy_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;
DO $$
BEGIN
  ALTER TABLE IF EXISTS "Quiz" ADD CONSTRAINT "Quiz_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;
DO $$
BEGIN
  ALTER TABLE IF EXISTS "Quiz" ADD CONSTRAINT "Quiz_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;
DO $$
BEGIN
  ALTER TABLE IF EXISTS "Quiz" ADD CONSTRAINT "Quiz_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;
DO $$
BEGIN
  ALTER TABLE IF EXISTS "Quiz" ADD CONSTRAINT "Quiz_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;
DO $$
BEGIN
  ALTER TABLE IF EXISTS "QuizQuestion" ADD CONSTRAINT "QuizQuestion_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;
DO $$
BEGIN
  ALTER TABLE IF EXISTS "QuizAttempt" ADD CONSTRAINT "QuizAttempt_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;
DO $$
BEGIN
  ALTER TABLE IF EXISTS "QuizAttempt" ADD CONSTRAINT "QuizAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;
DO $$
BEGIN
  ALTER TABLE IF EXISTS "FlashcardDeck" ADD CONSTRAINT "FlashcardDeck_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;
DO $$
BEGIN
  ALTER TABLE IF EXISTS "FlashcardDeck" ADD CONSTRAINT "FlashcardDeck_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;
DO $$
BEGIN
  ALTER TABLE IF EXISTS "FlashcardDeck" ADD CONSTRAINT "FlashcardDeck_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;
DO $$
BEGIN
  ALTER TABLE IF EXISTS "FlashcardDeck" ADD CONSTRAINT "FlashcardDeck_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;
DO $$
BEGIN
  ALTER TABLE IF EXISTS "Flashcard" ADD CONSTRAINT "Flashcard_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "FlashcardDeck"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;
DO $$
BEGIN
  ALTER TABLE IF EXISTS "StudyGoal" ADD CONSTRAINT "StudyGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;
DO $$
BEGIN
  ALTER TABLE IF EXISTS "Exam" ADD CONSTRAINT "Exam_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;
DO $$
BEGIN
  ALTER TABLE IF EXISTS "Exam" ADD CONSTRAINT "Exam_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;
DO $$
BEGIN
  ALTER TABLE IF EXISTS "StudyPlanItem" ADD CONSTRAINT "StudyPlanItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;
DROP INDEX IF EXISTS "AuditLog_createdAt_idx";
DROP INDEX IF EXISTS "idx_content_search_english";
DROP INDEX IF EXISTS "idx_content_search_simple";
CREATE INDEX IF NOT EXISTS "PasswordHash_userId_idx" ON "PasswordHash"("userId");
CREATE INDEX IF NOT EXISTS "PasswordHash_expiresAt_idx" ON "PasswordHash"("expiresAt");
CREATE UNIQUE INDEX IF NOT EXISTS "EmailVerificationToken_tokenHash_key" ON "EmailVerificationToken"("tokenHash");
CREATE INDEX IF NOT EXISTS "EmailVerificationToken_userId_idx" ON "EmailVerificationToken"("userId");
CREATE INDEX IF NOT EXISTS "EmailVerificationToken_expiresAt_idx" ON "EmailVerificationToken"("expiresAt");
CREATE UNIQUE INDEX IF NOT EXISTS "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");
CREATE INDEX IF NOT EXISTS "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");
CREATE INDEX IF NOT EXISTS "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt");
CREATE INDEX IF NOT EXISTS "LoginHistory_userId_createdAt_idx" ON "LoginHistory"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "LoginHistory_createdAt_idx" ON "LoginHistory"("createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "DecisionMaker_contentBlockId_key" ON "DecisionMaker"("contentBlockId");
CREATE INDEX IF NOT EXISTS "DecisionMaker_userId_idx" ON "DecisionMaker"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "R2Upload_key_key" ON "R2Upload"("key");
CREATE INDEX IF NOT EXISTS "R2Upload_uploadedById_idx" ON "R2Upload"("uploadedById");
CREATE INDEX IF NOT EXISTS "R2Upload_createdAt_idx" ON "R2Upload"("createdAt");
CREATE INDEX IF NOT EXISTS "R2Upload_status_idx" ON "R2Upload"("status");
CREATE INDEX IF NOT EXISTS "R2Upload_fileHash_idx" ON "R2Upload"("fileHash");
CREATE INDEX IF NOT EXISTS "Topic_chapterId_idx" ON "Topic"("chapterId");
CREATE UNIQUE INDEX IF NOT EXISTS "Topic_chapterId_slug_key" ON "Topic"("chapterId", "slug");
CREATE INDEX IF NOT EXISTS "ContentVersion_blockId_idx" ON "ContentVersion"("blockId");
CREATE INDEX IF NOT EXISTS "ContentVersion_changedById_idx" ON "ContentVersion"("changedById");
CREATE UNIQUE INDEX IF NOT EXISTS "ContentVersion_blockId_version_key" ON "ContentVersion"("blockId", "version");
CREATE UNIQUE INDEX IF NOT EXISTS "Tag_name_key" ON "Tag"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "Tag_slug_key" ON "Tag"("slug");
CREATE INDEX IF NOT EXISTS "BlockTag_blockId_idx" ON "BlockTag"("blockId");
CREATE INDEX IF NOT EXISTS "BlockTag_tagId_idx" ON "BlockTag"("tagId");
CREATE UNIQUE INDEX IF NOT EXISTS "BlockTag_blockId_tagId_key" ON "BlockTag"("blockId", "tagId");
CREATE INDEX IF NOT EXISTS "UserProgress_userId_idx" ON "UserProgress"("userId");
CREATE INDEX IF NOT EXISTS "UserProgress_chapterId_idx" ON "UserProgress"("chapterId");
CREATE UNIQUE INDEX IF NOT EXISTS "UserProgress_userId_chapterId_key" ON "UserProgress"("userId", "chapterId");
CREATE INDEX IF NOT EXISTS "Bookmark_userId_idx" ON "Bookmark"("userId");
CREATE INDEX IF NOT EXISTS "Bookmark_chapterId_idx" ON "Bookmark"("chapterId");
CREATE UNIQUE INDEX IF NOT EXISTS "Bookmark_userId_chapterId_blockId_key" ON "Bookmark"("userId", "chapterId", "blockId");
CREATE UNIQUE INDEX IF NOT EXISTS "StudyStreak_userId_key" ON "StudyStreak"("userId");
CREATE INDEX IF NOT EXISTS "LearningAnalytics_userId_idx" ON "LearningAnalytics"("userId");
CREATE INDEX IF NOT EXISTS "LearningAnalytics_eventType_idx" ON "LearningAnalytics"("eventType");
CREATE INDEX IF NOT EXISTS "LearningAnalytics_createdAt_idx" ON "LearningAnalytics"("createdAt");
CREATE INDEX IF NOT EXISTS "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");
CREATE INDEX IF NOT EXISTS "Notification_createdAt_idx" ON "Notification"("createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");
CREATE INDEX IF NOT EXISTS "PushSubscription_userId_idx" ON "PushSubscription"("userId");
CREATE INDEX IF NOT EXISTS "XpEntry_userId_createdAt_idx" ON "XpEntry"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "XpEntry_source_idx" ON "XpEntry"("source");
CREATE UNIQUE INDEX IF NOT EXISTS "Badge_code_key" ON "Badge"("code");
CREATE INDEX IF NOT EXISTS "Badge_code_idx" ON "Badge"("code");
CREATE INDEX IF NOT EXISTS "UserBadge_userId_idx" ON "UserBadge"("userId");
CREATE INDEX IF NOT EXISTS "UserBadge_badgeId_idx" ON "UserBadge"("badgeId");
CREATE UNIQUE INDEX IF NOT EXISTS "UserBadge_userId_badgeId_key" ON "UserBadge"("userId", "badgeId");
CREATE INDEX IF NOT EXISTS "DailyStudy_userId_date_idx" ON "DailyStudy"("userId", "date");
CREATE UNIQUE INDEX IF NOT EXISTS "DailyStudy_userId_date_key" ON "DailyStudy"("userId", "date");
CREATE INDEX IF NOT EXISTS "Quiz_subjectId_idx" ON "Quiz"("subjectId");
CREATE INDEX IF NOT EXISTS "Quiz_chapterId_idx" ON "Quiz"("chapterId");
CREATE INDEX IF NOT EXISTS "Quiz_topicId_idx" ON "Quiz"("topicId");
CREATE INDEX IF NOT EXISTS "Quiz_status_idx" ON "Quiz"("status");
CREATE INDEX IF NOT EXISTS "QuizQuestion_quizId_sortOrder_idx" ON "QuizQuestion"("quizId", "sortOrder");
CREATE INDEX IF NOT EXISTS "QuizAttempt_quizId_idx" ON "QuizAttempt"("quizId");
CREATE INDEX IF NOT EXISTS "QuizAttempt_userId_createdAt_idx" ON "QuizAttempt"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "FlashcardDeck_userId_idx" ON "FlashcardDeck"("userId");
CREATE INDEX IF NOT EXISTS "FlashcardDeck_subjectId_idx" ON "FlashcardDeck"("subjectId");
CREATE INDEX IF NOT EXISTS "FlashcardDeck_chapterId_idx" ON "FlashcardDeck"("chapterId");
CREATE INDEX IF NOT EXISTS "FlashcardDeck_topicId_idx" ON "FlashcardDeck"("topicId");
CREATE INDEX IF NOT EXISTS "Flashcard_deckId_idx" ON "Flashcard"("deckId");
CREATE INDEX IF NOT EXISTS "Flashcard_dueAt_idx" ON "Flashcard"("dueAt");
CREATE INDEX IF NOT EXISTS "StudyGoal_userId_period_idx" ON "StudyGoal"("userId", "period");
CREATE INDEX IF NOT EXISTS "StudyGoal_userId_date_idx" ON "StudyGoal"("userId", "date");
CREATE INDEX IF NOT EXISTS "Exam_userId_idx" ON "Exam"("userId");
CREATE INDEX IF NOT EXISTS "Exam_examDate_idx" ON "Exam"("examDate");
CREATE INDEX IF NOT EXISTS "StudyPlanItem_userId_date_idx" ON "StudyPlanItem"("userId", "date");
CREATE INDEX IF NOT EXISTS "StudyPlanItem_chapterId_idx" ON "StudyPlanItem"("chapterId");
CREATE INDEX IF NOT EXISTS "StudyPlanItem_topicId_idx" ON "StudyPlanItem"("topicId");
CREATE INDEX IF NOT EXISTS "AccessRequest_userId_status_idx" ON "AccessRequest"("userId", "status");
CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_targetId_idx" ON "AuditLog"("createdAt", "targetId");
CREATE INDEX IF NOT EXISTS "AuditLog_actorId_idx" ON "AuditLog"("actorId");
CREATE INDEX IF NOT EXISTS "AuditLog_action_idx" ON "AuditLog"("action");
CREATE INDEX IF NOT EXISTS "Class_slug_idx" ON "Class"("slug");
CREATE INDEX IF NOT EXISTS "ContentBlock_sortOrder_idx" ON "ContentBlock"("sortOrder");
CREATE INDEX IF NOT EXISTS "ContentBlock_accessLevel_idx" ON "ContentBlock"("accessLevel");
CREATE INDEX IF NOT EXISTS "ContentBlock_blockType_idx" ON "ContentBlock"("blockType");
CREATE INDEX IF NOT EXISTS "ContentBlock_difficulty_idx" ON "ContentBlock"("difficulty");
CREATE INDEX IF NOT EXISTS "ContentBlock_search_vector_english_idx" ON "ContentBlock"("search_vector_english");
CREATE INDEX IF NOT EXISTS "ContentBlock_search_vector_simple_idx" ON "ContentBlock"("search_vector_simple");
CREATE INDEX IF NOT EXISTS "Subject_subjectType_idx" ON "Subject"("subjectType");
CREATE INDEX IF NOT EXISTS "Subject_status_idx" ON "Subject"("status");
CREATE INDEX IF NOT EXISTS "User_role_idx" ON "User"("role");
CREATE INDEX IF NOT EXISTS "User_accessLevel_idx" ON "User"("accessLevel");
CREATE INDEX IF NOT EXISTS "User_totalXp_idx" ON "User"("totalXp");
