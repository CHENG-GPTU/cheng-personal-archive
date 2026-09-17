import { and, asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getAipmIdentity } from "../../../aipm-identity";
import { ensureAipmSchema, getDb } from "../../../../db";
import { aipmEvidence, aipmLevelRecords, aipmMessages, aipmProfiles } from "../../../../db/schema";
import { getLocalAipmState, saveLocalAipmDraft, useLocalAipmStore } from "../../../../db/local-aipm-store";

export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json({ error: "请先通过专属访问码进入学习工作台。" }, { status: 401 });
}

async function ensureProfile(ownerId: string) {
  await ensureAipmSchema();
  const db = getDb();
  const now = new Date().toISOString();
  await db.insert(aipmProfiles).values({ ownerId, currentLevel: 1, createdAt: now, updatedAt: now }).onConflictDoNothing();
  const [profile] = await db.select().from(aipmProfiles).where(eq(aipmProfiles.ownerId, ownerId)).limit(1);
  return profile;
}

export async function GET(request: Request) {
  const identity = await getAipmIdentity();
  if (!identity) return unauthorized();
  const url = new URL(request.url);
  const requestedLevel = Number(url.searchParams.get("level")) || undefined;
  if (useLocalAipmStore()) return NextResponse.json(await getLocalAipmState(identity.ownerId, requestedLevel));
  const db = getDb();
  const profile = await ensureProfile(identity.ownerId);
  const levelId = Math.min(30, Math.max(1, requestedLevel || profile.currentLevel));
  const [records, evidence, messages] = await Promise.all([
    db.select().from(aipmLevelRecords).where(eq(aipmLevelRecords.ownerId, identity.ownerId)).orderBy(asc(aipmLevelRecords.levelId)),
    db.select().from(aipmEvidence).where(eq(aipmEvidence.ownerId, identity.ownerId)).orderBy(asc(aipmEvidence.levelId)),
    db.select().from(aipmMessages).where(and(eq(aipmMessages.ownerId, identity.ownerId), eq(aipmMessages.levelId, levelId))).orderBy(asc(aipmMessages.createdAt)).limit(60),
  ]);
  return NextResponse.json({ currentLevel: profile.currentLevel, records, evidence, messages });
}

export async function PUT(request: Request) {
  const identity = await getAipmIdentity();
  if (!identity) return unauthorized();
  const body = await request.json().catch(() => null) as { levelId?: number; draft?: string } | null;
  const levelId = Number(body?.levelId);
  const draft = typeof body?.draft === "string" ? body.draft.slice(0, 24_000) : "";
  if (!Number.isInteger(levelId) || levelId < 1 || levelId > 30) {
    return NextResponse.json({ error: "关卡编号无效。" }, { status: 400 });
  }
  if (useLocalAipmStore()) {
    const saved = await saveLocalAipmDraft(identity.ownerId, levelId, draft);
    return saved ? NextResponse.json({ ok: true, updatedAt: new Date().toISOString() }) : NextResponse.json({ error: "该关卡尚未解锁。" }, { status: 403 });
  }
  const profile = await ensureProfile(identity.ownerId);
  if (levelId > profile.currentLevel) {
    return NextResponse.json({ error: "该关卡尚未解锁。" }, { status: 403 });
  }
  const db = getDb();
  const now = new Date().toISOString();
  await db.insert(aipmLevelRecords).values({ ownerId: identity.ownerId, levelId, draft, status: "open", updatedAt: now }).onConflictDoUpdate({
    target: [aipmLevelRecords.ownerId, aipmLevelRecords.levelId],
    set: { draft, updatedAt: now },
  });
  return NextResponse.json({ ok: true, updatedAt: now });
}
