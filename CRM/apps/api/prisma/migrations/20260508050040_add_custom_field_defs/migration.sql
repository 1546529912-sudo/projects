-- CreateTable
CREATE TABLE "custom_field_defs" (
    "id" BIGSERIAL NOT NULL,
    "entity_type" VARCHAR(32) NOT NULL,
    "label" VARCHAR(64) NOT NULL,
    "field_key" VARCHAR(64) NOT NULL,
    "field_type" VARCHAR(16) NOT NULL,
    "options" VARCHAR(2000),
    "required" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "custom_field_defs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "custom_field_defs_entity_type_field_key_key" ON "custom_field_defs"("entity_type", "field_key");
