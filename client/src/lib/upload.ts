import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/firebase";

export async function uploadFile(file: File): Promise<string> {
  const fileName = `uploads/${Date.now()}_${Math.random().toString(36).slice(2)}_${file.name}`;
  const fileRef = ref(storage, fileName);
  await uploadBytes(fileRef, file);
  return await getDownloadURL(fileRef);
}

export async function hashFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
}
