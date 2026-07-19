// Shared password hashing/verification (Web Crypto, no external deps).
// Server-safe and identical to the algorithm used at registration, so hashes
// created by the app verify here. Used by the server-side auth routes so the
// password hash never has to be read by the browser.
//
// Format: pbkdf2$iterations$salt$hash (with backward-compat for salt:hash and plaintext).

const PBKDF2_ITERATIONS = 100_000;

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function randomSalt(length = 16): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return toHex(hashBuffer);
}
async function pbkdf2Hex(plain: string, salt: string, iterations = PBKDF2_ITERATIONS): Promise<string> {
  const keyMaterial = await crypto.subtle.importKey("raw", new TextEncoder().encode(plain), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: new TextEncoder().encode(salt), iterations, hash: "SHA-256" },
    keyMaterial,
    256,
  );
  return toHex(bits);
}

export async function hashPassword(plain: string): Promise<string> {
  const salt = randomSalt();
  const hash = await pbkdf2Hex(plain, salt);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${salt}$${hash}`;
}

export function needsRehash(stored: string): boolean {
  return !stored.startsWith("pbkdf2$");
}

export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  if (!stored) return false;
  if (stored.startsWith("pbkdf2$")) {
    const [, iterStr, salt, hash] = stored.split("$");
    const computed = await pbkdf2Hex(plain, salt, parseInt(iterStr, 10) || PBKDF2_ITERATIONS);
    return computed === hash;
  }
  if (stored.includes(":")) {
    const [salt, hash] = stored.split(":");
    return (await sha256Hex(salt + plain)) === hash;
  }
  return plain === stored;
}
