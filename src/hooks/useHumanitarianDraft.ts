"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  clearHumanitarianDraft,
  humanitarianDraftSavedAt,
  loadHumanitarianDraft,
  saveHumanitarianDraft,
} from "@/lib/humanitarian/offline-draft";

export function useHumanitarianDraft<T>(
  userId: string | undefined,
  draftKey: string,
  initial: T,
) {
  const [data, setData] = useState<T>(initial);
  const [restored, setRestored] = useState(false);
  const hydrated = useRef(false);

  useEffect(() => {
    if (!userId || hydrated.current) return;
    hydrated.current = true;
    const saved = loadHumanitarianDraft<T>(userId, draftKey);
    if (saved) {
      setData(saved);
      setRestored(true);
    }
  }, [draftKey, userId]);

  useEffect(() => {
    if (!userId || !hydrated.current) return;
    saveHumanitarianDraft(userId, draftKey, data);
  }, [draftKey, data, userId]);

  const clearDraft = useCallback(() => {
    if (!userId) return;
    clearHumanitarianDraft(userId, draftKey);
    setRestored(false);
  }, [draftKey, userId]);

  const savedAt = userId ? humanitarianDraftSavedAt(userId, draftKey) : null;

  return { data, setData, restored, clearDraft, savedAt };
}
