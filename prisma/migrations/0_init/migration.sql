-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "accounts" (
    "id" UUID NOT NULL,
    "balance" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);
