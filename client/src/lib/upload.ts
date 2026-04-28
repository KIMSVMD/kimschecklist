import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/firebase";

export async function uploadFile(file: File): Promise<string> {
  const fileName = `uploads/${Date.now()}_${Math.random().toString(36).slice(2)}_${file.name}`;
  const fileRef = ref(storage, fileName);
  await uploadBytes(fileRef, file);
  return await getDownloadURL(fileRef);
}
