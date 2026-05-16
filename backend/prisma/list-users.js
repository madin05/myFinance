const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.user.findMany({ select: { firebaseUid: true, name: true, email: true } })
  .then(users => {
    if (users.length === 0) {
      console.log('No users found. Please log in first, then run this again.');
    } else {
      console.log('\n=== Registered Users ===');
      users.forEach(u => {
        console.log(`\nName:  ${u.name}`);
        console.log(`Email: ${u.email}`);
        console.log(`UID:   ${u.firebaseUid}`);
      });
      console.log('\n=== Run Seed ===');
      users.forEach(u => {
        console.log(`node prisma/seed.js ${u.firebaseUid}   (${u.name})`);
      });
    }
  })
  .catch(e => console.error(e.message))
  .finally(() => p.$disconnect());
