import type { VercelRequest, VercelResponse } from "@vercel/node";
import { env, requireAdmin, sendJson } from "./_lib/core";

interface ImgbbResp {
  success?: boolean;
  data?: { url?: string; display_url?: string; thumb?: { url?: string }; delete_url?: string };
  error?: { message?: string };
}

export const config = { api: { bodyParser: { sizeLimit: "4mb" } } };

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== "POST") return sendJson(res, 405, { error: "POST only" });
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const key = env("IMGBB_API_KEY", "NEXT_PUBLIC_IMGBB_API_KEY");
  if (!key) return sendJson(res, 500, { error: "IMGBB_API_KEY missing in Vercel env." });

  const body = (req.body ?? {}) as { image?: unknown; name?: unknown };
  const image = typeof body.image === "string" ? body.image.replace(/^data:image\/[a-z+.-]+;base64,/i, "") : "";
  if (!image || image.length < 100) return sendJson(res, 400, { error: "No image data." });
  if (image.length > 3_800_000) return sendJson(res, 413, { error: "Image too large (max ~2.8 MB). Compress and retry." });

  const form = new URLSearchParams();
  form.set("image", image);
  if (typeof body.name === "string" && body.name) form.set("name", body.name.replace(/[^\w.-]+/g, "_").slice(0, 60));

  try {
    const r = await fetch(`https://api.imgbb.com/1/upload?key=${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
    const j = (await r.json()) as ImgbbResp;
    const url = j.data?.url ?? j.data?.display_url;
    if (!r.ok || !j.success || !url) return sendJson(res, 502, { error: `imgbb: ${j.error?.message ?? `HTTP ${r.status}`}` });
    return sendJson(res, 200, { url, thumb: j.data?.thumb?.url ?? url, deleteUrl: j.data?.delete_url ?? "" });
  } catch {
    return sendJson(res, 502, { error: "Could not reach imgbb." });
  }
}
