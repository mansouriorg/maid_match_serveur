-- Update 37: neutral settings for a new database. The existing settings row
-- keeps its values (they are changed in the admin, page Parametres).
ALTER TABLE "Settings" ALTER COLUMN "firstName" SET DEFAULT '';
ALTER TABLE "Settings" ALTER COLUMN "lastName" SET DEFAULT '';
ALTER TABLE "Settings" ALTER COLUMN "email" SET DEFAULT 'contact@example.com';
ALTER TABLE "Settings" ALTER COLUMN "companyName" SET DEFAULT 'MaidMatch';
ALTER TABLE "Settings" ALTER COLUMN "contactPhone" SET DEFAULT '';
