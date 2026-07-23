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
    throw new Error(body?.error || `Request failed (${res.status})`);
  }
  return body.data as T;
}
