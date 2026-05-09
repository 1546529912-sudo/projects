-- CreateTable
CREATE TABLE "customer_collaborators" (
    "id" BIGSERIAL NOT NULL,
    "customer_id" BIGINT NOT NULL,
    "user_id" BIGINT NOT NULL,
    "added_by_id" BIGINT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_collaborators_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customer_collaborators_customer_id_idx" ON "customer_collaborators"("customer_id");

-- CreateIndex
CREATE INDEX "customer_collaborators_user_id_idx" ON "customer_collaborators"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "customer_collaborators_customer_id_user_id_key" ON "customer_collaborators"("customer_id", "user_id");

-- AddForeignKey
ALTER TABLE "customer_collaborators" ADD CONSTRAINT "customer_collaborators_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_collaborators" ADD CONSTRAINT "customer_collaborators_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_collaborators" ADD CONSTRAINT "customer_collaborators_added_by_id_fkey" FOREIGN KEY ("added_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
