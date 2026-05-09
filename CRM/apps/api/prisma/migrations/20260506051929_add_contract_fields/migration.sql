-- AlterTable
ALTER TABLE "opportunities" ADD COLUMN     "contract_status" VARCHAR(16) DEFAULT 'none',
ADD COLUMN     "contract_url" VARCHAR(512);
