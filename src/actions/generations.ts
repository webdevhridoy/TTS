"use server";

import { prisma } from "@/lib/prisma";
import { checkUsageLimit } from "@/lib/usage";
import { auth } from "@clerk/nextjs/server";
import { getAnonymousId } from "@/lib/get-ip";

export async function getUserGenerations(limit: number = 10) {
  let { userId } = await auth();
  if (!userId) {
    userId = await getAnonymousId();
  }

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
  let { userId } = await auth();
  if (!userId) {
    userId = await getAnonymousId();
  }
  return await checkUsageLimit(userId, 0);
}
