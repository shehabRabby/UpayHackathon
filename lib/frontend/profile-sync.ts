import type { Session } from "@supabase/supabase-js";
import { apiRequest, ClientError } from "./api-client";
import type { Profile } from "./types";

export async function syncProfile(session: Session): Promise<Profile> {
  try {
    return (
      await apiRequest<Profile>("/auth/profile", {
        token: session.access_token,
      })
    ).data;
  } catch (error) {
    if (!(error instanceof ClientError) || error.status !== 403) throw error;
  }
  const rawName = session.user.user_metadata?.full_name;
  const name =
    typeof rawName === "string" && rawName.trim()
      ? rawName.trim().slice(0, 200)
      : session.user.email?.split("@")[0] || "Upay member";
  return (
    await apiRequest<Profile>("/auth/profile", {
      token: session.access_token,
      method: "POST",
      body: { fullName: name, preferredLanguage: "bn-BD" },
    })
  ).data;
}
