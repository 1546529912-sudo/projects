-- CreateTable
CREATE TABLE "follow_up_edit_histories" (
    "id" BIGSERIAL NOT NULL,
    "follow_up_id" BIGINT NOT NULL,
    "editor_id" BIGINT NOT NULL,
    "field" VARCHAR(32) NOT NULL,
    "before_value" TEXT,
    "after_value" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "follow_up_edit_histories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "follow_up_edit_histories_follow_up_id_idx" ON "follow_up_edit_histories"("follow_up_id");

-- AddForeignKey
ALTER TABLE "follow_up_edit_histories" ADD CONSTRAINT "follow_up_edit_histories_follow_up_id_fkey" FOREIGN KEY ("follow_up_id") REFERENCES "follow_up_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_up_edit_histories" ADD CONSTRAINT "follow_up_edit_histories_editor_id_fkey" FOREIGN KEY ("editor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
