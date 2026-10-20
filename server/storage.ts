import { ENV } from "./_core/env";

function getStorageConfig() {
  const baseUrl = ENV.forgeApiUrl.replace(/\/+$/, "");
  if (!baseUrl || !ENV.forgeApiKey) {
    throw new Error("Storage is not configured: MANUS_API_URL and MANUS_API_KEY are required");
  }
  return { baseUrl, apiKey: ENV.forgeApiKey };
}

function normalizeKey(key: string) {
  return key.replace(/^\/+/, "");
}

async function requestPresignedUrl(kind: "put" | "get", key: string) {
  const { baseUrl, apiKey } = getStorageConfig();
  const url = new URL(`v1/storage/presign/${kind}`, `${baseUrl}/`);
  url.searchParams.set("path", normalizeKey(key));
  const response = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` } });
  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(`Storage presign failed (${response.status}): ${message}`);
  }
  const payload = (await response.json()) as { url?: string; error?: string };
  if (!payload.url) throw new Error(payload.error || "Storage did not return a signed URL");
  return payload.url;
}

export async function storagePresignPut(key: string) {
  return requestPresignedUrl("put", key);
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
) {
  const key = `${relKey.replace(/^\/+/, "")}_${randomSuffix()}`;
  const signedUrl = await storagePresignPut(key);
  const response = await fetch(signedUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: typeof data === "string" ? new Blob([data], { type: contentType }) : new Blob([data as any], { type: contentType }),
  });
  if (!response.ok) throw new Error(`Storage upload failed (${response.status})`);
  return { key, url: `/manus-storage/${key}` };
}

export async function storageGetSignedUrl(key: string) {
  return requestPresignedUrl("get", key);
}

function randomSuffix() {
  return Math.random().toString(36).slice(2, 10);
}
