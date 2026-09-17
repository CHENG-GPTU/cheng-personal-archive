import { getOwnerUser } from "./owner-auth";

export async function getAipmIdentity() {
  const user = await getOwnerUser();
  if (!user) return null;
  return { ...user, ownerId: process.env.AIPM_OWNER_ID?.trim() || "primary-owner" };
}
