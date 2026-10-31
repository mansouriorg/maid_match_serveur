-- Update 41: an internal note on a booking, for the team only. Nothing is
-- removed: existing bookings simply have no note.
ALTER TABLE "ServiceRequest" ADD COLUMN "internalNote" TEXT;
