-- Phase 2: Google Calendar sync + psychology enhancements

ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "googleCalendarEventId" TEXT;

CREATE TABLE "ProfessionalGoogleCalendar" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "accessToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "calendarId" TEXT NOT NULL DEFAULT 'primary',
    "syncEnabled" BOOLEAN NOT NULL DEFAULT true,
    "externalBusyBlocks" JSONB,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfessionalGoogleCalendar_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProfessionalGoogleCalendar_professionalId_key" ON "ProfessionalGoogleCalendar"("professionalId");
CREATE INDEX "ProfessionalGoogleCalendar_professionalId_idx" ON "ProfessionalGoogleCalendar"("professionalId");

ALTER TABLE "ProfessionalGoogleCalendar" ADD CONSTRAINT "ProfessionalGoogleCalendar_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
