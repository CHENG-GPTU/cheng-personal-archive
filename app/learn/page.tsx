import { ownerSignOutPath, requireOwnerUser } from "../owner-auth";
import AipmGame from "./aipm-game";

export const dynamic = "force-dynamic";

export default async function LearnPage() {
  const user = await requireOwnerUser("/learn");
  return <AipmGame displayName={user.displayName} signOutPath={ownerSignOutPath("/")} />;
}
