/*
  Warnings:

  - You are about to drop the column `projectId` on the `TeamVacancy` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[teamId]` on the table `Project` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "TeamVacancy" DROP CONSTRAINT "TeamVacancy_projectId_fkey";

-- AlterTable
ALTER TABLE "TeamVacancy" DROP COLUMN "projectId";

-- CreateIndex
CREATE UNIQUE INDEX "Project_teamId_key" ON "Project"("teamId");
