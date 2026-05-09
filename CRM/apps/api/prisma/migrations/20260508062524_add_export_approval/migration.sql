-- CreateTable
CREATE TABLE "export_approvals" (
    "id" BIGSERIAL NOT NULL,
    "requested_by" BIGINT NOT NULL,
    "reviewed_by" BIGINT,
    "scope" VARCHAR(16) NOT NULL DEFAULT 'department',
    "filters" JSONB NOT NULL DEFAULT '{}',
    "status" VARCHAR(16) NOT NULL DEFAULT 'pending',
    "review_note" VARCHAR(500),
    "reviewed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "export_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "export_approvals_requested_by_idx" ON "export_approvals"("requested_by");

-- CreateIndex
CREATE INDEX "export_approvals_status_idx" ON "export_approvals"("status");

-- AddForeignKey
ALTER TABLE "export_approvals" ADD CONSTRAINT "export_approvals_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "export_approvals" ADD CONSTRAINT "export_approvals_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
