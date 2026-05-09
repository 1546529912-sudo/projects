-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "bant_authority" INTEGER,
ADD COLUMN     "bant_budget" INTEGER,
ADD COLUMN     "bant_need" INTEGER,
ADD COLUMN     "bant_notes" VARCHAR(1000),
ADD COLUMN     "bant_timeline" INTEGER;
