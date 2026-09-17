"use client";

export type PersonalMediaKind = "portfolio" | "prototype" | "outfit";

export interface PersonalMediaAsset {
  id: string;
  kind: PersonalMediaKind;
  title: string;
  note: string;
  tags: string[];
  originalName: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  bytes: number;
  width: number;
  height: number;
  createdAt: string;
  updatedAt: string;
  blob: Blob;
}

export type PersonalMediaMetadataPatch = Partial<
  Pick<PersonalMediaAsset, "title" | "note" | "tags">
>;

export interface PersonalMediaStorageStatus {
  usage: number | null;
  quota: number | null;
  persistent: boolean | null;
}

const DATABASE_NAME = "aipm-personal-studio-v1";
const DATABASE_VERSION = 1;
const MEDIA_STORE = "media-assets";
const MEDIA_CHANGE_EVENT = "aipm-personal-media-change";

let databasePromise: Promise<IDBDatabase> | null = null;

function assertIndexedDbAvailable() {
  if (typeof window === "undefined" || typeof window.indexedDB === "undefined") {
    throw new Error("当前浏览器没有开放设备本地媒体存储。请使用最新版 Chrome、Edge 或 Safari。 ");
  }
}

function openDatabase() {
  assertIndexedDbAvailable();
  if (databasePromise) return databasePromise;

  databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    let settled = false;

    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      databasePromise = null;
      reject(error);
    };

    request.onupgradeneeded = () => {
      const database = request.result;
      if (database.objectStoreNames.contains(MEDIA_STORE)) return;

      const store = database.createObjectStore(MEDIA_STORE, { keyPath: "id" });
      store.createIndex("kind", "kind", { unique: false });
      store.createIndex("createdAt", "createdAt", { unique: false });
      store.createIndex("updatedAt", "updatedAt", { unique: false });
    };

    request.onsuccess = () => {
      const database = request.result;
      if (settled) {
        // A blocked request can still succeed after its caller received an
        // error. Close that late connection so it cannot block future upgrades.
        database.close();
        return;
      }
      settled = true;
      database.onversionchange = () => {
        database.close();
        databasePromise = null;
      };
      resolve(database);
    };
    request.onerror = () => {
      fail(request.error ?? new Error("无法打开设备本地媒体库。"));
    };
    request.onblocked = () => {
      fail(new Error("媒体库正在另一个页面中升级。关闭其他页面后重试。"));
    };
  });

  return databasePromise;
}

function requestResult<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("设备本地存储操作失败。"));
  });
}

function transactionComplete(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("设备本地存储事务失败。"));
    transaction.onabort = () => reject(transaction.error ?? new Error("设备本地存储事务已取消。"));
  });
}

export function announcePersonalMediaStoreChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(MEDIA_CHANGE_EVENT));
  }
}

export function createPersonalMediaId(kind: PersonalMediaKind) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${kind}-${crypto.randomUUID()}`;
  }
  return `${kind}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function savePersonalMediaAsset(
  asset: PersonalMediaAsset,
  options: { notify?: boolean } = {},
) {
  const database = await openDatabase();
  const transaction = database.transaction(MEDIA_STORE, "readwrite");
  transaction.objectStore(MEDIA_STORE).put(asset);
  await transactionComplete(transaction);
  if (options.notify !== false) announcePersonalMediaStoreChange();
  return asset;
}

export async function listPersonalMediaAssets(kind?: PersonalMediaKind) {
  const database = await openDatabase();
  const transaction = database.transaction(MEDIA_STORE, "readonly");
  const records = await requestResult(
    transaction.objectStore(MEDIA_STORE).getAll() as IDBRequest<PersonalMediaAsset[]>,
  );
  await transactionComplete(transaction);

  return records
    .filter((record) => !kind || record.kind === kind)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export async function updatePersonalMediaMetadata(
  id: string,
  patch: PersonalMediaMetadataPatch,
) {
  const database = await openDatabase();
  const transaction = database.transaction(MEDIA_STORE, "readwrite");
  const store = transaction.objectStore(MEDIA_STORE);
  const current = await requestResult(
    store.get(id) as IDBRequest<PersonalMediaAsset | undefined>,
  );

  if (!current) {
    transaction.abort();
    throw new Error("这项资料已经不存在。刷新页面后再试。 ");
  }

  const next: PersonalMediaAsset = {
    ...current,
    ...patch,
    tags: patch.tags ? patch.tags.map((tag) => tag.trim()).filter(Boolean).slice(0, 12) : current.tags,
    updatedAt: new Date().toISOString(),
  };
  store.put(next);
  await transactionComplete(transaction);
  announcePersonalMediaStoreChange();
  return next;
}

export async function deletePersonalMediaAsset(id: string) {
  const database = await openDatabase();
  const transaction = database.transaction(MEDIA_STORE, "readwrite");
  transaction.objectStore(MEDIA_STORE).delete(id);
  await transactionComplete(transaction);
  announcePersonalMediaStoreChange();
}

export function subscribeToPersonalMediaStore(callback: () => void) {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(MEDIA_CHANGE_EVENT, callback);
  return () => window.removeEventListener(MEDIA_CHANGE_EVENT, callback);
}

export async function getPersonalMediaStorageStatus(): Promise<PersonalMediaStorageStatus> {
  if (typeof navigator === "undefined" || !navigator.storage) {
    return { usage: null, quota: null, persistent: null };
  }

  const [estimate, persistent] = await Promise.all([
    navigator.storage.estimate().catch(() => ({ usage: undefined, quota: undefined })),
    navigator.storage.persisted?.().catch(() => false) ?? Promise.resolve(false),
  ]);

  return {
    usage: typeof estimate.usage === "number" ? estimate.usage : null,
    quota: typeof estimate.quota === "number" ? estimate.quota : null,
    persistent,
  };
}

export async function requestPersonalMediaPersistence() {
  if (typeof navigator === "undefined" || !navigator.storage?.persist) return false;
  return navigator.storage.persist().catch(() => false);
}

export async function exportPersonalStudioMetadata() {
  const assets = await listPersonalMediaAssets();
  return JSON.stringify(
    {
      format: "aipm-personal-studio-metadata",
      version: 1,
      exportedAt: new Date().toISOString(),
      containsPhotos: false,
      note: "这份清单不包含图片。图片仍只保存在导出时所用设备与浏览器中。",
      items: assets.map(({ blob, ...metadata }) => {
        void blob;
        return metadata;
      }),
    },
    null,
    2,
  );
}
