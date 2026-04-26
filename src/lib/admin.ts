import { auth } from "@clerk/nextjs/server";
import { env } from "./env";

export function isAdminUser(userId: string | null | undefined): boolean {
  if (!userId) return false;
  
  const adminIds = env.server.ADMIN_USER_IDS.split(",")
    .map(id => id.trim())
    .filter(Boolean);
    
  return adminIds.includes(userId);
}

export async function requireAdmin() {
  const session = await auth();
  
  if (!session || !session.userId) {
    throw new Error("Unauthorized");
  }

  if (!isAdminUser(session.userId)) {
    throw new Error("Forbidden: Admin access required.");
  }

  return session;
}
