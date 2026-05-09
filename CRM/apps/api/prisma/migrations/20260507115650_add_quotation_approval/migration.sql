-- AlterTable
ALTER TABLE "products" ADD COLUMN     "min_price" DECIMAL(14,2);

-- AlterTable
ALTER TABLE "quotations" ADD COLUMN     "approval_status" VARCHAR(16);

-- CreateTable
CREATE TABLE "quotation_approvals" (
    "id" BIGSERIAL NOT NULL,
    "quotation_id" BIGINT NOT NULL,
    "requested_by" BIGINT NOT NULL,
    "reviewed_by" BIGINT,
    "reason" TEXT,
    "status" VARCHAR(16) NOT NULL DEFAULT 'pending',
    "review_note" TEXT,
    "reviewed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quotation_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "quotation_approvals_quotation_id_status_idx" ON "quotation_approvals"("quotation_id", "status");

-- AddForeignKey
ALTER TABLE "quotation_approvals" ADD CONSTRAINT "quotation_approvals_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "quotations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_approvals" ADD CONSTRAINT "quotation_approvals_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_approvals" ADD CONSTRAINT "quotation_approvals_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
