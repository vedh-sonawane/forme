import { currentUserId } from "@/lib/user";
import { ok, fail, handler } from "@/lib/api";
import { runScreenshotAnalysis } from "@/lib/services/analysis";
import { ALLOWED_IMAGE_MIME, MAX_UPLOAD_BYTES } from "@/lib/storage/local";

export const runtime = "nodejs";
export const maxDuration = 120;

export const POST = handler(async (req: Request) => {
  const userId = await currentUserId();
  const form = await req.formData().catch(() => null);
  if (!form) return fail("Expected multipart form data.");

  const device = (form.get("device") as string) || undefined;
  const note = (form.get("note") as string) || undefined;
  const title = (form.get("title") as string) || undefined;
  const projectId = (form.get("projectId") as string) || undefined;

  const fileEntries = form.getAll("files").filter((f): f is File => f instanceof File);
  if (fileEntries.length === 0) return fail("Upload at least one screenshot.");

  const files: { buffer: Buffer; mime: string; name: string }[] = [];
  for (const f of fileEntries.slice(0, 6)) {
    if (!ALLOWED_IMAGE_MIME.includes(f.type)) return fail(`Unsupported file type: ${f.type || "unknown"}. Use PNG, JPG, WEBP, or GIF.`);
    if (f.size > MAX_UPLOAD_BYTES) return fail(`"${f.name}" is too large (max 10MB).`);
    const buffer = Buffer.from(await f.arrayBuffer());
    files.push({ buffer, mime: f.type, name: f.name });
  }

  const result = await runScreenshotAnalysis({ files, device, note, title, userId, projectId });
  return ok(result, { status: 201 });
});
