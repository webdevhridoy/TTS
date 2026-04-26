import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkUsageLimit } from '@/lib/usage';
import { prisma } from '@/lib/prisma';

// Mock the prisma client fully
vi.mock('@/lib/prisma', () => ({
  prisma: {
    subscription: { findUnique: vi.fn() },
    plan: { findFirst: vi.fn() },
    usageRecord: { aggregate: vi.fn() },
  }
}));

describe('Usage Calculation Limits', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should allow generation if free user is under 500 characters total', async () => {
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue(null as any);
    vi.mocked(prisma.plan.findFirst).mockResolvedValue({ characterLimit: 500, name: 'free' } as any);
    vi.mocked(prisma.usageRecord.aggregate).mockResolvedValue({ _sum: { charactersUsed: 100 } } as any);

    const result = await checkUsageLimit('user_123', 50);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(350); // 500 - 100 - 50
  });

  it('should reject free users who exceed their limit in a single burst', async () => {
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue(null as any);
    vi.mocked(prisma.plan.findFirst).mockResolvedValue({ characterLimit: 500, name: 'free' } as any);
    vi.mocked(prisma.usageRecord.aggregate).mockResolvedValue({ _sum: { charactersUsed: 450 } } as any);

    const result = await checkUsageLimit('user_123', 100);
    expect(result.allowed).toBe(false);
    expect(result.currentUsage).toBe(450);
  });

  it('should correctly evaluate PRO tier monthly isolation', async () => {
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue({ plan: 'pro', currentPeriodEnd: new Date('2026-05-01') } as any);
    vi.mocked(prisma.plan.findFirst).mockResolvedValue({ characterLimit: 50000, name: 'pro' } as any);
    // Even if they have heavy usage, it aggregates bounding by the month internally, we just test the sum result here.
    vi.mocked(prisma.usageRecord.aggregate).mockResolvedValue({ _sum: { charactersUsed: 49000 } } as any);

    const result = await checkUsageLimit('pro_user', 500);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(500); // 50000 - 49500
  });
});
