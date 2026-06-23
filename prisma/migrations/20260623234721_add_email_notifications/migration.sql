-- CreateTable
CREATE TABLE "Dislike" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Dislike_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Dislike_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL DEFAULT '',
    "name" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "gender" TEXT NOT NULL,
    "bio" TEXT NOT NULL DEFAULT '',
    "interests" TEXT NOT NULL DEFAULT '',
    "avatar" TEXT NOT NULL DEFAULT '',
    "photos" JSONB NOT NULL DEFAULT [],
    "city" TEXT NOT NULL DEFAULT '',
    "lookingFor" TEXT NOT NULL DEFAULT 'all',
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerificationToken" TEXT,
    "emailVerificationExpiry" DATETIME,
    "lastEmailVerificationSentAt" DATETIME,
    "passwordResetToken" TEXT,
    "passwordResetExpiry" DATETIME,
    "totpSecret" TEXT,
    "totpEnabled" BOOLEAN NOT NULL DEFAULT false,
    "totpBackupCodes" TEXT NOT NULL DEFAULT '[]',
    "loginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" DATETIME,
    "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "profileVisible" BOOLEAN NOT NULL DEFAULT true,
    "role" TEXT NOT NULL DEFAULT 'user',
    "showOnlineStatus" BOOLEAN NOT NULL DEFAULT true,
    "language" TEXT NOT NULL DEFAULT 'ru',
    "showDistance" BOOLEAN NOT NULL DEFAULT false,
    "soundEnabled" BOOLEAN NOT NULL DEFAULT true,
    "matchNotifications" BOOLEAN NOT NULL DEFAULT true,
    "likeNotifications" BOOLEAN NOT NULL DEFAULT true,
    "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "lastSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("age", "avatar", "bio", "city", "createdAt", "email", "emailNotifications", "emailVerificationExpiry", "emailVerificationToken", "emailVerified", "gender", "id", "interests", "language", "lastSeenAt", "likeNotifications", "lockedUntil", "loginAttempts", "lookingFor", "matchNotifications", "name", "notificationsEnabled", "passwordHash", "passwordResetExpiry", "passwordResetToken", "photos", "profileVisible", "role", "showDistance", "showOnlineStatus", "soundEnabled", "totpBackupCodes", "totpEnabled", "totpSecret", "updatedAt") SELECT "age", "avatar", "bio", "city", "createdAt", "email", "emailNotifications", "emailVerificationExpiry", "emailVerificationToken", "emailVerified", "gender", "id", "interests", "language", "lastSeenAt", "likeNotifications", "lockedUntil", "loginAttempts", "lookingFor", "matchNotifications", "name", "notificationsEnabled", "passwordHash", "passwordResetExpiry", "passwordResetToken", "photos", "profileVisible", "role", "showDistance", "showOnlineStatus", "soundEnabled", "totpBackupCodes", "totpEnabled", "totpSecret", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_emailVerificationToken_key" ON "User"("emailVerificationToken");
CREATE UNIQUE INDEX "User_passwordResetToken_key" ON "User"("passwordResetToken");
CREATE INDEX "User_role_idx" ON "User"("role");
CREATE INDEX "User_lastSeenAt_idx" ON "User"("lastSeenAt");
CREATE INDEX "User_emailVerified_idx" ON "User"("emailVerified");
CREATE INDEX "User_profileVisible_idx" ON "User"("profileVisible");
CREATE INDEX "User_gender_age_lookingFor_idx" ON "User"("gender", "age", "lookingFor");
CREATE INDEX "User_gender_idx" ON "User"("gender");
CREATE INDEX "User_age_idx" ON "User"("age");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Dislike_fromUserId_idx" ON "Dislike"("fromUserId");

-- CreateIndex
CREATE INDEX "Dislike_toUserId_idx" ON "Dislike"("toUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Dislike_fromUserId_toUserId_key" ON "Dislike"("fromUserId", "toUserId");

-- CreateIndex
CREATE INDEX "Message_matchId_read_idx" ON "Message"("matchId", "read");

-- CreateIndex
CREATE INDEX "Message_matchId_createdAt_idx" ON "Message"("matchId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Report_reporterId_reportedId_key" ON "Report"("reporterId", "reportedId");

