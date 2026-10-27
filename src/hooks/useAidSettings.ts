"use client";

import { useEffect, useState } from "react";
import { DEFAULT_AID_SETTINGS, type AidSettings } from "@/lib/aidVisibility";

const STORAGE_KEY = "swinglab.aidSettings";

// Load saved choices, filling in defaults for anything missing (e.g. an aid
// added in a later version of the site).
function load(): AidSettings {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as Partial<AidSettings> | null;
    if (!saved) return DEFAULT_AID_SETTINGS;
    return {
      visible: { ...DEFAULT_AID_SETTINGS.visible, ...saved.visible },
      timing: { ...DEFAULT_AID_SETTINGS.timing, ...saved.timing },
      labels: saved.labels ?? DEFAULT_AID_SETTINGS.labels,
    };
  } catch {
    return DEFAULT_AID_SETTINGS;
  }
}

/** The user's aid choices, remembered in this browser between videos. */
export function useAidSettings() {
  const [settings, setSettings] = useState<AidSettings>(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Private browsing etc.: choices just won't be remembered.
    }
  }, [settings]);

  return [settings, setSettings] as const;
}
