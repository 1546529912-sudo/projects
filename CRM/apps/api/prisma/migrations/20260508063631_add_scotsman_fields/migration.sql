-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "scotsman_authority" INTEGER,
ADD COLUMN     "scotsman_competition" INTEGER,
ADD COLUMN     "scotsman_motivation" INTEGER,
ADD COLUMN     "scotsman_need" INTEGER,
ADD COLUMN     "scotsman_notes" VARCHAR(1000),
ADD COLUMN     "scotsman_opportunity" INTEGER,
ADD COLUMN     "scotsman_situation" INTEGER,
ADD COLUMN     "scotsman_size" INTEGER,
ADD COLUMN     "scotsman_timescale" INTEGER;
