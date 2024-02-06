/*
  Warnings:

  - You are about to drop the column `agreements` on the `Profile` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Profile" DROP COLUMN "agreements";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "agreements" JSONB DEFAULT '{ "confirmUserData": false, "agreeWithTermsAndPrivacy": false, "needSubscribeToNewsletter": false }';
