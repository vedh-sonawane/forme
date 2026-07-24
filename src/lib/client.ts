"use client";

// Tiny typed fetch wrapper for client components. Throws on !ok so callers can
// try/catch and surface real error states.
export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    /* ignore */
  }
  const body = json as { ok?: boolean; data?: T; error?: string } | null;
  if (!res.ok || !body?.ok) {
    // Session expired / not signed in → bounce to login (skip if already there).
    if (res.status === 401 && typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      window.location.href = "/login";
    }
    throw new Error(body?.error || `Request failed (${res.status})`);
  }
  return body.data as T;
}
