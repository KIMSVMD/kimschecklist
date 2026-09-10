import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/firebase";

const COMPRESS_MAX_DIMENSION = 1600;
const COMPRESS_QUALITY = 0.82;
const COMPRESS_SKIP_UNDER_BYTES = 800 * 1024; // already small enough — not worth recompressing

// Downscale + re-encode photos before upload so store wifi/mobile data isn't spent on
// full-resolution phone camera originals. Best-effort: any failure (unsupported format,
// canvas taint, etc.) just falls back to the original file — this must never block an upload.
// Opt-in per call site (see uploadFile's `compress` param) rather than automatic for every
// upload — some callers (guide videos/attachments, PDFs) must never be touched.
export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const longEdge = Math.max(bitmap.width, bitmap.height);
    const scale = Math.min(1, COMPRESS_MAX_DIMENSION / longEdge);
    if (scale >= 1 && file.size < COMPRESS_SKIP_UNDER_BYTES) {
      bitmap.close?.();
      return file;
    }

    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) { bitmap.close?.(); return file; }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    const blob: Blob | null = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", COMPRESS_QUALITY));
    if (!blob || blob.size >= file.size) return file; // compression didn't actually help
    const compressedName = file.name.replace(/\.\w+$/, "") + ".jpg";
    return new File([blob], compressedName, { type: "image/jpeg" });
  } catch {
    return file;
  }
}

export async function uploadFile(file: File, options?: { compress?: boolean }): Promise<string> {
  const toUpload = options?.compress ? await compressImage(file) : file;
  const fileName = `uploads/${Date.now()}_${Math.random().toString(36).slice(2)}_${toUpload.name}`;
  const fileRef = ref(storage, fileName);
  await uploadBytes(fileRef, toUpload);
  return await getDownloadURL(fileRef);
}

export async function hashFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
}
