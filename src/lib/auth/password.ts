import { scrypt as _scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

// Password hashing with Node's built-in scrypt — no external dependency, works
// cross-platform. Stored format: "<saltHex>:<derivedHex>".
const scrypt = promisify(_scrypt) as (password: string, salt: string, keylen: number) => Promise<Buffer>;
const KEYLEN = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, KEYLEN)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hashHex] = stored.split(":");
  if (!salt || !hashHex) return false;
  const derived = (await scrypt(password, salt, KEYLEN)) as Buffer;
  const expected = Buffer.from(hashHex, "hex");
  if (expected.length !== derived.length) return false;
  return timingSafeEqual(expected, derived);
}
