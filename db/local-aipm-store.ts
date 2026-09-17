import "server-only";

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export type LocalAipmProfile = {
  ownerId: string;
  currentLevel: number;
  createdAt: string;
  updatedAt: string;
};

export type LocalAipmRecord = {
  ownerId: string;
  levelId: number;
  status: string;
  draft: string;
  scoreJson: string | null;
  feedback: string | null;
  evidence: string | null;
  passedAt: string | null;
  updatedAt: string;
};

export type LocalAipmMessage = {
  id: string;
  ownerId: string;
  levelId: number;
  role: string;
  content: string;
  createdAt: string;
};

export type LocalAipmEvidence = {
  id: string;
  ownerId: string;
  levelId: number;
  project: string;
  title: string;
  content: string;
  publicSelected: boolean;
  createdAt: string;
  updatedAt: string;
};

type LocalAipmData = {
  profiles: LocalAipmProfile[];
  records: LocalAipmRecord[];
  messages: LocalAipmMessage[];
  evidence: LocalAipmEvidence[];
};

const emptyData = (): LocalAipmData => ({ profiles: [], records: [], messages: [], evidence: [] });
const dataFile = () => join(process.cwd(), ".local", "aipm-data.json");
let writeQueue: Promise<unknown> = Promise.resolve();

export function useLocalAipmStore() {
  const configured = process.env.AIPM_STORAGE_MODE?.trim().toLowerCase();
  if (configured === "cloud") return false;
  if (configured === "local") return true;
  return !process.env.VERCEL;
}

async function readData() {
  try {
    const parsed = JSON.parse(await readFile(dataFile(), "utf8")) as Partial<LocalAipmData>;
    return {
      profiles: Array.isArray(parsed.profiles) ? parsed.profiles : [],
      records: Array.isArray(parsed.records) ? parsed.records : [],
      messages: Array.isArray(parsed.messages) ? parsed.messages : [],
      evidence: Array.isArray(parsed.evidence) ? parsed.evidence : [],
    } satisfies LocalAipmData;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return emptyData();
    throw error;
  }
}

async function updateData<T>(change: (data: LocalAipmData) => T | Promise<T>) {
  const operation = writeQueue.then(async () => {
    const data = await readData();
    const result = await change(data);
    const file = dataFile();
    const temporary = `${file}.tmp`;
    await mkdir(dirname(file), { recursive: true });
    await writeFile(temporary, JSON.stringify(data, null, 2), "utf8");
    await rename(temporary, file);
    return result;
  });
  writeQueue = operation.catch(() => undefined);
  return operation;
}

function ensureProfile(data: LocalAipmData, ownerId: string) {
  let profile = data.profiles.find((item) => item.ownerId === ownerId);
  if (!profile) {
    const now = new Date().toISOString();
    profile = { ownerId, currentLevel: 1, createdAt: now, updatedAt: now };
    data.profiles.push(profile);
  }
  return profile;
}

export function getLocalAipmState(ownerId: string, requestedLevel?: number) {
  return updateData((data) => {
    const profile = ensureProfile(data, ownerId);
    const levelId = Math.min(30, Math.max(1, requestedLevel || profile.currentLevel));
    return {
      currentLevel: profile.currentLevel,
      records: data.records.filter((item) => item.ownerId === ownerId).sort((a, b) => a.levelId - b.levelId),
      evidence: data.evidence.filter((item) => item.ownerId === ownerId).sort((a, b) => a.levelId - b.levelId),
      messages: data.messages
        .filter((item) => item.ownerId === ownerId && item.levelId === levelId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .slice(-60),
    };
  });
}

export function saveLocalAipmDraft(ownerId: string, levelId: number, draft: string) {
  return updateData((data) => {
    const profile = ensureProfile(data, ownerId);
    if (levelId > profile.currentLevel) return false;
    const now = new Date().toISOString();
    const record = data.records.find((item) => item.ownerId === ownerId && item.levelId === levelId);
    if (record) Object.assign(record, { draft, status: "open", updatedAt: now });
    else data.records.push({ ownerId, levelId, draft, status: "open", scoreJson: null, feedback: null, evidence: null, passedAt: null, updatedAt: now });
    return true;
  });
}

export function saveLocalAipmMessage(ownerId: string, levelId: number, role: "user" | "assistant", content: string) {
  return updateData((data) => {
    ensureProfile(data, ownerId);
    data.messages.push({ id: crypto.randomUUID(), ownerId, levelId, role, content, createdAt: new Date().toISOString() });
  });
}

export function saveLocalAipmEvaluation({
  ownerId,
  levelId,
  draft,
  scoreJson,
  feedback,
  passed,
  project,
  title,
}: {
  ownerId: string;
  levelId: number;
  draft: string;
  scoreJson: string;
  feedback: string;
  passed: boolean;
  project: string;
  title: string;
}) {
  return updateData((data) => {
    const profile = ensureProfile(data, ownerId);
    const now = new Date().toISOString();
    const values = {
      status: passed ? "passed" : "revise",
      draft,
      scoreJson,
      feedback,
      evidence: passed ? draft : null,
      passedAt: passed ? now : null,
      updatedAt: now,
    };
    const record = data.records.find((item) => item.ownerId === ownerId && item.levelId === levelId);
    if (record) Object.assign(record, values);
    else data.records.push({ ownerId, levelId, ...values });

    if (passed) {
      profile.currentLevel = Math.min(30, Math.max(profile.currentLevel, levelId + 1));
      profile.updatedAt = now;
      const id = `${ownerId}-${levelId}`;
      const evidence = data.evidence.find((item) => item.id === id);
      if (evidence) Object.assign(evidence, { title, content: draft, updatedAt: now });
      else data.evidence.push({ id, ownerId, levelId, project, title, content: draft, publicSelected: false, createdAt: now, updatedAt: now });
    }
    return profile.currentLevel;
  });
}
