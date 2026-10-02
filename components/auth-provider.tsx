"use client";
import { createBrowserClient } from "@supabase/ssr";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  apiRequest,
  ClientError,
  type ApiOptions,
  type Envelope,
} from "@/lib/frontend/api-client";
import { syncProfile } from "@/lib/frontend/profile-sync";
import type { Profile } from "@/lib/frontend/types";

type Auth = {
  client: SupabaseClient | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  error: string;
  retry: () => void;
  setProfile: (profile: Profile) => void;
  logout: () => Promise<void>;
  request: <T>(path: string, options?: ApiOptions) => Promise<Envelope<T>>;
};
const Context = createContext<Auth | null>(null);
export function AuthProvider({
  config,
  children,
}: {
  config: { url: string; key: string } | null;
  children: ReactNode;
}) {
  const [client] = useState(() =>
    config
      ? createBrowserClient(config.url, config.key, {
          global: {
            fetch: (input, init) =>
              fetch(input, {
                ...init,
                signal: init?.signal
                  ? AbortSignal.any([init.signal, AbortSignal.timeout(15_000)])
                  : AbortSignal.timeout(15_000),
              }),
          },
        })
      : null,
  );
  const [session, setSession] = useState<Session | null>(null),
    [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const revision = useRef(0),
    active = useRef(true),
    synchronizedUser = useRef<string | null>(null);
  const accept = useCallback(async (next: Session | null) => {
    const version = ++revision.current;
    if (!active.current) return;
    setSession(next);
    setError("");
    if (!next) {
      synchronizedUser.current = null;
      setProfile(null);
      setLoading(false);
      return;
    }
    if (synchronizedUser.current === next.user.id) {
      setLoading(false);
      return;
    }
    setProfile(null);
    setLoading(true);
    try {
      const saved = await syncProfile(next);
      if (active.current && version === revision.current) {
        synchronizedUser.current = next.user.id;
        setProfile(saved);
      }
    } catch (failure) {
      if (active.current && version === revision.current) {
        setError(
          failure instanceof Error
            ? failure.message
            : "Cannot load your profile.",
        );
        if (failure instanceof ClientError && failure.status === 401)
          setSession(null);
      }
    } finally {
      if (active.current && version === revision.current) setLoading(false);
    }
  }, []);
  const retry = useCallback(() => {
    if (!client) {
      setError("Public authentication configuration is unavailable.");
      setLoading(false);
      return;
    }
    setLoading(true);
    void client.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) {
          setError("Unable to restore your session. Please sign in again.");
          setLoading(false);
        } else void accept(data.session);
      })
      .catch(() => {
        setError("Cannot connect to authentication. Please retry.");
        setLoading(false);
      });
  }, [client, accept]);
  useEffect(() => {
    active.current = true;
    retry();
    const subscription = client?.auth.onAuthStateChange((_event, next) => {
      // Never await another Supabase operation inside its auth lock callback.
      queueMicrotask(() => {
        void accept(next);
      });
    });
    return () => {
      active.current = false;
      revision.current++;
      subscription?.data.subscription.unsubscribe();
    };
  }, [client, accept, retry]);
  const logout = useCallback(async () => {
    if (!client) return;
    const { error } = await client.auth.signOut({ scope: "local" });
    if (error) throw new ClientError("Unable to sign out. Please try again.");
    await accept(null);
  }, [client, accept]);
  const request = useCallback(
    async <T,>(
      path: string,
      options: ApiOptions = {},
    ): Promise<Envelope<T>> => {
      if (!client) throw new ClientError("Authentication is unavailable");
      const { data, error } = await client.auth.getSession();
      if (error || !data.session) {
        await accept(null);
        throw new ClientError("Please sign in again.", 401);
      }
      try {
        return await apiRequest<T>(path, {
          ...options,
          token: data.session.access_token,
        });
      } catch (failure) {
        if (!(failure instanceof ClientError) || failure.status !== 401)
          throw failure;
        const refreshed = await client.auth.refreshSession();
        if (refreshed.error || !refreshed.data.session) {
          await accept(null);
          throw new ClientError(
            "Your session expired. Please sign in again.",
            401,
          );
        }
        try {
          return await apiRequest<T>(path, {
            ...options,
            token: refreshed.data.session.access_token,
          });
        } catch (again) {
          if (again instanceof ClientError && again.status === 401)
            await accept(null);
          throw again;
        }
      }
    },
    [client, accept],
  );
  return (
    <Context.Provider
      value={{
        client,
        session,
        profile,
        loading,
        error,
        retry,
        setProfile,
        logout,
        request,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useAuth() {
  const auth = useContext(Context);
  if (!auth) throw new Error("AuthProvider is required");
  return auth;
}
