/*
  Warnings:

  - You are about to drop the column `listenerId` on the `LectureListener` table. All the data in the column will be lost.
  - You are about to drop the column `form` on the `ProjectEstimation` table. All the data in the column will be lost.
  - You are about to drop the `ProjectTeam` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[slug]` on the table `Season` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userId` to the `LectureListener` table without a default value. This is not possible if the table is not empty.
  - Added the required column `data` to the `ProjectEstimation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `projectId` to the `TeamVacancy` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "LectureListener" DROP CONSTRAINT "LectureListener_listenerId_fkey";

-- DropForeignKey
ALTER TABLE "Project" DROP CONSTRAINT "Project_teamId_fkey";

-- DropForeignKey
ALTER TABLE "ProjectEstimation" DROP CONSTRAINT "ProjectEstimation_projectId_fkey";

-- DropForeignKey
ALTER TABLE "ProjectReport" DROP CONSTRAINT "ProjectReport_projectId_fkey";

-- DropForeignKey
ALTER TABLE "SeasonStreamReport" DROP CONSTRAINT "SeasonStreamReport_stageId_fkey";

-- DropForeignKey
ALTER TABLE "Speciality" DROP CONSTRAINT "Speciality_userId_fkey";

-- DropForeignKey
ALTER TABLE "TeamMember" DROP CONSTRAINT "TeamMember_teamId_fkey";

-- DropForeignKey
ALTER TABLE "TeamVacancy" DROP CONSTRAINT "TeamVacancy_teamId_fkey";

-- DropIndex
DROP INDEX "Profile_tgNickname_key";

-- DropIndex
DROP INDEX "Project_teamId_key";

-- DropIndex
DROP INDEX "ProjectEstimation_projectId_key";

-- DropIndex
DROP INDEX "ProjectReport_projectId_key";

-- AlterTable
ALTER TABLE "LectureListener" DROP COLUMN "listenerId",
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "ProjectEstimation" DROP COLUMN "form",
ADD COLUMN     "data" JSONB NOT NULL;

-- AlterTable
ALTER TABLE "Season" ADD COLUMN     "coverImage" TEXT;

-- AlterTable
ALTER TABLE "TeamVacancy" ADD COLUMN     "closedAt" TIMESTAMP(3),
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "projectId" TEXT NOT NULL;

-- DropTable
DROP TABLE "ProjectTeam";

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Team_name_key" ON "Team"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Team_slug_key" ON "Team"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Season_slug_key" ON "Season"("slug");

-- AddForeignKey
ALTER TABLE "Speciality" ADD CONSTRAINT "Speciality_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeasonStreamReport" ADD CONSTRAINT "SeasonStreamReport_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "SeasonStage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectEstimation" ADD CONSTRAINT "ProjectEstimation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectReport" ADD CONSTRAINT "ProjectReport_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamVacancy" ADD CONSTRAINT "TeamVacancy_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamVacancy" ADD CONSTRAINT "TeamVacancy_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LectureListener" ADD CONSTRAINT "LectureListener_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
