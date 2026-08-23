import { createClient } from "@supabase/supabase-js";
import { setDefaultResultOrder } from "node:dns";

// Fixes a known Node-on-Windows bug where global fetch() tries IPv6 first
// and silently fails with a generic "fetch failed" TypeError instead of a
// real connection error. Safe to call repeatedly / on every import.
setDefaultResultOrder("ipv4first");

// Server-only client. Uses the service role key, which bypasses RLS.
// NEVER import this file into a "use client" component — it must only
// ever run inside API routes / server components.
export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables."
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}
