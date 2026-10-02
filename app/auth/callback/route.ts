import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { publicAuthConfig } from "@/lib/public-auth-config";
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code"), config = publicAuthConfig();
  if (code && config) {
    try {
      const store = await cookies();
      const client = createServerClient(config.url, config.key, { global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(15_000) }) }, cookies: {
        getAll: () => store.getAll(), setAll: values => values.forEach(({ name, value, options }) => store.set(name, value, options)),
      } });
      const { error } = await client.auth.exchangeCodeForSession(code);
      if (!error) return NextResponse.redirect(new URL("/dashboard", request.url), { headers: { "Cache-Control": "no-store" } });
    } catch { /* no raw provider errors or auth codes in logs */ }
  }
  return NextResponse.redirect(new URL("/login?confirmation=failed", request.url), { headers: { "Cache-Control": "no-store" } });
}
