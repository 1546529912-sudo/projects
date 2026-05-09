-- CreateTable
CREATE TABLE "required_field_rules" (
    "id" BIGSERIAL NOT NULL,
    "entity_type" VARCHAR(32) NOT NULL,
    "field_key" VARCHAR(64) NOT NULL,
    "field_label" VARCHAR(64) NOT NULL,
    "rule_type" VARCHAR(16) NOT NULL,
    "stage_value" VARCHAR(64),
    "role_value" VARCHAR(32),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "required_field_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "required_field_rules_entity_type_field_key_rule_type_stage__key" ON "required_field_rules"("entity_type", "field_key", "rule_type", "stage_value", "role_value");
