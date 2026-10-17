-- CreateTable
CREATE TABLE "student_topic_baselines" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "topic_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_topic_baselines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "student_topic_baselines_student_id_topic_id_key" ON "student_topic_baselines"("student_id", "topic_id");

-- AddForeignKey
ALTER TABLE "student_topic_baselines" ADD CONSTRAINT "student_topic_baselines_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_topic_baselines" ADD CONSTRAINT "student_topic_baselines_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "syllabus_topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;
