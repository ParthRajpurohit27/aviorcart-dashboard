/* api helper: calls the dashboard's own serverless functions with the admin's Supabase token */

interface ApiOk {
  [key: string]: unknown;
}

async function apiFetch<T extends ApiOk>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const sess = await sb.auth.getSession();
  const token = sess.data.session && sess.data.session.access_token ? sess.data.session.access_token : "";
  if (!token) throw new Error("Please sign in again.");
  const headers: Record<string, string> = { Authorization: "Bearer " + token };
  if (init && init.body !== undefined) headers["Content-Type"] = "application/json";
  const res = await fetch(path, {
    method: init && init.method ? init.method : "GET",
    headers: headers,
    body: init && init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  let data: unknown = null;
  try {
    data = await res.json();
  } catch (_e) {
    data = null;
  }
  if (!res.ok) {
    const msg = data && typeof data === "object" && typeof (data as { error?: unknown }).error === "string" ? (data as { error: string }).error : "Request failed (" + res.status + ")";
    throw new Error(msg);
  }
  return data as T;
}
