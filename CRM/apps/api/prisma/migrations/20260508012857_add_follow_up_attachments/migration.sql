-- CreateTable
CREATE TABLE "follow_up_attachments" (
    "id" BIGSERIAL NOT NULL,
    "follow_up_id" BIGINT NOT NULL,
    "filename" VARCHAR(255) NOT NULL,
    "original_name" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(128) NOT NULL,
    "size" INTEGER NOT NULL,
    "uploaded_by_id" BIGINT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "follow_up_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "follow_up_attachments_follow_up_id_idx" ON "follow_up_attachments"("follow_up_id");

-- AddForeignKey
ALTER TABLE "follow_up_attachments" ADD CONSTRAINT "follow_up_attachments_follow_up_id_fkey" FOREIGN KEY ("follow_up_id") REFERENCES "follow_up_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_up_attachments" ADD CONSTRAINT "follow_up_attachments_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
