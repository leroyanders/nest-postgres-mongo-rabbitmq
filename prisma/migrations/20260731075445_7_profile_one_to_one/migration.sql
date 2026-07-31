-- DropIndex
DROP INDEX "profiles_account_id_username_idx";

-- CreateIndex
CREATE UNIQUE INDEX "profiles_account_id_key" ON "profiles"("account_id");

