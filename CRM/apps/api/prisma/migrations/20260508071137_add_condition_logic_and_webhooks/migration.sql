-- AlterTable
ALTER TABLE "custom_field_defs" ADD COLUMN     "condition_logic" JSONB;

-- CreateTable
CREATE TABLE "webhook_configs" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(64) NOT NULL,
    "url" VARCHAR(500) NOT NULL,
    "events" TEXT[],
    "secret" VARCHAR(128),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_fired_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "webhook_configs_pkey" PRIMARY KEY ("id")
);
