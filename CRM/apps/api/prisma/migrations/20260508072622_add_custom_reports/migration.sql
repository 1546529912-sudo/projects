-- CreateTable
CREATE TABLE "custom_reports" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "entity_type" VARCHAR(32) NOT NULL,
    "dimensions" TEXT[],
    "metrics" JSONB NOT NULL,
    "filters" JSONB,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "custom_reports_pkey" PRIMARY KEY ("id")
);
