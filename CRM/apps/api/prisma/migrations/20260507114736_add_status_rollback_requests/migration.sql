-- CreateTable
CREATE TABLE "status_rollback_requests" (
    "id" BIGSERIAL NOT NULL,
    "customer_id" BIGINT NOT NULL,
    "from_status" VARCHAR(32) NOT NULL,
    "to_status" VARCHAR(32) NOT NULL,
    "reason" TEXT,
    "status" VARCHAR(16) NOT NULL DEFAULT 'pending',
    "requested_by" BIGINT NOT NULL,
    "reviewed_by" BIGINT,
    "review_note" TEXT,
    "reviewed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "status_rollback_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "status_rollback_requests_customer_id_idx" ON "status_rollback_requests"("customer_id");

-- CreateIndex
CREATE INDEX "status_rollback_requests_status_idx" ON "status_rollback_requests"("status");

-- AddForeignKey
ALTER TABLE "status_rollback_requests" ADD CONSTRAINT "status_rollback_requests_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "status_rollback_requests" ADD CONSTRAINT "status_rollback_requests_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "status_rollback_requests" ADD CONSTRAINT "status_rollback_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
