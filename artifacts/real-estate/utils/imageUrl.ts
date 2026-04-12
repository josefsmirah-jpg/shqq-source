const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

export function getImageUri(img: string | undefined | null): string {
  if (!img) return "";
  // مسارات محلية أو http أو base64 — تمريرها كما هي
  if (
    img.startsWith("file://") ||
    img.startsWith("data:") ||
    img.startsWith("http://") ||
    img.startsWith("https://")
  ) return img;
  // objectPath من GCS مثل /objects/uploads/uuid
  if (img.startsWith("/objects/")) return `${API_BASE}/api/storage${img}`;
  return img;
}
