/** Short alert tone when the inactivity warning opens (best-effort; may require prior user gesture). */
export function playInactivityAlertTone(): void {
  if (typeof window === "undefined") return;

  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const playBeep = (frequency: number, startAt: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(0.12, startAt + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startAt);
      osc.stop(startAt + duration);
    };

    const t0 = ctx.currentTime;
    playBeep(523.25, t0, 0.18);
    playBeep(659.25, t0 + 0.22, 0.22);

    window.setTimeout(() => {
      void ctx.close();
    }, 600);
  } catch {
    /* non-blocking */
  }
}
