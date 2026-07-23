import { promises as fs } from "fs";
import path from "path";
import { nanoid } from "nanoid";
import { env } from "@/lib/env";

// Local-disk object storage. Abstracted behind a small API so it can be swapped for
// S3/Supabase Storage later without touching call sites. All paths returned are
// RELATIVE to STORAGE_DIR and served via /api/files/[...path].

const ROOT = path.resolve(process.cwd(), env.storageDir);

function safeJoin(relPath: string): string {
  const resolved = path.resolve(ROOT, relPath);
  if (!resolved.startsWith(ROOT)) throw new Error("Path traversal blocked");
  return resolved;
}

export async function ensureDir(dir: string) {
  await fs.mkdir(safeJoin(dir), { recursive: true });
}

const EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

/** Save a buffer; returns the relative storage path. */
export async function saveBuffer(
  dir: string,
  data: Buffer,
  opts: { mime?: string; ext?: string; name?: string } = {}
): Promise<string> {
  await ensureDir(dir);
  const ext = opts.ext ?? (opts.mime ? EXT[opts.mime] ?? "bin" : "bin");
  const filename = `${opts.name ? opts.name + "-" : ""}${nanoid(10)}.${ext}`;
  const rel = path.posix.join(dir, filename);
  await fs.writeFile(safeJoin(rel), data);
  return rel;
}

export async function saveText(dir: string, name: string, text: string): Promise<string> {
  await ensureDir(dir);
  const rel = path.posix.join(dir, name);
  await fs.writeFile(safeJoin(rel), text, "utf8");
  return rel;
}

export async function readFile(relPath: string): Promise<Buffer> {
  return fs.readFile(safeJoin(relPath));
}

export async function readFileBase64(relPath: string): Promise<string> {
  const buf = await readFile(relPath);
  return buf.toString("base64");
}

export function mimeFromExt(relPath: string): string {
  const ext = path.extname(relPath).slice(1).toLowerCase();
  const map: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    gif: "image/gif",
    html: "text/html",
    json: "application/json",
  };
  return map[ext] ?? "application/octet-stream";
}

export const ALLOWED_IMAGE_MIME = Object.keys(EXT);
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB
export { ROOT as STORAGE_ROOT };
