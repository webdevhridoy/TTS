const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

p.subscription.update({
  where: { userId: 'local-test-user-123' },
  data: { paidAt: new Date('2026-04-12T08:58:43.539Z') }
}).then(r => console.log('paidAt set:', r.paidAt))
  .catch(console.error)
  .finally(() => p.$disconnect());
