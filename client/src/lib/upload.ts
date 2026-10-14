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
// Formats every browser can display in an <img>. Anything else (HEIC/HEIF from a Galaxy with
// "고효율 사진" on, DNG/ProRAW, TIFF...) uploads fine but then shows as a broken image on
// Android/desktop, so those MUST be converted — "return the original on failure" would just
// store a photo nobody can see.
const WEB_VIEWABLE = /^image\/(jpeg|png|webp|gif)$/i;
const WEB_VIEWABLE_EXT = /\.(jpe?g|png|webp|gif)$/i;
const MAX_UNCONVERTED_BYTES = 25 * 1024 * 1024; // beyond this a failed re-encode would just time out on mobile data

export async function compressImage(file: File): Promise<File> {
  const looksLikeImage = file.type.startsWith("image/") || /\.(heic|heif|dng|tiff?|jpe?g|png|webp|gif)$/i.test(file.name);
  if (!looksLikeImage) return file;
  const viewable = WEB_VIEWABLE.test(file.type) || (!file.type && WEB_VIEWABLE_EXT.test(file.name));
  try {
    const bitmap = await createImageBitmap(file);
    const longEdge = Math.max(bitmap.width, bitmap.height);
    const scale = Math.min(1, COMPRESS_MAX_DIMENSION / longEdge);
    if (viewable && scale >= 1 && file.size < COMPRESS_SKIP_UNDER_BYTES) {
      bitmap.close?.();
      return file;
    }

    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) { bitmap.close?.(); throw new Error("canvas unavailable"); }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    const blob: Blob | null = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", COMPRESS_QUALITY));
    if (!blob) throw new Error("encode failed");
    // Only keep the original when it is already displayable and the re-encode didn't shrink it.
    if (viewable && blob.size >= file.size) return file;
    const compressedName = file.name.replace(/\.\w+$/, "") + ".jpg";
    return new File([blob], compressedName, { type: "image/jpeg" });
  } catch {
    if (!viewable) {
      throw new Error("이 사진 형식(HEIC 등)은 변환할 수 없어요. 갤럭시는 카메라 설정에서 '고효율 사진(HEIF)'을 끄고 다시 찍어주세요.");
    }
    if (file.size > MAX_UNCONVERTED_BYTES) {
      throw new Error(`사진 용량이 너무 커요 (${Math.round(file.size / 1024 / 1024)}MB). 더 작은 사진을 선택해주세요.`);
    }
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
