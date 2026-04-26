"use client";

import useSWR from "swr";
import { getAdminStats } from "@/actions/admin";
import { Loader2 } from "lucide-react";

export default function AdminDashboardPage() {
  const { data: stats, error } = useSWR("admin-stats", () => getAdminStats(), {
    refreshInterval: 5000 // Poll every 5s for the live dashboard
  });

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0B1020] text-red-400 font-mono">
        Access Denied or Server Error. Check Environment Admin Variables.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B1020] text-gray-100 p-8" dir="ltr">
      <header className="mb-8 border-b border-white/5 pb-4">
        <h1 className="text-2xl font-bold font-mono text-[#7C5CFF]">Sawti Operator Console</h1>
        <p className="text-sm text-gray-500 mt-1">Private Beta Internal Dashboard</p>
      </header>

      {!stats ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-[#20C7B7]" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatCard title="Active Paid Subscriptions" value={stats.activePaidUsers.toLocaleString()} />
          <StatCard title="Jobs Generated Today" value={stats.jobsToday.toLocaleString()} />
          <StatCard title="Total Failures (All Time)" value={stats.failedJobsAllTime.toLocaleString()} color="text-red-400" />
          <StatCard title="Overall Success Rate" value={`${stats.successRate}%`} color={stats.successRate > 90 ? "text-[#20C7B7]" : "text-yellow-400"} />
          <StatCard title="Avg Gen Time (ms)" value={stats.avgGenerationTimeMs.toLocaleString()} />
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, color = "text-white" }: { title: string, value: string | number, color?: string }) {
  return (
    <div className="bg-[#121936] p-6 rounded-xl border border-white/5 shadow-2xl flex flex-col justify-center">
      <span className="text-xs text-gray-500 font-mono uppercase tracking-widest">{title}</span>
      <span className={`text-4xl font-light tracking-tight mt-2 ${color}`}>{value}</span>
    </div>
  );
}
