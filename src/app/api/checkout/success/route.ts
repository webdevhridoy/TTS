import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { PLANS, type PlanId } from "../route";

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("session_id");

  if (!sessionId) {
    return NextResponse.redirect(new URL("/dashboard?error=missing_session", req.url));
  }

  try {
    // Retrieve + verify the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return NextResponse.redirect(new URL("/dashboard?error=not_paid", req.url));
    }

    const userId = session.metadata?.userId;
    const planId = session.metadata?.planId as PlanId;
    const chars  = parseInt(session.metadata?.chars || "0", 10);

    if (!userId || !planId || !chars) {
      return NextResponse.redirect(new URL("/dashboard?error=bad_metadata", req.url));
    }

    const plan = PLANS[planId];

    // Fetch receipt URL from Stripe PaymentIntent → latest_charge
    let receiptUrl: string | null = null;
    if (session.payment_intent) {
      try {
        const pi = await stripe.paymentIntents.retrieve(
          session.payment_intent as string,
          { expand: ["latest_charge"] }
        );
        receiptUrl = (pi as any).latest_charge?.receipt_url ?? null;
      } catch {
        // Non-fatal: receipt URL best-effort only
      }
    }

    const now = new Date();

    // 1. Ensure User record exists (idempotent)
    await prisma.user.upsert({
      where:  { id: userId },
      create: { id: userId, email: `${userId}@local.dev`, name: "Local User" },
      update: {},
    });

    // 2. Ensure Plan record exists with correct char limit
    const existingPlan = await prisma.plan.findFirst({ where: { name: planId } });
    if (existingPlan) {
      await prisma.plan.update({
        where: { id: existingPlan.id },
        data:  { characterLimit: chars, monthlyPrice: plan.amount / 100 },
      });
    } else {
      await prisma.plan.create({
        data: { name: planId, monthlyPrice: plan.amount / 100, characterLimit: chars },
      });
    }

    // 3. Update (or create) Subscription — store receiptUrl + paidAt
    await prisma.subscription.upsert({
      where:  { userId },
      create: {
        userId,
        stripeCustomerId:     session.customer as string ?? null,
        stripeSubscriptionId: sessionId,
        plan:                 planId,
        status:               "active",
        currentPeriodEnd:     null,
        receiptUrl,
        paidAt: now,
      },
      update: {
        plan:                 planId,
        status:               "active",
        stripeCustomerId:     session.customer as string ?? undefined,
        stripeSubscriptionId: sessionId,
        receiptUrl,
        paidAt: now,
      },
    });

    // 4. Idempotency — store Stripe event with full invoice metadata
    await prisma.stripeEvent.upsert({
      where:  { id: sessionId },
      create: {
        id:         sessionId,
        type:       "checkout.session.completed",
        planId,
        amount:     plan.amount / 100,
        receiptUrl,
      },
      update: {},
    });

    return NextResponse.redirect(
      new URL(`/dashboard/billing?upgraded=true&plan=${planId}`, req.url)
    );
  } catch (err: any) {
    console.error("Checkout success error:", err.message);
    return NextResponse.redirect(new URL("/dashboard?error=server", req.url));
  }
}
