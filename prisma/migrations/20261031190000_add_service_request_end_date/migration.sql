-- Update 28: keep the last day of the period the customer is available.
-- Adds one optional column. Existing rows are not changed.
ALTER TABLE "ServiceRequest" ADD COLUMN "endDate" TIMESTAMP(3);
