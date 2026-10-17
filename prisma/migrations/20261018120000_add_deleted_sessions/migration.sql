-- CreateTable
CREATE TABLE "deleted_sessions" (
    "id" UUID NOT NULL,
    "tutor_id" UUID NOT NULL,
    "payload" JSONB NOT NULL,
    "deleted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deleted_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "deleted_sessions_tutor_id_deleted_at_idx" ON "deleted_sessions"("tutor_id", "deleted_at");

-- AddForeignKey
ALTER TABLE "deleted_sessions" ADD CONSTRAINT "deleted_sessions_tutor_id_fkey" FOREIGN KEY ("tutor_id") REFERENCES "tutors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
