"use client";

/* Runtime Blob URLs cannot be passed through the Next image optimizer. */
/* eslint-disable @next/next/no-img-element */

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import {
  announcePersonalMediaStoreChange,
  createPersonalMediaId,
  deletePersonalMediaAsset,
  exportPersonalStudioMetadata,
  getPersonalMediaStorageStatus,
  listPersonalMediaAssets,
  requestPersonalMediaPersistence,
  savePersonalMediaAsset,
  subscribeToPersonalMediaStore,
  updatePersonalMediaMetadata,
  type PersonalMediaAsset,
  type PersonalMediaKind,
  type PersonalMediaMetadataPatch,
  type PersonalMediaStorageStatus,
} from "./personal-media-store";
import {
  PERSONAL_IMAGE_ACCEPT,
  personalImageErrorMessage,
  sanitizePersonalImage,
} from "./personal-image-safety";
import "./personal-studio.css";

export type PersonalStudioTab = PersonalMediaKind;

interface PersonalStudioProps {
  onHome?: () => void;
  initialTab?: PersonalStudioTab;
}

interface DisplayMediaAsset extends PersonalMediaAsset {
  objectUrl: string;
}

const tabs: Array<{
  id: PersonalStudioTab;
  label: string;
  english: string;
}> = [
  { id: "portfolio", label: "作品集", english: "PORTFOLIO" },
  { id: "prototype", label: "原型", english: "PROTOTYPE" },
  { id: "outfit", label: "穿搭审美", english: "MIRROR" },
];

const emptyStorageStatus: PersonalMediaStorageStatus = {
  usage: null,
  quota: null,
  persistent: null,
};

function formatBytes(bytes: number | null) {
  if (bytes === null) return "—";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "本地记录";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function fileTitle(name: string) {
  return name.replace(/\.[^.]+$/, "").trim() || "未命名资料";
}

function UploadControl({
  kind,
  busy,
  onFiles,
  compact = false,
}: {
  kind: PersonalMediaKind;
  busy: boolean;
  compact?: boolean;
  onFiles: (files: File[], kind: PersonalMediaKind) => void;
}) {
  return (
    <label className={`studio-upload${compact ? " studio-upload--compact" : ""}`}>
      <input
        type="file"
        accept={PERSONAL_IMAGE_ACCEPT}
        multiple
        disabled={busy}
        onChange={(event) => {
          const files = Array.from(event.currentTarget.files ?? []);
          event.currentTarget.value = "";
          if (files.length > 0) onFiles(files, kind);
        }}
      />
      <span>{busy ? "正在安全处理…" : "选择本地图片"}</span>
      <i aria-hidden="true">＋</i>
    </label>
  );
}

function AssetEditor({
  asset,
  noteLabel,
  onSave,
}: {
  asset: DisplayMediaAsset;
  noteLabel: string;
  onSave: (id: string, patch: PersonalMediaMetadataPatch) => void;
}) {
  const [title, setTitle] = useState(asset.title);
  const [note, setNote] = useState(asset.note);
  const [tags, setTags] = useState(asset.tags.join("，"));

  return (
    <div className="studio-asset-editor">
      <label>
        <span>标题</span>
        <input
          value={title}
          maxLength={80}
          onChange={(event) => setTitle(event.target.value)}
          onBlur={() => onSave(asset.id, { title: title.trim() || "未命名资料" })}
        />
      </label>
      <label>
        <span>{noteLabel}</span>
        <textarea
          value={note}
          maxLength={600}
          rows={3}
          placeholder="写下判断、取舍或下一步。"
          onChange={(event) => setNote(event.target.value)}
          onBlur={() => onSave(asset.id, { note: note.trim() })}
        />
      </label>
      <label>
        <span>标签 · 用逗号分隔</span>
        <input
          value={tags}
          maxLength={160}
          placeholder="研究，线框，已验证"
          onChange={(event) => setTags(event.target.value)}
          onBlur={() => onSave(asset.id, {
            tags: tags.split(/[,，]/).map((tag) => tag.trim()).filter(Boolean),
          })}
        />
      </label>
    </div>
  );
}

function StudioEmpty({
  mark,
  title,
  description,
  kind,
  busy,
  onFiles,
}: {
  mark: string;
  title: string;
  description: string;
  kind: PersonalMediaKind;
  busy: boolean;
  onFiles: (files: File[], kind: PersonalMediaKind) => void;
}) {
  return (
    <div className="studio-empty">
      <span aria-hidden="true">{mark}</span>
      <div>
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
      <UploadControl kind={kind} busy={busy} onFiles={onFiles} />
    </div>
  );
}

export default function PersonalStudio({
  onHome,
  initialTab = "portfolio",
}: PersonalStudioProps) {
  const [activeTab, setActiveTab] = useState<PersonalStudioTab>(initialTab);
  const [assets, setAssets] = useState<DisplayMediaAsset[]>([]);
  const [storeReady, setStoreReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("正在检查设备本地媒体库…");
  const [storageStatus, setStorageStatus] = useState(emptyStorageStatus);
  const [selectedPrototypeId, setSelectedPrototypeId] = useState("");
  const [selectedOutfitId, setSelectedOutfitId] = useState("");

  useEffect(() => {
    let disposed = false;
    let generation = 0;
    const objectUrlsByAssetId = new Map<string, string>();

    const refresh = async () => {
      const currentGeneration = ++generation;
      try {
        const [records, nextStorageStatus] = await Promise.all([
          listPersonalMediaAssets(),
          getPersonalMediaStorageStatus(),
        ]);
        if (disposed || currentGeneration !== generation) return;

        const activeAssetIds = new Set(records.map((record) => record.id));
        const nextAssets = records.map((record) => {
          const currentUrl = objectUrlsByAssetId.get(record.id);
          const objectUrl = currentUrl ?? URL.createObjectURL(record.blob);
          if (!currentUrl) objectUrlsByAssetId.set(record.id, objectUrl);
          return { ...record, objectUrl };
        });
        setAssets(nextAssets);
        objectUrlsByAssetId.forEach((url, id) => {
          if (activeAssetIds.has(id)) return;
          objectUrlsByAssetId.delete(id);
          window.requestAnimationFrame(() => URL.revokeObjectURL(url));
        });
        setStorageStatus(nextStorageStatus);
        setStoreReady(true);
        setNotice("");
      } catch (error) {
        if (disposed) return;
        setStoreReady(false);
        setNotice(personalImageErrorMessage(error));
      }
    };

    void refresh();
    const unsubscribe = subscribeToPersonalMediaStore(() => void refresh());
    return () => {
      disposed = true;
      generation += 1;
      unsubscribe();
      objectUrlsByAssetId.forEach((url) => URL.revokeObjectURL(url));
      objectUrlsByAssetId.clear();
    };
  }, []);

  const portfolioAssets = useMemo(
    () => assets.filter((asset) => asset.kind === "portfolio"),
    [assets],
  );
  const prototypeAssets = useMemo(
    () => assets
      .filter((asset) => asset.kind === "prototype")
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt)),
    [assets],
  );
  const outfitAssets = useMemo(
    () => assets.filter((asset) => asset.kind === "outfit"),
    [assets],
  );

  const selectedPrototype =
    prototypeAssets.find((asset) => asset.id === selectedPrototypeId) ?? prototypeAssets[0] ?? null;
  const selectedOutfit =
    outfitAssets.find((asset) => asset.id === selectedOutfitId) ?? outfitAssets[0] ?? null;

  const saveMetadata = useCallback(async (id: string, patch: PersonalMediaMetadataPatch) => {
    try {
      await updatePersonalMediaMetadata(id, patch);
      setNotice("资料说明已保存在当前浏览器。");
    } catch (error) {
      setNotice(personalImageErrorMessage(error));
    }
  }, []);

  const addFiles = useCallback(async (files: File[], kind: PersonalMediaKind) => {
    if (!storeReady) {
      setNotice("设备本地媒体库尚未就绪。请根据上方提示检查浏览器设置。 ");
      return;
    }
    if (busy) return;
    setBusy(true);
    setNotice(
      files.length > 20
        ? `本次只处理前 20 张图片；图片不会上传到服务器。`
        : `正在处理 ${files.length} 张图片；图片不会上传到服务器。`,
    );
    const errors: string[] = [];
    let savedCount = 0;
    let lastSavedId = "";

    for (const file of files.slice(0, 20)) {
      try {
        const safeImage = await sanitizePersonalImage(file, kind);
        const now = new Date().toISOString();
        const asset: PersonalMediaAsset = {
          id: createPersonalMediaId(kind),
          kind,
          title: fileTitle(safeImage.originalName),
          note: "",
          tags: [],
          originalName: safeImage.originalName,
          mimeType: safeImage.mimeType,
          bytes: safeImage.sanitizedBytes,
          width: safeImage.width,
          height: safeImage.height,
          createdAt: now,
          updatedAt: now,
          blob: safeImage.blob,
        };
        await savePersonalMediaAsset(asset, { notify: false });
        lastSavedId = asset.id;
        savedCount += 1;
      } catch (error) {
        errors.push(`${file.name}：${personalImageErrorMessage(error)}`);
      }
    }

    if (savedCount > 0) announcePersonalMediaStoreChange();
    if (lastSavedId && kind === "prototype") setSelectedPrototypeId(lastSavedId);
    if (lastSavedId && kind === "outfit") setSelectedOutfitId(lastSavedId);
    if (savedCount > 0) void requestPersonalMediaPersistence();
    setBusy(false);
    setNotice(
      errors.length > 0
        ? `已保存 ${savedCount} 张。${errors.slice(0, 2).join("；")}`
        : `已将 ${savedCount} 张安全处理后的图片保存在当前浏览器。`,
    );
  }, [busy, storeReady]);

  const removeAsset = useCallback(async (asset: DisplayMediaAsset) => {
    if (!window.confirm(`删除“${asset.title}”？这会同时删除当前浏览器里的图片，且无法撤销。`)) return;
    try {
      await deletePersonalMediaAsset(asset.id);
      setNotice(`已从当前浏览器删除“${asset.title}”。`);
    } catch (error) {
      setNotice(personalImageErrorMessage(error));
    }
  }, []);

  const requestPersistence = useCallback(async () => {
    const granted = await requestPersonalMediaPersistence();
    setStorageStatus(await getPersonalMediaStorageStatus());
    setNotice(
      granted
        ? "浏览器已尽量保留这套本地资料；主动清理网站数据仍会删除它。"
        : "浏览器未授予稳定保存。请定期导出资料清单，并保留原图。",
    );
  }, []);

  const downloadMetadata = useCallback(async () => {
    try {
      const json = await exportPersonalStudioMetadata();
      const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `personal-studio-metadata-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
      setNotice("资料清单已导出。清单不包含照片，请继续保留原图。 ");
    } catch (error) {
      setNotice(personalImageErrorMessage(error));
    }
  }, []);

  const updateMirrorLight = (event: PointerEvent<HTMLDivElement>) => {
    const mirror = event.currentTarget;
    const bounds = mirror.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
    const y = Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height));
    mirror.style.setProperty("--mirror-x", `${x * 100}%`);
    mirror.style.setProperty("--mirror-y", `${y * 100}%`);
    mirror.style.setProperty("--mirror-rotate-x", `${(0.5 - y) * 3.2}deg`);
    mirror.style.setProperty("--mirror-rotate-y", `${(x - 0.5) * 4.2}deg`);
  };

  const resetMirrorLight = (event: PointerEvent<HTMLDivElement>) => {
    const mirror = event.currentTarget;
    mirror.style.setProperty("--mirror-x", "50%");
    mirror.style.setProperty("--mirror-y", "38%");
    mirror.style.setProperty("--mirror-rotate-x", "0deg");
    mirror.style.setProperty("--mirror-rotate-y", "0deg");
  };

  const changeOutfitByKeyboard = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    if (outfitAssets.length < 2 || !selectedOutfit) return;
    event.preventDefault();
    const currentIndex = outfitAssets.findIndex((asset) => asset.id === selectedOutfit.id);
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const nextIndex = (currentIndex + direction + outfitAssets.length) % outfitAssets.length;
    setSelectedOutfitId(outfitAssets[nextIndex].id);
  };

  const changeTabByKeyboard = (
    event: KeyboardEvent<HTMLButtonElement>,
    currentIndex: number,
  ) => {
    let nextIndex = currentIndex;
    if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % tabs.length;
    else if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = tabs.length - 1;
    else return;

    event.preventDefault();
    const nextTab = tabs[nextIndex];
    setActiveTab(nextTab.id);
    window.requestAnimationFrame(() => {
      document.getElementById(`studio-tab-${nextTab.id}`)?.focus();
    });
  };

  return (
    <main className="personal-studio">
      <header className="studio-header">
        <div className="studio-brand">
          <span>PERSONAL / STUDIO</span>
          <strong>个人创作工作台</strong>
        </div>
        <nav className="studio-tabs" role="tablist" aria-label="创作工作台分类">
          {tabs.map((tab, index) => (
            <button
              key={tab.id}
              id={`studio-tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`studio-panel-${tab.id}`}
              tabIndex={activeTab === tab.id ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={(event) => changeTabByKeyboard(event, index)}
            >
              <small>{tab.english}</small>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
        <div className="studio-header-actions">
          <button type="button" onClick={downloadMetadata}>导出资料清单</button>
          {onHome ? <button type="button" onClick={onHome}>返回首页</button> : null}
        </div>
      </header>

      <section className="studio-privacy" aria-label="本地保存说明">
        <div>
          <i aria-hidden="true" />
          <strong>仅保存在当前设备 / 当前浏览器</strong>
          <span>请固定使用同一个可访问网址；不同网址之间的数据不互通。本地资料未加密，共享设备请勿保存敏感照片。</span>
        </div>
        <div className="studio-storage-meter">
          <span>LOCAL STORAGE</span>
          <strong>{formatBytes(storageStatus.usage)}</strong>
          <small>/ {formatBytes(storageStatus.quota)}</small>
        </div>
        <button type="button" onClick={requestPersistence}>
          {storageStatus.persistent ? "已申请稳定保存" : "申请稳定保存"}
        </button>
      </section>

      <div className="studio-notice" role="status" aria-live="polite">
        <span>{notice || "JPEG / PNG / WebP · 自动移除图片中的 EXIF 与定位信息"}</span>
        <small>资料清单不包含照片，不能替代原图备份。</small>
      </div>

      {tabs.filter((tab) => tab.id !== activeTab).map((tab) => (
        <div
          key={tab.id}
          id={`studio-panel-${tab.id}`}
          role="tabpanel"
          aria-labelledby={`studio-tab-${tab.id}`}
          hidden
        />
      ))}

      {activeTab === "portfolio" ? (
        <section
          id="studio-panel-portfolio"
          className="studio-panel studio-portfolio"
          role="tabpanel"
          aria-labelledby="studio-tab-portfolio"
        >
          <header className="studio-panel-heading">
            <div>
              <p>EVIDENCE, NOT DECORATION</p>
              <h1>让每一张图，<br />都回答一个招聘问题。</h1>
            </div>
            <div className="studio-panel-intro">
              <span>{String(portfolioAssets.length).padStart(2, "0")} EVIDENCE CARDS</span>
              <p>上传原型截图、研究结论或项目证据，再补充你当时的判断与取舍。这里不自动公开任何内容。</p>
              <UploadControl kind="portfolio" busy={busy} onFiles={addFiles} compact />
            </div>
          </header>

          {portfolioAssets.length === 0 ? (
            <StudioEmpty
              mark="P"
              title="从一张真正能证明能力的图开始。"
              description="例如：标注过的用户流程、原型关键页或一次测试后的修改对比。"
              kind="portfolio"
              busy={busy}
              onFiles={addFiles}
            />
          ) : (
            <div className="studio-portfolio-grid">
              {portfolioAssets.map((asset, index) => (
                <article className="studio-portfolio-card" key={asset.id}>
                  <figure>
                    <img src={asset.objectUrl} alt={asset.title} loading="lazy" />
                    <figcaption>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <small>{asset.width} × {asset.height} · {formatBytes(asset.bytes)}</small>
                    </figcaption>
                  </figure>
                  <AssetEditor
                    key={`${asset.id}-${asset.updatedAt}`}
                    asset={asset}
                    noteLabel="决策与证据"
                    onSave={saveMetadata}
                  />
                  <div className="studio-card-foot">
                    <span>{formatDate(asset.createdAt)}</span>
                    <button type="button" onClick={() => removeAsset(asset)}>删除</button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {activeTab === "prototype" ? (
        <section
          id="studio-panel-prototype"
          className="studio-panel studio-prototype"
          role="tabpanel"
          aria-labelledby="studio-tab-prototype"
        >
          <header className="studio-panel-heading studio-panel-heading--compact">
            <div>
              <p>SCREEN SEQUENCE / SAFE PREVIEW</p>
              <h1>把页面排成一条<br />可以讲清楚的路径。</h1>
            </div>
            <div className="studio-panel-intro">
              <span>IMAGE-ONLY PROTOTYPE</span>
              <p>这里只展示你上传的页面图，不读取也不执行 HTML、JavaScript 或其他网页代码。</p>
              <UploadControl kind="prototype" busy={busy} onFiles={addFiles} compact />
            </div>
          </header>

          {prototypeAssets.length === 0 ? (
            <StudioEmpty
              mark="→"
              title="按用户完成任务的顺序上传页面。"
              description="从入口、关键操作到结果页；每张图写明它要验证的问题。"
              kind="prototype"
              busy={busy}
              onFiles={addFiles}
            />
          ) : (
            <div className="studio-prototype-workbench">
              <div className="studio-prototype-preview">
                {selectedPrototype ? (
                  <>
                    <div className="studio-prototype-canvas">
                      <img src={selectedPrototype.objectUrl} alt={selectedPrototype.title} />
                      <span>SAFE IMAGE PREVIEW</span>
                    </div>
                    <AssetEditor
                      key={`${selectedPrototype.id}-${selectedPrototype.updatedAt}`}
                      asset={selectedPrototype}
                      noteLabel="这个页面要验证什么"
                      onSave={saveMetadata}
                    />
                    <div className="studio-card-foot">
                      <span>{selectedPrototype.width} × {selectedPrototype.height}</span>
                      <button type="button" onClick={() => removeAsset(selectedPrototype)}>删除当前页</button>
                    </div>
                  </>
                ) : null}
              </div>
              <ol className="studio-storyboard" aria-label="原型页面顺序">
                {prototypeAssets.map((asset, index) => (
                  <li key={asset.id}>
                    <button
                      type="button"
                      aria-current={asset.id === selectedPrototype?.id ? "step" : undefined}
                      onClick={() => setSelectedPrototypeId(asset.id)}
                    >
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <img src={asset.objectUrl} alt="" loading="lazy" />
                      <strong>{asset.title}</strong>
                    </button>
                    {index < prototypeAssets.length - 1 ? <i aria-hidden="true">↓</i> : null}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </section>
      ) : null}

      {activeTab === "outfit" ? (
        <section
          id="studio-panel-outfit"
          className="studio-panel studio-outfit"
          role="tabpanel"
          aria-labelledby="studio-tab-outfit"
        >
          <header className="studio-outfit-heading">
            <div>
              <p>STYLE MEMORY / PRIVATE MIRROR</p>
              <h1>不是收藏穿搭，<br />是看见自己的选择。</h1>
            </div>
            <UploadControl kind="outfit" busy={busy} onFiles={addFiles} compact />
          </header>

          <div className="studio-outfit-workbench">
            <div
              className={`studio-mirror${selectedOutfit ? " has-image" : ""}`}
              role="group"
              tabIndex={0}
              aria-label={selectedOutfit ? `镜面查看：${selectedOutfit.title}。可用左右方向键切换。` : "空的穿搭镜面"}
              onPointerMove={updateMirrorLight}
              onPointerLeave={resetMirrorLight}
              onKeyDown={changeOutfitByKeyboard}
            >
              <div className="studio-mirror-rim" aria-hidden="true" />
              <div className="studio-mirror-glass">
                {selectedOutfit ? (
                  <img src={selectedOutfit.objectUrl} alt={selectedOutfit.title} />
                ) : (
                  <div className="studio-mirror-empty">
                    <span>YOUR<br />LOOK</span>
                    <p>上传一张穿搭照片<br />镜面才会记住今天。</p>
                  </div>
                )}
                <i className="studio-mirror-light" aria-hidden="true" />
                <i className="studio-mirror-scan" aria-hidden="true" />
              </div>
              <div className="studio-mirror-caption">
                <span>MIRROR / {String(outfitAssets.length).padStart(2, "0")}</span>
                <small>{selectedOutfit ? formatDate(selectedOutfit.createdAt) : "LOCAL ARCHIVE"}</small>
              </div>
            </div>

            <aside className="studio-outfit-archive">
              <div className="studio-outfit-current">
                <span>CURRENT LOOK</span>
                {selectedOutfit ? (
                  <>
                    <AssetEditor
                      key={`${selectedOutfit.id}-${selectedOutfit.updatedAt}`}
                      asset={selectedOutfit}
                      noteLabel="今天哪里成立 / 哪里不成立"
                      onSave={saveMetadata}
                    />
                    <div className="studio-card-foot">
                      <span>{selectedOutfit.width} × {selectedOutfit.height} · {formatBytes(selectedOutfit.bytes)}</span>
                      <button type="button" onClick={() => removeAsset(selectedOutfit)}>删除这套</button>
                    </div>
                  </>
                ) : (
                  <p>建议记录轮廓、比例、材质和场景，而不只写“好看”或“不好看”。</p>
                )}
              </div>
              <div className="studio-outfit-strip" aria-label="穿搭照片列表">
                {outfitAssets.map((asset, index) => (
                  <button
                    key={asset.id}
                    type="button"
                    aria-pressed={asset.id === selectedOutfit?.id}
                    onClick={() => setSelectedOutfitId(asset.id)}
                  >
                    <img src={asset.objectUrl} alt="" loading="lazy" />
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <strong>{asset.title}</strong>
                  </button>
                ))}
                <UploadControl kind="outfit" busy={busy} onFiles={addFiles} compact />
              </div>
            </aside>
          </div>
        </section>
      ) : null}

      <footer className="studio-footer">
        <span>PERSONAL STUDIO / DEVICE-LOCAL</span>
        <p>上传后只保存经重新编码的图片；原始 EXIF 与定位信息不会进入媒体库。本地资料未加密，清除站点数据会同时删除全部资料。</p>
        <span>NO CLOUD SYNC</span>
      </footer>
    </main>
  );
}
