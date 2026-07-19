// Server-side credential check — keeps the password hash off the browser.
//
// STATUS: READY, NOT YET WIRED. The client still logs in via the current path
// until you flip it (see SECURITY_HARDENING.md). Activating this route + the
// user_secrets migration is what lets you drop the public-readable password
// column for good.
//
// Flow: verify email+password here with the service-role key (bypasses RLS),
// return a SAFE user object (no hash). The client then creates its Supabase Auth
// session as before. Reads the secret from `user_secrets`, falling back to the
// legacy users.password during the transition.

import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/dabia/db/admin";
import { verifyPassword, needsRehash, hashPassword } from "@/lib/dabia/password";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }
  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";
  if (!email || !password) {
    return NextResponse.json({ ok: false, error: "Email and password are required" }, { status: 400 });
  }

  const admin = getAdminClient();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Server auth is not configured" }, { status: 503 });
  }

  // Fetch the user (service-role can read every column).
  const { data: user, error } = await admin.from("users").select("*").ilike("emall", email).maybeSingle();
  if (error || !user) {
    return NextResponse.json({ ok: false, error: "No account found with this email" }, { status: 401 });
  }

  // Prefer the vault; fall back to the legacy column while migrating.
  let stored: string | null = null;
  const { data: secret } = await admin.from("user_secrets").select("password_hash").eq("user_id", user.id).maybeSingle();
  stored = secret?.password_hash ?? (user as { password?: string }).password ?? null;

  if (!stored) {
    return NextResponse.json({ ok: false, error: "This account has no password set. Use 'Forgot Password' to set one." }, { status: 401 });
  }

  const valid = await verifyPassword(password, stored);
  if (!valid) {
    return NextResponse.json({ ok: false, error: "Incorrect password" }, { status: 401 });
  }

  // Transparent upgrade: rehash legacy formats and store in the vault.
  if ((needsRehash(stored) || !secret) && user.id) {
    try {
      const upgraded = needsRehash(stored) ? await hashPassword(password) : stored;
      await admin.from("user_secrets").upsert({ user_id: user.id, password_hash: upgraded, updated_at: new Date().toISOString() });
    } catch {
      /* non-fatal */
    }
  }

  // Never return the hash to the client.
  const safe = { ...(user as Record<string, unknown>) };
  delete safe.password;
  return NextResponse.json({ ok: true, user: safe });
}
