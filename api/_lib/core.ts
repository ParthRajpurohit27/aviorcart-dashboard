import type { VercelRequest, VercelResponse } from "@vercel/node";

export function env(...names: string[]): string {
  for (const n of names) {
    const v = process.env[n];
    if (v && v.trim()) return v.trim();
  }
  return "";
}

export function sendJson(res: VercelResponse, status: number, body: unknown): void {
  res.setHeader("Cache-Control", "no-store");
  res.status(status).json(body);
}

const FALLBACK_SB_URL = "https://pgcsmotbkzrnnfuduaje.supabase.co";
const FALLBACK_SB_ANON = "sb_publishable_58zPiYnUzw3E8ZizcctkVw_MGgtVZwi";

interface SbUser {
  email?: string;
  created_at?: string;
}

function sbBase(): string {
  return (env("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL") || FALLBACK_SB_URL).replace(/\/$/, "");
}

async function sbUser(token: string): Promise<SbUser | null> {
  const anon = env("SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY") || FALLBACK_SB_ANON;
  const r = await fetch(`${sbBase()}/auth/v1/user`, { headers: { apikey: anon, Authorization: `Bearer ${token}` } });
  if (!r.ok) return null;
  return (await r.json()) as SbUser;
}

let ownerCache = "";

/** When ADMIN_EMAILS is not set: the oldest Supabase account is the owner. */
async function ownerEmail(): Promise<string> {
  if (ownerCache) return ownerCache;
  const key = env("AVIORCART_SERVICE_ROLE_KEY", "SUPABASE_SERVICE_ROLE_KEY");
  if (!key) return "";
  const r = await fetch(`${sbBase()}/auth/v1/admin/users?page=1&per_page=200`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!r.ok) return "";
  const j = (await r.json()) as { users?: SbUser[] };
  const users = (j.users ?? []).filter((u) => u.email).sort((a, b) => (a.created_at ?? "").localeCompare(b.created_at ?? ""));
  ownerCache = users[0]?.email?.toLowerCase() ?? "";
  return ownerCache;
}

/** Returns the admin email, or null after sending an error response. */
export async function requireAdmin(req: VercelRequest, res: VercelResponse): Promise<string | null> {
  const h = req.headers.authorization ?? "";
  const token = h.startsWith("Bearer ") ? h.slice(7).trim() : "";
  if (!token) {
    sendJson(res, 401, { error: "Please sign in again." });
    return null;
  }
  let user: SbUser | null = null;
  try {
    user = await sbUser(token);
  } catch {
    sendJson(res, 502, { error: "Could not reach Supabase." });
    return null;
  }
  const email = user?.email?.toLowerCase() ?? "";
  if (!email) {
    sendJson(res, 401, { error: "Session expired. Sign in again." });
    return null;
  }
  const list = env("ADMIN_EMAILS")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const allowed = list.length ? list.includes(email) : email === (await ownerEmail());
  if (!allowed) {
    sendJson(res, 403, { error: "This account is not an admin. Set ADMIN_EMAILS in Vercel env." });
    return null;
  }
  return email;
}
