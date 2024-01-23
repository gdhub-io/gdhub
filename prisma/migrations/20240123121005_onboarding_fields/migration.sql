-- CreateEnum
CREATE TYPE "PrimaryInterest" AS ENUM ('Specialist', 'Author', 'Mentor');

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "otherResources" TEXT,
ADD COLUMN     "primaryInterest" "PrimaryInterest" NOT NULL DEFAULT 'Specialist';
