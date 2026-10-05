"use strict";
async function apiFetch(path, init) {
    const sess = await sb.auth.getSession();
    const token = sess.data.session && sess.data.session.access_token ? sess.data.session.access_token : "";
    if (!token)
        throw new Error("Please sign in again.");
    const headers = { Authorization: "Bearer " + token };
    if (init && init.body !== undefined)
        headers["Content-Type"] = "application/json";
    const res = await fetch(path, {
        method: init && init.method ? init.method : "GET",
        headers: headers,
        body: init && init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
    let data = null;
    try {
        data = await res.json();
    }
    catch (_e) {
        data = null;
    }
    if (!res.ok) {
        const msg = data && typeof data === "object" && typeof data.error === "string" ? data.error : "Request failed (" + res.status + ")";
        throw new Error(msg);
    }
    return data;
}
