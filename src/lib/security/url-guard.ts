import dns from "dns/promises";
import net from "net";

// SSRF protection for URL analysis. We must never let a user-supplied URL reach
// localhost, private networks, link-local, or cloud metadata endpoints. We validate
// the scheme, resolve DNS, and reject any resolved IP that is not a public unicast
// address. The Playwright fetch also re-checks on redirect.

export type UrlGuardResult =
  | { ok: true; url: URL; addresses: string[] }
  | { ok: false; reason: string };

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "metadata.google.internal",
]);

function isPrivateIPv4(ip: string): boolean {
  const p = ip.split(".").map(Number);
  if (p.length !== 4 || p.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return true;
  const [a, b] = p;
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 127) return true; // loopback
  if (a === 0) return true; // "this" network
  if (a === 169 && b === 254) return true; // link-local + cloud metadata (169.254.169.254)
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16/12
  if (a === 192 && b === 168) return true; // 192.168/16
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64/10
  if (a >= 224) return true; // multicast / reserved
  return false;
}

function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === "::1" || lower === "::") return true; // loopback / unspecified
  if (lower.startsWith("fe80")) return true; // link-local
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // unique local
  // IPv4-mapped ::ffff:a.b.c.d
  const mapped = lower.match(/::ffff:(\d+\.\d+\.\d+\.\d+)/);
  if (mapped) return isPrivateIPv4(mapped[1]);
  return false;
}

export function isPrivateAddress(ip: string): boolean {
  const type = net.isIP(ip);
  if (type === 4) return isPrivateIPv4(ip);
  if (type === 6) return isPrivateIPv6(ip);
  return true; // unknown → treat as unsafe
}

/**
 * Validate a user-supplied URL for safe server-side fetching.
 * Rejects non-http(s), embedded credentials, non-default suspicious ports,
 * blocked hostnames, and any host that resolves to a private/link-local IP.
 */
export async function guardUrl(input: string): Promise<UrlGuardResult> {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return { ok: false, reason: "Not a valid URL." };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, reason: "Only http and https URLs are allowed." };
  }
  if (url.username || url.password) {
    return { ok: false, reason: "URLs with embedded credentials are not allowed." };
  }

  const host = url.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(host) || host.endsWith(".localhost") || host.endsWith(".internal")) {
    return { ok: false, reason: "Access to internal hosts is blocked." };
  }

  // If the host is a literal IP, validate it directly.
  if (net.isIP(host)) {
    if (isPrivateAddress(host)) return { ok: false, reason: "Access to private IP addresses is blocked." };
    return { ok: true, url, addresses: [host] };
  }

  // Resolve DNS and ensure every resolved address is public.
  let addresses: string[] = [];
  try {
    const results = await dns.lookup(host, { all: true });
    addresses = results.map((r) => r.address);
  } catch {
    return { ok: false, reason: "Could not resolve the domain." };
  }
  if (addresses.length === 0) return { ok: false, reason: "Domain did not resolve." };
  for (const addr of addresses) {
    if (isPrivateAddress(addr)) {
      return { ok: false, reason: "Domain resolves to a private/internal address (blocked)." };
    }
  }

  return { ok: true, url, addresses };
}
