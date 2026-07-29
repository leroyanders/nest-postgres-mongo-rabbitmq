/*
  Warnings:

  - A unique constraint covering the columns `[username]` on the table `accounts` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email]` on the table `accounts` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `email` to the `accounts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastname` to the `accounts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `accounts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `username` to the `accounts` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "accounts" ADD COLUMN     "email" TEXT NOT NULL,
ADD COLUMN     "lastname" TEXT NOT NULL,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "username" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "accounts_username_key" ON "accounts"("username");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_email_key" ON "accounts"("email");
