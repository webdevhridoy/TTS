import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/tts/route';
import { auth } from '@clerk/nextjs/server';
import { Ratelimit } from '@upstash/ratelimit';
import { NextResponse } from 'next/server';

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn()
}));

vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: vi.fn().mockImplementation(() => ({
    limit: vi.fn()
  }))
}));
// Attach static slidingWindow hook onto the mocked class
(Ratelimit as any).slidingWindow = vi.fn();

vi.mock('@/lib/prisma', () => ({ prisma: {} }));
vi.mock('@/lib/redis', () => ({ redis: {} }));
vi.mock('bullmq', () => ({ Queue: vi.fn() }));
vi.mock('@/lib/logger', () => ({ logger: { warn: vi.fn() } }));

describe('API TTS Route Rejection Flow', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  const createMockRequest = (body: any) => ({
    json: vi.fn().mockResolvedValue(body)
  } as unknown as Request);

  it('should immediately reject Unauthenticated users with 401', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as any);
    const res = await POST(createMockRequest({ text: 'test' })) as NextResponse;
    expect(res.status).toBe(401);
  });

  it('should reject Rapid-Firing users with 429 via Upstash Ratelimit', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'user_spammer' } as any);
    
    // We instantiate the ratelimit mock inside the file scope, but vitest allows tracking it if captured
    // To mock the internal instance's `limit` resolution cleanly, we hijack the route.ts imports inherently through prototype/module mocks
    await vi.doMock('@upstash/ratelimit', () => {
      const mockLimit = vi.fn().mockResolvedValue({ success: false, limit: 15, remaining: 0 });
      return {
        Ratelimit: vi.fn().mockImplementation(() => ({ limit: mockLimit }))
      };
    });

    // Reset module registries to apply the fresh doMock instance dynamically!
    const { POST: MockedPost } = await import('@/app/api/tts/route');

    const res = await MockedPost(createMockRequest({ text: 'spam test' })) as NextResponse;
    const json = await res.json();
    
    expect(res.status).toBe(429);
    expect(json.error).toMatch(/Too many requests/);
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('0');
  });
});
