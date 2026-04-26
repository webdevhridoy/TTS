import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/webhooks/stripe/route';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';
import { NextResponse } from 'next/server';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    stripeEvent: { findUnique: vi.fn(), create: vi.fn() },
    subscription: { upsert: vi.fn(), updateMany: vi.fn() }
  }
}));

vi.mock('@/lib/stripe', () => ({
  stripe: {
    webhooks: { constructEvent: vi.fn() },
    subscriptions: { retrieve: vi.fn() }
  }
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() }
}));

describe('Stripe Webhook Architecture', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  const createMockRequest = (eventId: string, type: string) => {
    return {
      text: vi.fn().mockResolvedValue('raw_body'),
      headers: { get: vi.fn().mockReturnValue('fake_signature') }
    } as unknown as Request;
  };

  it('should explicitly skip processing if the Event ID is already logged idempotently', async () => {
    const req = createMockRequest('evt_duplicate_123', 'customer.subscription.updated');
    
    // Mock stripe resolving correctly
    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
      id: 'evt_duplicate_123',
      type: 'customer.subscription.updated',
      data: { object: {} }
    } as any);

    // Mock DB claiming it exists!
    vi.mocked(prisma.stripeEvent.findUnique).mockResolvedValue({ id: 'evt_duplicate_123' } as any);

    const res = await POST(req) as NextResponse;
    const body = await res.json();
    
    expect(res.status).toBe(200);
    expect(body.skipped).toBe(true);
    // Guarantee no update mutation fired
    expect(prisma.subscription.updateMany).not.toHaveBeenCalled();
  });

  it('should process a new webhook and aggressively lock the Event ID to DB immediately', async () => {
    const req = createMockRequest('evt_new_456', 'customer.subscription.deleted');
    
    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
      id: 'evt_new_456',
      type: 'customer.subscription.deleted',
      data: { object: { customer: 'cus_123' } }
    } as any);

    // DB does NOT have the event
    vi.mocked(prisma.stripeEvent.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.subscription.updateMany).mockResolvedValue({ count: 1 });
    vi.mocked(prisma.stripeEvent.create).mockResolvedValue({ id: 'evt_new_456' } as any);

    const res = await POST(req) as NextResponse;
    
    expect(res.status).toBe(200);
    expect(prisma.subscription.updateMany).toHaveBeenCalledWith({
      where: { stripeCustomerId: 'cus_123' },
      data: { status: 'canceled', plan: 'free' } // Fallback testing logic confirmed
    });
    // Ensure idempotency lock was created
    expect(prisma.stripeEvent.create).toHaveBeenCalledWith({
      data: { id: 'evt_new_456', type: 'customer.subscription.deleted' }
    });
  });
});
