// 1. Load environment variables
import 'dotenv/config';

// 2. Import dependencies
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
// IMPORTANT: Adjust this path if your generated client is elsewhere
import { PrismaClient } from '../generated/prisma/client'; 
import * as bcrypt from 'bcrypt';

// 3. Setup the Database Adapter
// (REQUIRED because your schema uses "driverAdapters" or "prisma-client" provider)
const connectionString = process.env.DATABASE_URL;

// Create a Postgres connection pool
const pool = new Pool({ connectionString });
// Create the Prisma adapter
const adapter = new PrismaPg(pool);
// Pass the adapter to the client
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Starting seed...');

  // 4. Define your initial Admin credentials
  const email = 'admin@maidmatch.com';
  const rawPassword = 'SecurePassword123!'; 

  // 5. Hash the password (using bcrypt as requested)
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(rawPassword, saltRounds);

  // 6. Create (or Update) the Admin
  const admin = await prisma.admin.upsert({
    where: { email: email },
    update: {}, // If exists, do nothing
    create: {
      email: email,
      password: hashedPassword,
    },
  });

  console.log(`✅ Admin user seeded: ${admin.email}`);
  // console.log(`🔑 Password: ${rawPassword}`); // Keep secure
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    // 7. Clean up connections
    await prisma.$disconnect();
    await pool.end(); // Close the pool explicitly to ensure the script exits
  });