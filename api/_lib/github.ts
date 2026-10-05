import { env } from "./core";

export interface RepoConf {
  owner: string;
  repo: string;
  branch: string;
  token: string;
}

export function repoConf(): RepoConf | null {
  const owner = env("GITHUB_REPO_OWNER");
  const repo = env("GITHUB_REPO_NAME");
  const token = env("GITHUB_PAT", "GITHUB_TOKEN");
  if (!owner || !repo || !token) return null;
  return { owner, repo, branch: env("GITHUB_DEFAULT_BRANCH") || "main", token };
}

export function missingEnv(): string[] {
  const out: string[] = [];
  if (!env("GITHUB_PAT", "GITHUB_TOKEN")) out.push("GITHUB_PAT");
  if (!env("GITHUB_REPO_OWNER")) out.push("GITHUB_REPO_OWNER");
  if (!env("GITHUB_REPO_NAME")) out.push("GITHUB_REPO_NAME");
  return out;
}

async function gh(c: RepoConf, path: string, init?: RequestInit, raw?: boolean): Promise<Response> {
  return fetch(`https://api.github.com/repos/${c.owner}/${c.repo}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${c.token}`,
      Accept: raw ? "application/vnd.github.raw+json" : "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "aviorcart-dashboard",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
    },
  });
}

async function must<T>(r: Response, what: string): Promise<T> {
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`GitHub ${what} failed (${r.status}): ${t.slice(0, 200)}`);
  }
  return (await r.json()) as T;
}

export async function readText(c: RepoConf, path: string): Promise<string | null> {
  const r = await gh(c, `/contents/${path.split("/").map(encodeURIComponent).join("/")}?ref=${encodeURIComponent(c.branch)}`, undefined, true);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`GitHub read ${path} failed (${r.status})`);
  return await r.text();
}

export async function listDir(c: RepoConf, path: string): Promise<string[]> {
  const r = await gh(c, `/contents/${path}?ref=${encodeURIComponent(c.branch)}`);
  if (r.status === 404) return [];
  const j = await must<Array<{ name: string }>>(r, "list");
  return j.map((x) => x.name);
}

export interface FileChange {
  path: string;
  /** null deletes the file */
  content: string | null;
}

export async function commitFiles(c: RepoConf, files: FileChange[], message: string): Promise<{ sha: string; url: string }> {
  const ref = await must<{ object: { sha: string } }>(await gh(c, `/git/ref/heads/${encodeURIComponent(c.branch)}`), "get ref");
  const head = ref.object.sha;
  const commit = await must<{ tree: { sha: string } }>(await gh(c, `/git/commits/${head}`), "get commit");
  const tree = await must<{ sha: string }>(
    await gh(c, "/git/trees", {
      method: "POST",
      body: JSON.stringify({
        base_tree: commit.tree.sha,
        tree: files.map((f) =>
          f.content === null
            ? { path: f.path, mode: "100644", type: "blob", sha: null }
            : { path: f.path, mode: "100644", type: "blob", content: f.content },
        ),
      }),
    }),
    "create tree",
  );
  const nc = await must<{ sha: string; html_url: string }>(
    await gh(c, "/git/commits", { method: "POST", body: JSON.stringify({ message, tree: tree.sha, parents: [head] }) }),
    "create commit",
  );
  const upd = await gh(c, `/git/refs/heads/${encodeURIComponent(c.branch)}`, { method: "PATCH", body: JSON.stringify({ sha: nc.sha }) });
  if (!upd.ok) throw new Error(`GitHub update ref failed (${upd.status}) — someone else pushed at the same time, try again`);
  return { sha: nc.sha, url: nc.html_url };
}
