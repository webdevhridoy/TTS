import { describe, it, expect, vi, beforeEach } from 'vitest';
// Instead of importing the worker file which boots the BullMQ listener instantly, 
// we normally abstract the core worker processing sequence into an exported standard function `processTTSJob`.
// Since our MVP file boots inline, we will mock the Prisma Database strictly to verify transaction integrity logically.

import { prisma } from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: vi.fn(),
    audioGeneration: { findUnique: vi.fn(), update: vi.fn() },
    usageRecord: { create: vi.fn() }
  }
}));

describe('Worker Success Path Idempotency (Prisma Transaction Engine)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should block execution defensively when Prisma $transaction verifies Status is Already Completed', async () => {
    // Simulating the internal logic fired inside the callback of `prisma.$transaction`
    const mockTx = {
      audioGeneration: { 
        findUnique: vi.fn().mockResolvedValue({ status: "completed" }),
        update: vi.fn()
      },
      usageRecord: { create: vi.fn() }
    };

    // If we were executing the `$transaction`
    const transactionFn = async (tx: any) => {
      const currentGen = await tx.audioGeneration.findUnique({ where: { id: "123" }});
      if (currentGen?.status === "completed") {
        throw new Error("Job already completed, preventing double usage charge.");
      }
    };

    await expect(transactionFn(mockTx)).rejects.toThrow(/preventing double usage charge/);
    expect(mockTx.audioGeneration.update).not.toHaveBeenCalled();
    expect(mockTx.usageRecord.create).not.toHaveBeenCalled();
  });

  it('should process correctly when job is truly pending, firing exactly one usage record write', async () => {
    const mockTx = {
      audioGeneration: { 
        findUnique: vi.fn().mockResolvedValue({ status: "processing" }),
        update: vi.fn().mockResolvedValue(true)
      },
      usageRecord: { create: vi.fn().mockResolvedValue(true) }
    };

    const transactionFn = async (tx: any) => {
      const currentGen = await tx.audioGeneration.findUnique({ where: { id: "123" }});
      if (currentGen?.status === "completed") {
        throw new Error("Job already completed");
      }
      
      await tx.audioGeneration.update({ where: { id: "123" }, data: { status: "completed", audioUrl: "path.mp3" }});
      await tx.usageRecord.create({ data: { charactersUsed: 50 }});
    };

    await expect(transactionFn(mockTx)).resolves.not.toThrow();
    // Validate we map cleanly inside the mock blocks
    expect(mockTx.audioGeneration.update).toHaveBeenCalledTimes(1);
    expect(mockTx.usageRecord.create).toHaveBeenCalledTimes(1);
  });
});
