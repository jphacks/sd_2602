import { IMAGE_BASE64, IMAGE_VERSION } from "./image-data.js";

// Public test image only. Requests cannot choose files or access user data.
export function demoImageResponse(request) {
  const url = new URL(request.url);
  if (!url.searchParams.has("asset")) return null;
  if (url.searchParams.get("asset") !== "calendar" || url.searchParams.get("version") !== IMAGE_VERSION) {
    return new Response("not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  const bytes = Uint8Array.from(atob(IMAGE_BASE64), (char) => char.charCodeAt(0));
  return new Response(request.method === "HEAD" ? null : bytes, {
    headers: {
      "Content-Type": "image/png",
      "Content-Length": String(bytes.byteLength),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
