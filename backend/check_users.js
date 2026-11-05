require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      firebaseUid: true,
      _count: {
        select: {
          transactions: true,
          budgets: true,
          savings: true,
          accounts: true
        }
      }
    }
  });
  console.log('Total Users in DB:', users.length);
  console.log(JSON.stringify(users, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
