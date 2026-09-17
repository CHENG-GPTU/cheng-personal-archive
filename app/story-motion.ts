/** Pure reversible mappings; scrolling never writes learning or personal data. */
export const ARCHIVE_OPEN_DURATION = 2200;
/** The folded center (40% of the full sheet) matches the envelope at every size. */
export function paperTakeoverGeometry(viewportWidth: number, viewportHeight: number, folderWidth: number) {
  const width = Number.isFinite(viewportWidth) && viewportWidth > 0 ? viewportWidth : 1440;
  const height = Number.isFinite(viewportHeight) && viewportHeight > 0 ? viewportHeight : 900;
  const envelope = Number.isFinite(folderWidth) && folderWidth > 0 ? folderWidth : Math.min(width * 0.42, height * 0.72);
  const foldedWidth = envelope * 0.64;
  const foldedHeight = foldedWidth / Math.SQRT1_2;
  return { scaleX: foldedWidth / (width * 0.4), scaleY: foldedHeight / height, startY: height * 0.025, liftY: -Math.min(height * 0.12, foldedHeight * 0.24) };
}
export function clampProgress(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
}
export function chapterAtProgress(progress: number, count: number) {
  if (count <= 1) return 0;
  return Math.min(count - 1, Math.floor(clampProgress((progress - 0.14) / 0.86) * count));
}
export function progressForChapter(index: number, count: number) {
  if (count <= 1) return 0;
  const safeIndex = Math.max(0, Math.min(count - 1, index));
  return 0.14 + (safeIndex + 0.35) / count * 0.86;
}

/** Short transitions at the edges; the middle 60% stays still for reading. */
export function chapterMotion(progress: number, count: number) {
  const index = chapterAtProgress(progress, count);
  const local = count <= 1 ? 0.5 : clampProgress(clampProgress((progress - 0.14) / 0.86) * count - index);
  const offset = local < 0.2 ? 30 * (1 - local / 0.2) : local > 0.8 ? -24 * (local - 0.8) / 0.2 : 0;
  return { index, local, offset };
}
