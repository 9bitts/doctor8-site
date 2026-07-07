-- Course marketplace: vitrine, instructor uploads, Doctor Connection benefit

CREATE TYPE "CourseStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'REJECTED', 'ARCHIVED');
CREATE TYPE "CourseProfession" AS ENUM ('MEDICINE', 'NURSING', 'PHARMACY', 'PSYCHOLOGY', 'NUTRITION', 'DENTISTRY', 'INTEGRATIVE', 'PSYCHOANALYSIS', 'GENERAL');
CREATE TYPE "CourseEnrollmentSource" AS ENUM ('PURCHASE', 'DOCTOR_CONNECTION', 'FREE', 'ADMIN');

ALTER TABLE "User" ADD COLUMN "courseCreatorApproved" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "courseCreatorApprovedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "courseCreatorApprovedBy" TEXT;

CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "instructorUserId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "shortDescription" TEXT,
    "thumbnailKey" TEXT,
    "profession" "CourseProfession" NOT NULL DEFAULT 'GENERAL',
    "specialty" TEXT,
    "status" "CourseStatus" NOT NULL DEFAULT 'DRAFT',
    "priceCents" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "commissionPercent" INTEGER NOT NULL DEFAULT 30,
    "workloadHours" DOUBLE PRECISION,
    "publishedAt" TIMESTAMP(3),
    "rejectedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CourseModule" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CourseModule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CourseLesson" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "videoKey" TEXT,
    "videoUrl" TEXT,
    "durationSecs" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPreview" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CourseLesson_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CourseEnrollment" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "source" "CourseEnrollmentSource" NOT NULL,
    "purchaseId" TEXT,
    "progressPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourseEnrollment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CourseLessonProgress" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "watchedSecs" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "CourseLessonProgress_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CoursePurchase" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "buyerUserId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "platformFeeCents" INTEGER NOT NULL,
    "instructorPayoutCents" INTEGER NOT NULL,
    "stripePaymentIntentId" TEXT,
    "stripeCheckoutSessionId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoursePurchase_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CourseConnectionRedemption" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "periodMonth" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "redeemedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourseConnectionRedemption_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Course_slug_key" ON "Course"("slug");
CREATE INDEX "Course_instructorUserId_idx" ON "Course"("instructorUserId");
CREATE INDEX "Course_status_idx" ON "Course"("status");
CREATE INDEX "Course_profession_idx" ON "Course"("profession");

CREATE INDEX "CourseModule_courseId_idx" ON "CourseModule"("courseId");
CREATE INDEX "CourseLesson_moduleId_idx" ON "CourseLesson"("moduleId");

CREATE UNIQUE INDEX "CourseEnrollment_purchaseId_key" ON "CourseEnrollment"("purchaseId");
CREATE UNIQUE INDEX "CourseEnrollment_courseId_userId_key" ON "CourseEnrollment"("courseId", "userId");
CREATE INDEX "CourseEnrollment_userId_idx" ON "CourseEnrollment"("userId");

CREATE UNIQUE INDEX "CourseLessonProgress_enrollmentId_lessonId_key" ON "CourseLessonProgress"("enrollmentId", "lessonId");

CREATE UNIQUE INDEX "CoursePurchase_stripePaymentIntentId_key" ON "CoursePurchase"("stripePaymentIntentId");
CREATE UNIQUE INDEX "CoursePurchase_stripeCheckoutSessionId_key" ON "CoursePurchase"("stripeCheckoutSessionId");
CREATE INDEX "CoursePurchase_buyerUserId_idx" ON "CoursePurchase"("buyerUserId");
CREATE INDEX "CoursePurchase_courseId_idx" ON "CoursePurchase"("courseId");

CREATE UNIQUE INDEX "CourseConnectionRedemption_enrollmentId_key" ON "CourseConnectionRedemption"("enrollmentId");
CREATE UNIQUE INDEX "CourseConnectionRedemption_userId_periodMonth_key" ON "CourseConnectionRedemption"("userId", "periodMonth");
CREATE INDEX "CourseConnectionRedemption_userId_idx" ON "CourseConnectionRedemption"("userId");

ALTER TABLE "Course" ADD CONSTRAINT "Course_instructorUserId_fkey" FOREIGN KEY ("instructorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CourseModule" ADD CONSTRAINT "CourseModule_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CourseLesson" ADD CONSTRAINT "CourseLesson_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "CourseModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CourseEnrollment" ADD CONSTRAINT "CourseEnrollment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CourseEnrollment" ADD CONSTRAINT "CourseEnrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CourseEnrollment" ADD CONSTRAINT "CourseEnrollment_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "CoursePurchase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CourseLessonProgress" ADD CONSTRAINT "CourseLessonProgress_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "CourseEnrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CourseLessonProgress" ADD CONSTRAINT "CourseLessonProgress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "CourseLesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CoursePurchase" ADD CONSTRAINT "CoursePurchase_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CoursePurchase" ADD CONSTRAINT "CoursePurchase_buyerUserId_fkey" FOREIGN KEY ("buyerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CourseConnectionRedemption" ADD CONSTRAINT "CourseConnectionRedemption_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CourseConnectionRedemption" ADD CONSTRAINT "CourseConnectionRedemption_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CourseConnectionRedemption" ADD CONSTRAINT "CourseConnectionRedemption_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "CourseEnrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
