-- CreateTable
CREATE TABLE "lead_source_configs" (
    "id" BIGSERIAL NOT NULL,
    "category" VARCHAR(64) NOT NULL,
    "category_label" VARCHAR(64) NOT NULL,
    "name" VARCHAR(64) NOT NULL,
    "label" VARCHAR(64) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_source_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lead_source_configs_category_is_active_idx" ON "lead_source_configs"("category", "is_active");
