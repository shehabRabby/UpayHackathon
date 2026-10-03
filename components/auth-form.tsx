"use client";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "./auth-provider";
import { Field, Notice } from "./ui";
import { PublicHeader, PublicFooter } from "./public-layout";
import { Brand, ProductIcon } from "./brand";
import { PasswordInput } from "./password-input";

export function AuthForm({ signup = false }: { signup?: boolean }) {
  const auth = useAuth(),
    router = useRouter();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState("");
  useEffect(() => {
    if (!auth.loading && auth.session) router.replace("/dashboard");
  }, [auth.loading, auth.session, router]);
  useEffect(() => {
    if (
      new URLSearchParams(window.location.search).get("confirmation") ===
      "failed"
    )
      setError(
        "Email confirmation failed or expired. Open the latest confirmation email, then try signing in.",
      );
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth.client) return;
    const fields = new FormData(event.currentTarget);
    const email = String(fields.get("email")).trim(),
      password = String(fields.get("password"));
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const result = signup
        ? await auth.client.auth.signUp({
            email,
            password,
            options: {
              data: { full_name: String(fields.get("fullName")).trim() },
              emailRedirectTo: `${window.location.origin}/auth/callback`,
            },
          })
        : await auth.client.auth.signInWithPassword({ email, password });
      if (result.error) {
        if (result.error.status === 429)
          throw new Error(
            "Too many authentication requests. Please wait before retrying.",
          );
        if (result.error.code === "invalid_credentials")
          throw new Error("The email or password is incorrect.");
        if (result.error.code === "email_not_confirmed")
          throw new Error("Confirm your email before signing in.");
        throw new Error(
          signup
            ? "Account creation failed. Check your details and password requirements, then retry."
            : "Sign in failed. Check your details and connection, then retry.",
        );
      }
      if (signup && !result.data.session)
        setSuccess(
          "Check your email to confirm your account. Then return here to sign in.",
        );
      else {
        auth.retry();
        setSuccess("Signed in. Synchronizing your profile…");
      }
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Authentication unavailable. Please retry.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <><PublicHeader /><main id="main-content" className="auth-page">
      <section className="auth-story"><Brand /><p className="eyebrow">YOUR MONEY. A SMARTER PLAN.</p><h2>{signup ? <>A purposeful start.<br /><span>For your financial goals.</span></> : <>Your smarter<br /><span>financial companion.</span></>}</h2><p>One private workspace to understand your records, build savings goals and explore your next decision.</p><ul className="feature-list"><li><ProductIcon name="analytics" /> Understand your spending</li><li><ProductIcon name="goals" /> Build purposeful savings goals</li><li><ProductIcon name="planning" /> Plan major decisions</li><li><ProductIcon name="coach" /> Get multilingual AI-assisted guidance</li></ul><div className={'auth-graphic'} aria-hidden={true}><span /><span /><span /><span /><span /><span /></div><p className={'auth-scope'}>Recorded financial data. No live Upay wallet connection.</p></section>
      <section className="card auth-card">
        <p className="eyebrow">{signup ? "YOUR FIRST STEP TOWARD CLARITY" : "A LITTLE CLARITY GOES A LONG WAY"}</p>
        <h1>{signup ? "Create your account" : "Welcome back"}</h1>
        <p>
          {signup
            ? "Start tracking your finances and building a savings plan."
            : "Sign in to your recorded finances and goals."}
        </p>
        {!auth.client && (
          <Notice error="Public Supabase authentication configuration is unavailable. Check the server configuration." />
        )}
        <Notice error={error || auth.error} success={success} />
        <form onChange={() => { setError(""); setSuccess(""); }} onInvalidCapture={() => { setError(""); setSuccess(""); }} onSubmit={submit}>
          <fieldset disabled={busy || auth.loading || !auth.client}>
            {signup && (
              <Field label="Full name">
                <input
                  name="fullName"
                  placeholder="Enter your full name"
                  autoComplete="name"
                  required
                  maxLength={200}
                />
              </Field>
            )}
            <Field label="Email address">
              <input name="email" type="email" placeholder={signup ? "Enter your email address" : "Enter your email"} autoComplete="email" required />
            </Field>
            <Field label="Password">
              <PasswordInput
                name="password"
                placeholder={signup ? "Create a secure password" : "Enter your password"}
                autoComplete={signup ? "new-password" : "current-password"}
                minLength={signup ? 8 : undefined}
                required
              />
            </Field>
            {signup && (
              <small className="muted">
                Use at least 8 characters. Your project’s password policy may
                require more.
              </small>
            )}
            <button className="full" type="submit">
              {busy ? (signup ? "Creating account…" : "Signing in…") : signup ? "Create account" : "Sign in"}
            </button>
          </fieldset>
        </form>
        <p className="muted">
          {signup ? "Already have an account? " : "New here? "}
          <Link href={signup ? "/login" : "/signup"}>
            {signup ? "Sign in" : "Create an account"}
          </Link>
        </p>
        <p className="muted">
          Prototype · Not connected to a live Upay wallet.
        </p>
      </section>
    </main><PublicFooter /></>
  );
}
