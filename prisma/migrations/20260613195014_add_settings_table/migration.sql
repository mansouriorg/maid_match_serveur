-- CreateTable
CREATE TABLE "Settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "firstName" TEXT NOT NULL DEFAULT 'Mahmoud',
    "lastName" TEXT NOT NULL DEFAULT 'Mansouri',
    "email" TEXT NOT NULL DEFAULT 'admin@nobreach.com',
    "companyName" TEXT NOT NULL DEFAULT 'No Breach',
    "contactPhone" TEXT NOT NULL DEFAULT '+216 55 123 456',
    "defaultHourlyRate" DOUBLE PRECISION NOT NULL DEFAULT 15.0,
    "emailAlerts" BOOLEAN NOT NULL DEFAULT true,
    "smsAlerts" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);
