/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `Project` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Project" ALTER COLUMN "genre" DROP NOT NULL,
ALTER COLUMN "platform" DROP NOT NULL,
ALTER COLUMN "setting" DROP NOT NULL,
ALTER COLUMN "visualStyle" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Project_slug_key" ON "Project"("slug");
