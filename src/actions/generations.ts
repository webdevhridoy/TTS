"use server";

import { prisma } from "@/lib/prisma";
import { checkUsageLimit } from "@/lib/usage";
import { auth } from "@clerk/nextjs/server";

export async function getUserGenerations(limit: number = 10) {
  const { userId } = await auth();
  if (!userId) return [];

  const generations = await prisma.audioGeneration.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      inputText: true,
      audioUrl: true, // Served directly from /public/audio/ now
      durationSeconds: true,
      status: true,
      createdAt: true,
      provider: true,
      voiceId: true,
      errorMessage: true
    }
  });

  return generations;
}

export async function getUserUsageStats() {
  const { userId } = await auth();
  if (!userId) return null;
  return await checkUsageLimit(userId, 0);
}
