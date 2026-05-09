-- CreateTable
CREATE TABLE "sales_targets" (
    "id" BIGSERIAL NOT NULL,
    "period" VARCHAR(16) NOT NULL,
    "period_type" VARCHAR(16) NOT NULL,
    "target_type" VARCHAR(16) NOT NULL,
    "user_id" BIGINT,
    "amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "sales_targets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sales_targets_period_period_type_idx" ON "sales_targets"("period", "period_type");

-- CreateIndex
CREATE UNIQUE INDEX "sales_targets_period_period_type_target_type_user_id_key" ON "sales_targets"("period", "period_type", "target_type", "user_id");

-- AddForeignKey
ALTER TABLE "sales_targets" ADD CONSTRAINT "sales_targets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
