// 1. Load environment variables
import 'dotenv/config';

// 2. Import dependencies
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import * as bcrypt from 'bcrypt';

// 3. Setup the database adapter
const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Starting seed...');

  // 4. The first admin comes from the environment. There is no default account.
  // Example:
  //   SEED_ADMIN_EMAIL=you@example.com SEED_ADMIN_PASSWORD=a-long-password \
  //   pnpm exec prisma db seed
  const rawEmail = process.env.SEED_ADMIN_EMAIL;
  const rawPassword = process.env.SEED_ADMIN_PASSWORD;

  if (rawEmail === undefined || rawEmail.trim() === '') {
    throw new Error('Set SEED_ADMIN_EMAIL before running the seed.');
  }
  if (rawPassword === undefined || rawPassword.length < 12) {
    throw new Error('Set SEED_ADMIN_PASSWORD (at least 12 characters).');
  }

  // The login form lowercases the e-mail, so the stored one must be lowercase.
  const email = rawEmail.trim().toLowerCase();

  // 5. Hash the password
  const hashedPassword = await bcrypt.hash(rawPassword, 10);

  // 6. Create the admin (or leave it as it is when it already exists)
  const admin = await prisma.admin.upsert({
    where: { email },
    update: {},
    create: {
      email,
      password: hashedPassword,
    },
  });

  console.log('Admin user seeded: ' + admin.email);
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    // 7. Clean up connections
    await prisma.$disconnect();
    await pool.end();
  });
