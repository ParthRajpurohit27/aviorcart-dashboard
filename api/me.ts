import type { VercelRequest, VercelResponse } from "@vercel/node";
import { env, requireAdmin, sendJson } from "./_lib/core";
import { missingEnv, repoConf } from "./_lib/github";

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const email = await requireAdmin(req, res);
  if (!email) return;
  const c = repoConf();
  sendJson(res, 200, {
    email,
    repo: c ? `${c.owner}/${c.repo}@${c.branch}` : "",
    missing: [...missingEnv(), ...(env("IMGBB_API_KEY", "NEXT_PUBLIC_IMGBB_API_KEY") ? [] : ["IMGBB_API_KEY"])],
  });
}
