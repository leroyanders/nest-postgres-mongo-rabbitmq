/*
  Warnings:

  - You are about to alter the column `balance` on the `accounts` table. The data in that column could be lost. The data in that column will be cast from `Money` to `Decimal(18,2)`.

*/
-- AlterTable
ALTER TABLE "accounts" ALTER COLUMN "balance" SET DATA TYPE DECIMAL(18,2);
