import "server-only";

export function publicAuthConfig(): { url: string; key: string } | null {
  const url =
    process.env.SUPBASE_URL?.trim() || process.env.SUPABASE_URL?.trim();
  const key =
    process.env.SUPBASE_PUBLISHABLE_KEY?.trim() ||
    process.env.SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !key || key.startsWith("sb_secret_")) return null;
  try {
    const parsed = new URL(url);
    if (
      !["https:", "http:"].includes(parsed.protocol) ||
      parsed.username ||
      parsed.password
    )
      return null;
    if (!key.startsWith("sb_publishable_")) {
      const payload = JSON.parse(
        Buffer.from(key.split(".")[1] ?? "", "base64url").toString(),
      );
      if (payload.role !== "anon") return null;
    }
  } catch {
    return null;
  }
  return { url, key };
}
