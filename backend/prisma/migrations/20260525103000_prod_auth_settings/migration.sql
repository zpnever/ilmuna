ALTER TABLE "User"
ADD COLUMN "googleId" TEXT,
ADD COLUMN "isPrivate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "notificationPreferences" JSONB NOT NULL DEFAULT '{"email":true,"push":true,"group":true}';

CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");
