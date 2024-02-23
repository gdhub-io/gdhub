-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('Active', 'Paused', 'Canceled');

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "motivation" TEXT;

-- AlterTable
ALTER TABLE "Speciality" ADD COLUMN     "summary" TEXT;

-- CreateTable
CREATE TABLE "MatchingSpecialistAndProject" (
    "id" TEXT NOT NULL,
    "specialityId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "projectScore" INTEGER NOT NULL,
    "authorScore" INTEGER NOT NULL,
    "avgScore" INTEGER NOT NULL,
    "teamScore" INTEGER NOT NULL,
    "summary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MatchingSpecialistAndProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionPlan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "providerPlanName" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "description" TEXT,

    CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "status" "SubscriptionStatus" NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MatchingSpecialistAndProject_projectId_specialityId_key" ON "MatchingSpecialistAndProject"("projectId", "specialityId");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPlan_name_key" ON "SubscriptionPlan"("name");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPlan_providerPlanName_key" ON "SubscriptionPlan"("providerPlanName");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_providerId_key" ON "Subscription"("providerId");

-- AddForeignKey
ALTER TABLE "MatchingSpecialistAndProject" ADD CONSTRAINT "MatchingSpecialistAndProject_specialityId_fkey" FOREIGN KEY ("specialityId") REFERENCES "Speciality"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchingSpecialistAndProject" ADD CONSTRAINT "MatchingSpecialistAndProject_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
