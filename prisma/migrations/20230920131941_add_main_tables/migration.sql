/*
  Warnings:

  - You are about to drop the column `profileId` on the `User` table. All the data in the column will be lost.
  - Added the required column `name` to the `Profile` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "SkillLevel" AS ENUM ('Novice', 'Beginner', 'Skillful', 'Experienced', 'Expert');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('Registered', 'Approved', 'Rejected', 'Done');

-- CreateEnum
CREATE TYPE "TeamMemberStatus" AS ENUM ('Applicant', 'Hired', 'Rejected', 'Fired', 'Founder');

-- CreateEnum
CREATE TYPE "TeamVacancyStatus" AS ENUM ('Draft', 'Published', 'Closed');

-- CreateEnum
CREATE TYPE "LectureStage" AS ENUM ('Requested', 'Proposed', 'Actualized', 'Ready', 'Held', 'Canceled');

-- CreateEnum
CREATE TYPE "SeasonStatus" AS ENUM ('Planning', 'Active', 'Done');

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "name" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "profileId",
ALTER COLUMN "roles" SET DEFAULT ARRAY['Guest']::"UserRole"[];

-- CreateTable
CREATE TABLE "Speciality" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "specialization" TEXT NOT NULL,
    "level" "SkillLevel" NOT NULL,
    "workDirectionId" TEXT NOT NULL,
    "portfolioUrl" TEXT,
    "skills" TEXT,
    "tools" TEXT,
    "jobs" TEXT,
    "schools" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Speciality_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkDirection" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "WorkDirection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Season" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "finishedAt" TIMESTAMP(3),
    "status" "SeasonStatus" NOT NULL DEFAULT 'Planning',
    "slug" TEXT NOT NULL,

    CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeasonStage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "order" INTEGER NOT NULL DEFAULT 0,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "seasonId" TEXT NOT NULL,

    CONSTRAINT "SeasonStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeasonStreamReport" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "stageId" TEXT NOT NULL,

    CONSTRAINT "SeasonStreamReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'Registered',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "stageId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "coverImage" TEXT,
    "genre" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "setting" TEXT NOT NULL,
    "visualStyle" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "audition" TEXT,
    "conceptLink" TEXT,
    "gddLink" TEXT,
    "pitchdeckLink" TEXT,
    "videoLink" TEXT,
    "coreMechanics" TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "teamId" TEXT NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectEstimation" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "expertId" TEXT NOT NULL,
    "notes" TEXT NOT NULL,
    "isApproved" BOOLEAN NOT NULL,
    "form" JSONB NOT NULL,

    CONSTRAINT "ProjectEstimation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectTeam" (
    "id" TEXT NOT NULL,

    CONSTRAINT "ProjectTeam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectReport" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "content" TEXT NOT NULL,
    "video" TEXT,
    "authorId" TEXT NOT NULL,

    CONSTRAINT "ProjectReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMember" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "status" "TeamMemberStatus" NOT NULL DEFAULT 'Applicant',
    "position" TEXT NOT NULL,
    "allowedContacts" TEXT[],
    "specialityId" TEXT NOT NULL,
    "vacancyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamVacancy" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "directionId" TEXT NOT NULL,
    "status" "TeamVacancyStatus" NOT NULL DEFAULT 'Draft',
    "publishedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "teamId" TEXT NOT NULL,

    CONSTRAINT "TeamVacancy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lecture" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "wishes" TEXT,
    "requestedById" TEXT,
    "directionId" TEXT NOT NULL,
    "description" TEXT,
    "date" TIMESTAMP(3),
    "linkToStream" TEXT,
    "recordLink" TEXT,
    "duration" INTEGER,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "stage" "LectureStage" NOT NULL,

    CONSTRAINT "Lecture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LecturerRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "directionId" TEXT NOT NULL,
    "curriculum" TEXT NOT NULL,
    "date" TIMESTAMP(3),
    "duration" INTEGER,
    "lectureId" TEXT NOT NULL,
    "linkToStream" TEXT,
    "isSpeaker" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LecturerRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LectureListener" (
    "id" TEXT NOT NULL,
    "listenerId" TEXT NOT NULL,
    "lectureId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LectureListener_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkDirection_name_key" ON "WorkDirection"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Project_teamId_key" ON "Project"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectEstimation_projectId_key" ON "ProjectEstimation"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectReport_projectId_key" ON "ProjectReport"("projectId");

-- AddForeignKey
ALTER TABLE "Speciality" ADD CONSTRAINT "Speciality_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Speciality" ADD CONSTRAINT "Speciality_workDirectionId_fkey" FOREIGN KEY ("workDirectionId") REFERENCES "WorkDirection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeasonStage" ADD CONSTRAINT "SeasonStage_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeasonStreamReport" ADD CONSTRAINT "SeasonStreamReport_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "SeasonStage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "SeasonStage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "ProjectTeam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectEstimation" ADD CONSTRAINT "ProjectEstimation_expertId_fkey" FOREIGN KEY ("expertId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectEstimation" ADD CONSTRAINT "ProjectEstimation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectEstimation" ADD CONSTRAINT "ProjectEstimation_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "SeasonStage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectReport" ADD CONSTRAINT "ProjectReport_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectReport" ADD CONSTRAINT "ProjectReport_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_specialityId_fkey" FOREIGN KEY ("specialityId") REFERENCES "Speciality"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "ProjectTeam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_vacancyId_fkey" FOREIGN KEY ("vacancyId") REFERENCES "TeamVacancy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamVacancy" ADD CONSTRAINT "TeamVacancy_directionId_fkey" FOREIGN KEY ("directionId") REFERENCES "WorkDirection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamVacancy" ADD CONSTRAINT "TeamVacancy_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "ProjectTeam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lecture" ADD CONSTRAINT "Lecture_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lecture" ADD CONSTRAINT "Lecture_directionId_fkey" FOREIGN KEY ("directionId") REFERENCES "WorkDirection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LecturerRequest" ADD CONSTRAINT "LecturerRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LecturerRequest" ADD CONSTRAINT "LecturerRequest_lectureId_fkey" FOREIGN KEY ("lectureId") REFERENCES "Lecture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LectureListener" ADD CONSTRAINT "LectureListener_lectureId_fkey" FOREIGN KEY ("lectureId") REFERENCES "Lecture"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LectureListener" ADD CONSTRAINT "LectureListener_listenerId_fkey" FOREIGN KEY ("listenerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
