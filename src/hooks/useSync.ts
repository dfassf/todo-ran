"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "./useAuth";
import { sync } from "@/lib/sync/engine";
import { logError } from "@/lib/error-log";

const PULL_INTERVAL_MS = 30_000;

// 로그인된 사용자만 동작. 게스트는 sync 없음.
export const useSync = () => {
  const { user } = useAuth();
  const inFlight = useRef(false);

  useEffect(() => {
    if (!user) return;

    const run = async () => {
      if (inFlight.current) return;
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      inFlight.current = true;
      try {
        await sync(user.id);
      } catch (error) {
        logError({ context: "sync.run", error });
      } finally {
        inFlight.current = false;
      }
    };

    run();
    const id = setInterval(run, PULL_INTERVAL_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") run();
    };
    const onOnline = () => run();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
    };
  }, [user]);
};
