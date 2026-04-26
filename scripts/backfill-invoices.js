const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Get active subscription
  const sub = await prisma.subscription.findFirst({
    where: { status: 'active' }
  });
  
  if (!sub) { console.log('No active subscription found'); return; }
  console.log('Subscription:', JSON.stringify(sub, null, 2));

  // Get all stripe events
  const events = await prisma.stripeEvent.findMany();
  console.log('StripeEvents:', JSON.stringify(events, null, 2));

  // Get plan info
  const plan = await prisma.plan.findFirst({ where: { name: sub.plan } });
  console.log('Plan:', JSON.stringify(plan, null, 2));

  // Back-fill events that are missing planId/amount
  for (const ev of events) {
    if (!ev.planId && sub.plan && sub.plan !== 'free') {
      await prisma.stripeEvent.update({
        where: { id: ev.id },
        data: {
          planId: sub.plan,
          amount: plan?.monthlyPrice ?? null,
          receiptUrl: sub.receiptUrl ?? null,
        }
      });
      console.log(`Updated event ${ev.id}`);
    }
  }
  console.log('Done!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
