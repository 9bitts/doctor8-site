"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  clearHumanitarianDraft,
  humanitarianDraftSavedAt,
  loadHumanitarianDraft,
  saveHumanitarianDraft,
} from "@/lib/humanitarian/offline-draft";

export function useHumanitarianDraft<T>(draftKey: string, initial: T) {
  const [data, setData] = useState<T>(initial);
  const [restored, setRestored] = useState(false);
  const hydrated = useRef(false);

  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    const saved = loadHumanitarianDraft<T>(draftKey);
    if (saved) {
      setData(saved);
      setRestored(true);
    }
  }, [draftKey]);

  useEffect(() => {
    if (!hydrated.current) return;
    saveHumanitarianDraft(draftKey, data);
  }, [draftKey, data]);

  const clearDraft = useCallback(() => {
    clearHumanitarianDraft(draftKey);
    setRestored(false);
  }, [draftKey]);

  const savedAt = humanitarianDraftSavedAt(draftKey);

  return { data, setData, restored, clearDraft, savedAt };
}
