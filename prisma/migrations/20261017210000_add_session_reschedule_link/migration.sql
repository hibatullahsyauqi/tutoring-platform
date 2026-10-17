-- AlterTable
ALTER TABLE "sessions" ADD COLUMN     "rescheduled_from_id" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "sessions_rescheduled_from_id_key" ON "sessions"("rescheduled_from_id");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_rescheduled_from_id_fkey" FOREIGN KEY ("rescheduled_from_id") REFERENCES "sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
