import { createClient, type User } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { ApiError } from "./api";
import { prisma } from "./prisma";

export async function authenticatedUser(request: Request): Promise<User> {
  const url = process.env.SUPBASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPBASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new ApiError(500, "Authentication is not configured");
  const header = request.headers.get("authorization");
  let result;
  if (header) {
    const match = /^Bearer\s+(\S+)$/i.exec(header);
    if (!match) throw new ApiError(401, "A valid Bearer access token is required");
    const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    result = await client.auth.getUser(match[1]);
  } else {
    const store = await cookies();
    const client = createServerClient(url, key, { cookies: {
      getAll: () => store.getAll(),
      setAll: values => { for (const { name, value, options } of values) store.set(name, value, options); },
    } });
    result = await client.auth.getUser();
  }
  if (result.error || !result.data.user) throw new ApiError(401, "Authentication required or session expired");
  return result.data.user;
}

export async function requireUser(request: Request) {
  const auth = await authenticatedUser(request);
  const profile = await prisma.users.findUnique({ where: { user_id: auth.id }, select: { user_id: true } });
  if (!profile) throw new ApiError(403, "Create your application profile using POST /api/v1/auth/profile first");
  return auth.id;
}
