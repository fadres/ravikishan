-- CreateTable
CREATE TABLE "CustomSubject" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomSubject_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomSubject_subjectId_idx" ON "CustomSubject"("subjectId");

-- AddForeignKey
ALTER TABLE "CustomSubject" ADD CONSTRAINT "CustomSubject_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;