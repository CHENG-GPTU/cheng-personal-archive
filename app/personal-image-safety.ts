"use client";

import type { PersonalMediaKind } from "./personal-media-store";

export const PERSONAL_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_INPUT_BYTES = 18 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 12 * 1024 * 1024;
const MAX_SOURCE_EDGE = 12_000;
const MAX_SOURCE_PIXELS = 30_000_000;

const OUTPUT_EDGE_BY_KIND: Record<PersonalMediaKind, number> = {
  portfolio: 2_600,
  prototype: 2_600,
  outfit: 2_200,
};

export type SafeImageMimeType = "image/jpeg" | "image/png" | "image/webp";

export interface SafeImageResult {
  blob: Blob;
  originalName: string;
  mimeType: SafeImageMimeType;
  width: number;
  height: number;
  originalBytes: number;
  sanitizedBytes: number;
}

export class PersonalImageSafetyError extends Error {
  constructor(
    public readonly code:
      | "unsupported-type"
      | "empty-file"
      | "input-too-large"
      | "decode-failed"
      | "dimensions-too-large"
      | "encode-failed"
      | "output-too-large",
    message: string,
  ) {
    super(message);
    this.name = "PersonalImageSafetyError";
  }
}

function safeFileName(name: string, mimeType: SafeImageMimeType) {
  const extension = mimeType === "image/png" ? ".png" : mimeType === "image/webp" ? ".webp" : ".jpg";
  const baseName = name
    .replace(/\.[^.]+$/, "")
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 72) || "未命名图片";
  return `${baseName}${extension}`;
}

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: SafeImageMimeType) {
  return new Promise<Blob>((resolve, reject) => {
    const quality = mimeType === "image/png" ? undefined : 0.9;
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new PersonalImageSafetyError("encode-failed", "浏览器没有完成图片安全处理，请换一张图片。"));
      },
      mimeType,
      quality,
    );
  });
}

export async function sanitizePersonalImage(
  file: File,
  kind: PersonalMediaKind,
): Promise<SafeImageResult> {
  const mimeType = file.type.toLowerCase() as SafeImageMimeType;

  if (!ALLOWED_IMAGE_TYPES.has(mimeType)) {
    throw new PersonalImageSafetyError(
      "unsupported-type",
      "仅支持 JPEG、PNG 或 WebP。HEIC、SVG、GIF 和网页文件不会被读取。",
    );
  }
  if (file.size <= 0) {
    throw new PersonalImageSafetyError("empty-file", "这张图片是空文件，请重新选择。 ");
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new PersonalImageSafetyError("input-too-large", "单张原图不能超过 18 MB。请先在相册中适当压缩。 ");
  }
  if (typeof window === "undefined" || typeof window.createImageBitmap !== "function") {
    throw new PersonalImageSafetyError("decode-failed", "当前浏览器不能安全解析图片，请使用最新版 Chrome、Edge 或 Safari。 ");
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await window.createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new PersonalImageSafetyError("decode-failed", "图片无法解码，可能已损坏或格式与扩展名不一致。 ");
  }

  try {
    const sourcePixels = bitmap.width * bitmap.height;
    if (
      bitmap.width <= 0 ||
      bitmap.height <= 0 ||
      bitmap.width > MAX_SOURCE_EDGE ||
      bitmap.height > MAX_SOURCE_EDGE ||
      sourcePixels > MAX_SOURCE_PIXELS
    ) {
      throw new PersonalImageSafetyError(
        "dimensions-too-large",
        "图片像素尺寸过大。最长边需低于 12000px，且总像素不超过 3000 万。",
      );
    }

    const longestEdge = Math.max(bitmap.width, bitmap.height);
    const scale = Math.min(1, OUTPUT_EDGE_BY_KIND[kind] / longestEdge);
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", {
      alpha: mimeType === "image/png" || mimeType === "image/webp",
    });
    if (!context) {
      throw new PersonalImageSafetyError("encode-failed", "浏览器没有可用的图片处理画布。 ");
    }

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(bitmap, 0, 0, width, height);

    // Drawing decoded pixels to a new canvas and encoding them again removes EXIF,
    // including camera GPS metadata, before the Blob reaches IndexedDB.
    const sanitizedBlob = await canvasToBlob(canvas, mimeType);
    canvas.width = 1;
    canvas.height = 1;

    if (sanitizedBlob.type.toLowerCase() !== mimeType) {
      throw new PersonalImageSafetyError(
        "encode-failed",
        "当前浏览器无法按原格式安全重编码这张图片，请换用 JPEG 或 PNG 版本。",
      );
    }

    if (sanitizedBlob.size > MAX_OUTPUT_BYTES) {
      throw new PersonalImageSafetyError(
        "output-too-large",
        "处理后的图片仍超过 12 MB。请选择尺寸更小的版本。",
      );
    }

    return {
      blob: sanitizedBlob,
      originalName: safeFileName(file.name, mimeType),
      mimeType,
      width,
      height,
      originalBytes: file.size,
      sanitizedBytes: sanitizedBlob.size,
    };
  } finally {
    bitmap.close();
  }
}

export function personalImageErrorMessage(error: unknown) {
  if (error instanceof PersonalImageSafetyError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return "图片没有保存。请检查浏览器存储权限后重试。";
}
