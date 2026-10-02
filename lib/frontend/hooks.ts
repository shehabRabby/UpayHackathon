"use client";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { ClientError } from "./api-client";
import type { Meta } from "./types";

export function useResource<T>(path: string | null) {
  const { request } = useAuth();
  const [data, setData] = useState<T | null>(null),
    [meta, setMeta] = useState<Meta | undefined>();
  const [loading, setLoading] = useState(Boolean(path)),
    [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((value) => value + 1), []);
  useEffect(() => {
    if (!path) {
      setData(null);
      setMeta(undefined);
      setLoading(false);
      setError("");
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setData(null);
    setMeta(undefined);
    void request<T>(path, { signal: controller.signal })
      .then((result) => {
        if (!controller.signal.aborted) {
          setData(result.data);
          setMeta(result.meta);
        }
      })
      .catch((failure) => {
        if (!controller.signal.aborted)
          setError(
            failure instanceof Error ? failure.message : "Unable to load data.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [path, request, version]);
  return { data, meta, loading, error, reload };
}
export function useAction() {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState("");
  const run = async (
    task: () => Promise<void>,
    message = "Saved successfully.",
  ) => {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await task();
      setSuccess(message);
    } catch (failure) {
      const details =
        failure instanceof ClientError
          ? failure.issues.map((item) => item.message).join(" ")
          : "";
      setError(
        details ||
          (failure instanceof Error
            ? failure.message
            : "Unable to complete the request."),
      );
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, success, run };
}
