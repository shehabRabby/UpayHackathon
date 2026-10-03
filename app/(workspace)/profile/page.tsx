"use client";
import type { FormEvent } from "react";
import { useAuth } from "@/components/auth-provider";
import { useAction } from "@/lib/frontend/hooks";
import type { Profile } from "@/lib/frontend/types";
import { ProductIcon } from "@/components/brand";
import { Field, Notice, PageTitle } from "@/components/ui";
export default function ProfilePage() {
  const { profile, request, setProfile, session } = useAuth(), action = useAction();
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const fields = new FormData(event.currentTarget);
    void action.run(async () => {
      const result = await request<Profile>("/auth/profile", { method: "POST", body: { fullName: String(fields.get("fullName")).trim(), phone: String(fields.get("phone")).trim() || null, preferredLanguage: fields.get("preferredLanguage") } });
      setProfile(result.data);
    }, "Your profile has been saved.");
  }
  return <><PageTitle title="Your profile" description="Keep your name and coaching preference up to date." /><section className="card profile-card"><div className="profile-summary"><span className="profile-avatar" aria-hidden="true">{profile?.fullName.slice(0, 1).toUpperCase()}</span><div><h2>{profile?.fullName}</h2><p>{profile?.email}</p>{session?.user.email_confirmed_at && <span className="badge"><ProductIcon name="shield" />Email confirmed</span>}</div></div><p className="eyebrow">ACCOUNT SETTINGS</p><h2>Personal information</h2>
    <Notice error={action.error} success={action.success} /><form key={JSON.stringify(profile)} onChange={action.clear} onInvalidCapture={action.clear} onSubmit={submit}><fieldset disabled={action.busy}>
      <Field label="Full name"><input name="fullName" placeholder="Your full name" autoComplete="name" required maxLength={200} defaultValue={profile?.fullName} /></Field>
      <Field label="Email"><input type="email" value={profile?.email ?? ""} readOnly /></Field><p className="muted">Email is verified by Supabase Auth and cannot be changed here.</p>
      <Field label="Phone (optional)"><input name="phone" placeholder="Your phone number (optional)" autoComplete="tel" type="tel" maxLength={30} defaultValue={profile?.phone ?? ""} /></Field>
      <Field label="Preferred coaching language"><select name="preferredLanguage" defaultValue={profile?.preferredLanguage}><option value="bn-BD">Bangla (Bangladesh)</option><option value="bn">Bangla</option><option value="en">English</option></select></Field>
      <button type="submit">{action.busy ? "Saving…" : "Save profile"}</button></fieldset></form></section></>;
}
