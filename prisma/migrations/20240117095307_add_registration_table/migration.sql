-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "agreements" JSONB NOT NULL DEFAULT '{ "confirmUserData": false, "agreeWithTermsAndPrivacy": false, "needSubscribeToNewsletter": false }',
ADD COLUMN     "yearOfBirth" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "TeamMember" ALTER COLUMN "position" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "onboardingDone" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Registration" (
    "id" TEXT NOT NULL,
    "registrationToken" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Registration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Registration_registrationToken_key" ON "Registration"("registrationToken");
