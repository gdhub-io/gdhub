-- CreateEnum
CREATE TYPE "Language" AS ENUM ('ru', 'en');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lang" "Language" NOT NULL DEFAULT 'ru';
