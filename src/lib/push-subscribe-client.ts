/** Client-side Web Push registration ? shared by PushSubscribe and permission prompts. */

type PushLang = "pt" | "en" | "es";

const PUSH_IOS_ALT: Record<PushLang, string> = {
  pt: "No iPhone/iPad, notificações push só funcionam com o app instalado na Tela de Início. Enquanto isso, ative lembretes por e-mail e WhatsApp nas configurações da sua conta.",
  en: "On iPhone/iPad, push notifications only work when the app is added to your Home Screen. Until then, enable email and WhatsApp reminders in your account settings.",
  es: "En iPhone/iPad, las notificaciones push solo funcionan con la app en la Pantalla de inicio. Mientras tanto, active recordatorios por correo y WhatsApp en la configuración de su cuenta.",
};

function normalizePushLang(lang?: string): PushLang {
  if (lang?.startsWith("pt")) return "pt";
  if (lang?.startsWith("es")) return "es";
  return "en";
}

/** True when running in Mobile Safari tab (not standalone PWA). Push is unavailable there. */
export function isIosSafariBrowserTab(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent;
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (!isIOS) return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  const standalone = nav.standalone === true || window.matchMedia("(display-mode: standalone)").matches;
  return !standalone;
}

export function isWebPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function pushIosAlternativeMessage(lang?: string): string {
  return PUSH_IOS_ALT[normalizePushLang(lang)];
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

export async function syncPushSubscription(): Promise<boolean> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;
  if (Notification.permission !== "granted") return false;

  try {
    const cfg = await fetch("/api/push/vapid-public-key").then((r) => r.json());
    if (!cfg.enabled || !cfg.publicKey) return false;

    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    if (existing) {
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(existing.toJSON()),
      });
      return true;
    }

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(cfg.publicKey) as BufferSource,
    });

    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sub.toJSON()),
    });
    return true;
  } catch {
    return false;
  }
}

export async function requestPushPermissionAndSubscribe(): Promise<
  "granted" | "denied" | "unsupported"
> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    return "unsupported";
  }
  if (Notification.permission === "denied") return "denied";
  if (Notification.permission === "granted") {
    await syncPushSubscription();
    return "granted";
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return "denied";
  await syncPushSubscription();
  return "granted";
}
