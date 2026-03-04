/**
 * 2-step presigned URL upload to Replit Object Storage.
 * Step 1: Request presigned URL from backend (sends JSON metadata)
 * Step 2: PUT file directly to presigned URL
 * Returns the objectPath (e.g. /objects/uploads/{uuid}) for storage in DB.
 */
export async function uploadFile(file: File): Promise<string> {
  const res = await fetch("/api/uploads/request-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      name: file.name,
      size: file.size,
      contentType: file.type || "application/octet-stream",
    }),
  });
  if (!res.ok) throw new Error("업로드 URL 요청 실패");
  const { uploadURL, objectPath } = await res.json();

  const putRes = await fetch(uploadURL, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type || "application/octet-stream" },
  });
  if (!putRes.ok) throw new Error("파일 업로드 실패");

  return objectPath as string;
}
