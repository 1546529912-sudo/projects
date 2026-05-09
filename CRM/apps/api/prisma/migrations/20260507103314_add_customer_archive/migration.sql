-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "archive_reason" VARCHAR(500),
ADD COLUMN     "archived_at" TIMESTAMPTZ;
