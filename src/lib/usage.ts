import { prisma } from "./prisma";

export async function checkUsageLimit(userId: string, requestedCharacters: number) {
  // 1. Fetch subscription + plan in one pass
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  const planId = subscription?.plan || "free";
  const plan = await prisma.plan.findFirst({ where: { name: planId } });

  // Free tier default: 1,000 chars lifetime. Paid plans use their purchased limit.
  const limit = plan?.characterLimit ?? (planId === "free" ? 1000 : 50_000);

  // 2. Determine the period start for usage aggregation
  let usageSum = 0;

  if (planId === "free") {
    // Free: count all-time usage
    const records = await prisma.usageRecord.aggregate({
      where: { userId },
      _sum: { charactersUsed: true },
    });
    usageSum = records._sum.charactersUsed ?? 0;
  } else {
    // Paid: count usage only from when they paid (paidAt).
    // This ensures they get a fresh allowance after each purchase.
    const periodStart: Date =
      subscription?.paidAt ??
      (subscription?.currentPeriodEnd
        ? new Date(subscription.currentPeriodEnd.getTime() - 30 * 24 * 60 * 60 * 1000)
        : new Date(new Date().setDate(1))); // last-resort: start of month

    const records = await prisma.usageRecord.aggregate({
      where: { userId, createdAt: { gte: periodStart } },
      _sum: { charactersUsed: true },
    });
    usageSum = records._sum.charactersUsed ?? 0;
  }

  // 3. Evaluate allowance
  const wouldExceed = usageSum + requestedCharacters > limit;

  if (wouldExceed) {
    return {
      allowed: false,
      limit,
      currentUsage: usageSum,
      remaining: Math.max(0, limit - usageSum),
    };
  }

  return {
    allowed: true,
    limit,
    currentUsage: usageSum,
    remaining: limit - (usageSum + requestedCharacters),
  };
}
