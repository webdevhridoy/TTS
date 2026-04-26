"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export async function checkIsAdmin(): Promise<boolean> {
  try {
    await requireAdmin();
    return true;
  } catch {
    return false;
  }
}

export async function getAdminStats() {
  await requireAdmin();

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [
    todayJobsCount,
    failedJobsCount,
    successJobsCount,
    activePaidUsers,
    avgTimeResult
  ] = await Promise.all([
    prisma.audioGeneration.count({
      where: { createdAt: { gte: startOfDay } }
    }),
    prisma.audioGeneration.count({
      where: { status: "failed" }
    }),
    prisma.audioGeneration.count({
      where: { status: "completed" }
    }),
    prisma.subscription.count({
      where: { status: "active", plan: { not: "free" } }
    }),
    prisma.audioGeneration.aggregate({
      _avg: { generationTimeMs: true },
      where: { status: "completed" }
    })
  ]);

  const totalProcessed = failedJobsCount + successJobsCount;
  const successRate = totalProcessed > 0 ? (successJobsCount / totalProcessed) * 100 : 0;
  return {
    jobsToday: todayJobsCount,
    failedJobsAllTime: failedJobsCount,
    successRate: Math.round(successRate * 10) / 10,
    avgGenerationTimeMs: Math.round(avgTimeResult._avg.generationTimeMs || 0),
    activePaidUsers
  };
}
