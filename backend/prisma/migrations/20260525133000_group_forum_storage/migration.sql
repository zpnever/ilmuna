ALTER TABLE "GroupPost"
ADD COLUMN "blocks" JSONB,
ADD COLUMN "images" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN "shareCount" INTEGER NOT NULL DEFAULT 0;

UPDATE "GroupPost"
SET "blocks" = jsonb_build_array(
  jsonb_build_object(
    'type', 'markdown',
    'markdown', "content"
  )
);

ALTER TABLE "GroupPost"
ALTER COLUMN "blocks" SET NOT NULL;

ALTER TABLE "GroupPost"
DROP COLUMN "content";

ALTER TABLE "GroupMaterial"
ADD COLUMN "fileUrl" TEXT,
ADD COLUMN "fileName" TEXT,
ADD COLUMN "mimeType" TEXT;

CREATE TABLE "GroupPostComment" (
  "id" TEXT NOT NULL,
  "groupPostId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "parentId" TEXT,
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "GroupPostComment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GroupPostReaction" (
  "id" TEXT NOT NULL,
  "groupPostId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "ReactionType" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "GroupPostReaction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GroupPostReaction_groupPostId_userId_key"
ON "GroupPostReaction"("groupPostId", "userId");

ALTER TABLE "GroupPostComment"
ADD CONSTRAINT "GroupPostComment_groupPostId_fkey"
FOREIGN KEY ("groupPostId") REFERENCES "GroupPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GroupPostComment"
ADD CONSTRAINT "GroupPostComment_authorId_fkey"
FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GroupPostComment"
ADD CONSTRAINT "GroupPostComment_parentId_fkey"
FOREIGN KEY ("parentId") REFERENCES "GroupPostComment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "GroupPostReaction"
ADD CONSTRAINT "GroupPostReaction_groupPostId_fkey"
FOREIGN KEY ("groupPostId") REFERENCES "GroupPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GroupPostReaction"
ADD CONSTRAINT "GroupPostReaction_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
