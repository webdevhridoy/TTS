import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";
import { logger } from "@/lib/logger";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("Stripe-Signature") as string;

  let event: Stripe.Event;

  try {
    if (!process.env.STRIPE_WEBHOOK_SECRET) throw new Error("Missing WEBOOK SECRET");
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err: any) {
    logger.error("Webhook verification failed", { error: err.message });
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // Idempotency Check
  const existingEvent = await prisma.stripeEvent.findUnique({
    where: { id: event.id }
  });

  if (existingEvent) {
    logger.info(`Idempotency skip for processed event: ${event.id}`);
    return NextResponse.json({ received: true, skipped: true }, { status: 200 });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const subscription = event.data.object as Stripe.Subscription;
  const invoice = event.data.object as Stripe.Invoice;

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        if (session.mode === "subscription") {
          const userId = session.client_reference_id;
          const customerId = session.customer as string;
          const subId = session.subscription as string;

          if (!userId) break;

          const stripeSub: any = await stripe.subscriptions.retrieve(subId);

          await prisma.subscription.upsert({
            where: { userId },
            create: {
              userId,
              stripeCustomerId: customerId,
              stripeSubscriptionId: subId,
              plan: "pro", 
              status: stripeSub.status,
              currentPeriodEnd: new Date(stripeSub.current_period_end * 1000)
            },
            update: {
              stripeCustomerId: customerId,
              stripeSubscriptionId: subId,
              plan: "pro",
              status: stripeSub.status,
              currentPeriodEnd: new Date(stripeSub.current_period_end * 1000)
            }
          });
          logger.info(`Subscription upgraded for User: ${userId}`);
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const customerId = (subscription as any).customer as string;
        await prisma.subscription.updateMany({
          where: { stripeCustomerId: customerId },
          data: {
            status: (subscription as any).status,
            currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
            stripeSubscriptionId: (subscription as any).id
          }
        });
        logger.info(`Subscription ${subscription.id} status updated to ${subscription.status}`);
        break;
      }

      case "customer.subscription.deleted": {
        const customerId = subscription.customer as string;
        await prisma.subscription.updateMany({
          where: { stripeCustomerId: customerId },
          data: {
            status: "canceled",
            plan: "free"
          }
        });
        logger.info(`Subscription canceled for customer: ${customerId}`);
        break;
      }

      case "invoice.payment_failed": {
        const customerId = invoice.customer as string;
        // The subscription.updated webhook normally catches past_due, 
        // but we can log the failure manually for alerts.
        logger.warn(`Invoice payment failed for customer: ${customerId}`, { invoiceId: invoice.id });
        break;
      }
    }

    // Mark event as processed
    await prisma.stripeEvent.create({
      data: { id: event.id, type: event.type }
    });

  } catch (dbError: any) {
    logger.error("Database operation failed during webhook", { eventId: event.id, error: dbError.message });
    return NextResponse.json({ error: "DB Error" }, { status: 500 });
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
