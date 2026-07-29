/*
  Warnings:

  - The `balance` column on the `accounts` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "accounts" DROP COLUMN "balance",
ADD COLUMN     "balance" MONEY NOT NULL DEFAULT 0;
