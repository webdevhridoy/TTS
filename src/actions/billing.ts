"use server";

import { prisma } from "@/lib/prisma";
import { checkUsageLimit } from "@/lib/usage";
import { PLANS } from "@/app/api/checkout/route";

import { auth } from "@clerk/nextjs/server";

export async function getBillingData() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const [subscription, invoices, usageRecords, usage] = await Promise.all([
    prisma.subscription.findUnique({ where: { userId } }),

    // Invoices = all paid Stripe events for this user (via userId in metadata)
    // Since StripeEvent has no userId FK, we use the session IDs we stored on Subscription
    prisma.stripeEvent.findMany({
      where: { type: "checkout.session.completed" },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),

    prisma.usageRecord.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),

    checkUsageLimit(userId, 0),
  ]);

  const planId = (subscription?.plan ?? "free") as keyof typeof PLANS | "free";
  const planDef = planId !== "free" ? PLANS[planId as keyof typeof PLANS] : null;

  return {
    subscription,
    planId,
    planDef,
    invoices,
    usageRecords,
    usage,
  };
}
