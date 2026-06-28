-- Optional Google Meet channel for scheduled teleconsult appointments (M5)
CREATE TYPE "AppointmentVideoChannel" AS ENUM ('DAILY', 'GOOGLE_MEET');

ALTER TABLE "Appointment" ADD COLUMN "videoChannel" "AppointmentVideoChannel" NOT NULL DEFAULT 'DAILY';
