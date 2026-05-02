import { headers } from "next/headers";

export async function getAnonymousId() {
  const headersList = await headers();
  const forwardedFor = headersList.get("x-forwarded-for");
  const realIp = headersList.get("x-real-ip");
  
  // Extract the first IP in the chain, or fallback to real-ip, or a default
  let ip = "127.0.0.1";
  if (forwardedFor) {
    ip = forwardedFor.split(",")[0].trim();
  } else if (realIp) {
    ip = realIp.trim();
  }
  
  // Clean up IPv6 mapped IPv4 or other weird formatting to ensure valid ID
  const safeIp = ip.replace(/[^a-zA-Z0-9.]/g, "_");
  
  return `anon_${safeIp}`;
}
