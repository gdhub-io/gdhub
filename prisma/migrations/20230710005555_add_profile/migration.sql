/*
  Warnings:

  - Added the required column `updatedAt` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('Guest', 'Member', 'Author', 'Mentor', 'Admin');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "profileId" TEXT,
ADD COLUMN     "roles" "UserRole"[] DEFAULT ARRAY['Member']::"UserRole"[],
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tgNickname" TEXT,
    "country" TEXT,
    "city" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "timeForWork" INTEGER[],

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameGenre" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "GameGenre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameSetting" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "GameSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameDifficultyLevel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "GameDifficultyLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_GameGenreToProfile" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_GameSettingToProfile" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_GameDifficultyLevelToProfile" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_tgNickname_key" ON "Profile"("tgNickname");

-- CreateIndex
CREATE UNIQUE INDEX "GameGenre_name_key" ON "GameGenre"("name");

-- CreateIndex
CREATE UNIQUE INDEX "GameSetting_name_key" ON "GameSetting"("name");

-- CreateIndex
CREATE UNIQUE INDEX "GameDifficultyLevel_name_key" ON "GameDifficultyLevel"("name");

-- CreateIndex
CREATE UNIQUE INDEX "_GameGenreToProfile_AB_unique" ON "_GameGenreToProfile"("A", "B");

-- CreateIndex
CREATE INDEX "_GameGenreToProfile_B_index" ON "_GameGenreToProfile"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_GameSettingToProfile_AB_unique" ON "_GameSettingToProfile"("A", "B");

-- CreateIndex
CREATE INDEX "_GameSettingToProfile_B_index" ON "_GameSettingToProfile"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_GameDifficultyLevelToProfile_AB_unique" ON "_GameDifficultyLevelToProfile"("A", "B");

-- CreateIndex
CREATE INDEX "_GameDifficultyLevelToProfile_B_index" ON "_GameDifficultyLevelToProfile"("B");

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_GameGenreToProfile" ADD CONSTRAINT "_GameGenreToProfile_A_fkey" FOREIGN KEY ("A") REFERENCES "GameGenre"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_GameGenreToProfile" ADD CONSTRAINT "_GameGenreToProfile_B_fkey" FOREIGN KEY ("B") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_GameSettingToProfile" ADD CONSTRAINT "_GameSettingToProfile_A_fkey" FOREIGN KEY ("A") REFERENCES "GameSetting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_GameSettingToProfile" ADD CONSTRAINT "_GameSettingToProfile_B_fkey" FOREIGN KEY ("B") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_GameDifficultyLevelToProfile" ADD CONSTRAINT "_GameDifficultyLevelToProfile_A_fkey" FOREIGN KEY ("A") REFERENCES "GameDifficultyLevel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_GameDifficultyLevelToProfile" ADD CONSTRAINT "_GameDifficultyLevelToProfile_B_fkey" FOREIGN KEY ("B") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
