import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AppState } from "react-native";

import { getAppSetting } from "../db/queries";

interface SecurityContextValue {
  ready: boolean;
  error: string | null;
  teacherName: string | null;
  lockEnabled: boolean;
  unlocked: boolean;
  refresh: () => Promise<void>;
  setUnlocked: (unlocked: boolean) => void;
}

const SecurityContext = createContext<SecurityContextValue | null>(null);

async function loadSecuritySettings(): Promise<{ teacherName: string | null; lockEnabled: boolean }> {
  const [savedName, lockSetting] = await Promise.all([
    getAppSetting("teacher_name"),
    getAppSetting("app_lock_enabled"),
  ]);
  return {
    teacherName: savedName?.trim() || null,
    lockEnabled: lockSetting === "true",
  };
}

export function SecurityProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [teacherName, setTeacherName] = useState<string | null>(null);
  const [lockEnabled, setLockEnabled] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const settings = await loadSecuritySettings();
      setTeacherName(settings.teacherName);
      setLockEnabled(settings.lockEnabled);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load security settings.");
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void loadSecuritySettings()
      .then((settings) => {
        if (!active) return;
        setTeacherName(settings.teacherName);
        setLockEnabled(settings.lockEnabled);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "Could not load security settings.");
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") {
        setUnlocked(false);
      } else {
        void refresh();
      }
    });
    return () => subscription.remove();
  }, [refresh]);

  const value = useMemo(
    () => ({ ready, error, teacherName, lockEnabled, unlocked, refresh, setUnlocked }),
    [ready, error, teacherName, lockEnabled, unlocked, refresh],
  );

  return <SecurityContext.Provider value={value}>{children}</SecurityContext.Provider>;
}

export function useSecurity(): SecurityContextValue {
  const context = useContext(SecurityContext);
  if (!context) {
    throw new Error("useSecurity must be used within SecurityProvider.");
  }
  return context;
}
