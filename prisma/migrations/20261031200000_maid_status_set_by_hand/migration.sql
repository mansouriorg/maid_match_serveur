-- Update 36: a staff member is now busy only during their assigned jobs,
-- checked per time slot. The automatic BUSY status is no longer used, so the
-- people it still marks become AVAILABLE again. No booking is changed.
UPDATE "Maid" SET "status" = 'AVAILABLE' WHERE "status" = 'BUSY';
