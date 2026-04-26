import { auth, currentUser } from "@clerk/nextjs/server";

export async function getAuthSession() {
  const session = await auth();
  return session;
}

export async function getUserDetails() {
  const user = await currentUser();
  return user;
}
