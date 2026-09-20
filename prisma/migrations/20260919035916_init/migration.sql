-- CreateEnum
CREATE TYPE "EducationLevel" AS ENUM ('PRIMARY', 'LOWER_SECONDARY', 'IGCSE', 'A_LEVEL', 'MYP', 'DP', 'OTHER');

-- CreateEnum
CREATE TYPE "SessionType" AS ENUM ('REGULAR_LESSON', 'TRIAL_CLASS', 'CONCEPT_INTRO', 'REVISION_RECALL', 'EXAM_SIMULATION', 'DIAGNOSTIC', 'HOMEWORK_HELP');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'RESCHEDULED', 'CANCELLED_BY_STUDENT', 'CANCELLED_WITH_NOTICE', 'ABSENT_UNNOTIFIED');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('DIRECT_EXPLANATION', 'GUIDED_PRACTICE', 'INDEPENDENT_DRILL', 'TOOL_EXPLORATION', 'FORMATIVE_QUIZ', 'ERROR_ANALYSIS');

-- CreateTable
CREATE TABLE "tutors" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tutors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "students" (
    "id" UUID NOT NULL,
    "tutor_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "target_exam_date" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_boards" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,

    CONSTRAINT "exam_boards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courses" (
    "id" UUID NOT NULL,
    "board_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "level" "EducationLevel" NOT NULL,
    "subjectCode" TEXT NOT NULL,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "syllabus_topics" (
    "id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "source_url" TEXT,

    CONSTRAINT "syllabus_topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enrollments" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "started_at" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "session_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "duration_minutes" INTEGER NOT NULL DEFAULT 90,
    "session_type" "SessionType" NOT NULL DEFAULT 'REGULAR_LESSON',
    "status" "SessionStatus" NOT NULL DEFAULT 'COMPLETED',
    "meeting_url" TEXT,
    "recording_url" TEXT,
    "lateness_minutes" INTEGER NOT NULL DEFAULT 0,
    "fine_amount" INTEGER NOT NULL DEFAULT 0,
    "assigned_homework" TEXT,
    "next_focus_topic" TEXT,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tools" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "url" TEXT,

    CONSTRAINT "tools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_segments" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "topic_id" UUID NOT NULL,
    "tool_id" UUID,
    "duration_minutes" INTEGER NOT NULL,
    "activity_type" "ActivityType" NOT NULL,

    CONSTRAINT "session_segments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_ratings" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "engagement" INTEGER NOT NULL,
    "understanding" INTEGER NOT NULL,
    "independence" INTEGER NOT NULL,
    "tutor_clarity" INTEGER NOT NULL,
    "tool_usefulness" INTEGER NOT NULL,

    CONSTRAINT "session_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_checklists" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "solved_cold" BOOLEAN NOT NULL DEFAULT false,
    "recall_warmup_done" BOOLEAN NOT NULL DEFAULT false,
    "student_summarized" BOOLEAN NOT NULL DEFAULT false,
    "visual_tool_used" BOOLEAN NOT NULL DEFAULT false,
    "interleaved_practice" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "session_checklists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_reflections" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "struggle" TEXT,
    "workedWell" TEXT,
    "adjustNext" TEXT,

    CONSTRAINT "session_reflections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tutors_email_key" ON "tutors"("email");

-- CreateIndex
CREATE UNIQUE INDEX "exam_boards_code_key" ON "exam_boards"("code");

-- CreateIndex
CREATE UNIQUE INDEX "courses_board_id_subjectCode_key" ON "courses"("board_id", "subjectCode");

-- CreateIndex
CREATE UNIQUE INDEX "syllabus_topics_course_id_code_key" ON "syllabus_topics"("course_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "enrollments_student_id_course_id_key" ON "enrollments"("student_id", "course_id");

-- CreateIndex
CREATE UNIQUE INDEX "tools_name_key" ON "tools"("name");

-- CreateIndex
CREATE UNIQUE INDEX "session_ratings_session_id_key" ON "session_ratings"("session_id");

-- CreateIndex
CREATE UNIQUE INDEX "session_checklists_session_id_key" ON "session_checklists"("session_id");

-- CreateIndex
CREATE UNIQUE INDEX "session_reflections_session_id_key" ON "session_reflections"("session_id");

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_tutor_id_fkey" FOREIGN KEY ("tutor_id") REFERENCES "tutors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "exam_boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "syllabus_topics" ADD CONSTRAINT "syllabus_topics_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_segments" ADD CONSTRAINT "session_segments_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_segments" ADD CONSTRAINT "session_segments_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "syllabus_topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_segments" ADD CONSTRAINT "session_segments_tool_id_fkey" FOREIGN KEY ("tool_id") REFERENCES "tools"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_ratings" ADD CONSTRAINT "session_ratings_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_checklists" ADD CONSTRAINT "session_checklists_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_reflections" ADD CONSTRAINT "session_reflections_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
