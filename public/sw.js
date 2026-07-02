const CACHE = "doctor8-hum-v7";
const API_CACHE = "doctor8-hum-api-v7";
const OUTBOX_DB = "doctor8-hum";
const OUTBOX_STORE = "outbox";
const SYNC_TAG = "hum-outbox-sync";
const ACTIVE_USER_META_ID = "__activeUserId__";

const PRECACHE = [
  "/sos-venezuela",
  "/humanitarian/venezuela-terremoto-2026",
  "/humanitarian/venezuela-terremoto-2026/triage",
  "/humanitarian/venezuela-terremoto-2026/tcle",
  "/humanitarian/venezuela-terremoto-2026/anamnese",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)));
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE && k !== API_CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

function isHumanitarianShell(pathname) {
  return (
    pathname === "/sos-venezuela" ||
    pathname.startsWith("/humanitarian/") ||
    pathname.startsWith("/icons/") ||
    pathname.endsWith(".webmanifest")
  );
}

function isCampaignApi(pathname) {
  return pathname.startsWith("/api/humanitarian/campaigns/");
}

function openOutboxDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(OUTBOX_DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(OUTBOX_STORE)) {
        db.createObjectStore(OUTBOX_STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function readOutboxItems(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OUTBOX_STORE, "readonly");
    const req = tx.objectStore(OUTBOX_STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

function removeOutboxItem(db, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OUTBOX_STORE, "readwrite");
    tx.objectStore(OUTBOX_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function flushOutboxFromSw() {
  const db = await openOutboxDb();
  const items = await readOutboxItems(db);
  if (!items.length) return 0;

  const meta = items.find((item) => item.id === ACTIVE_USER_META_ID);
  const activeUserId = meta?.userId || null;
  const queue = items.filter((item) => {
    if (item.id === ACTIVE_USER_META_ID) return false;
    if (!item.url || !item.url.startsWith("/api/humanitarian/")) return false;
    if (!item.userId) {
      console.log("[hum-outbox] discarding legacy item without userId", item.id);
      return false;
    }
    if (!activeUserId || item.userId !== activeUserId) return false;
    return true;
  });

  if (!queue.length) return 0;

  let flushed = 0;
  for (const item of queue) {
    try {
      const res = await fetch(item.url, {
        method: item.method || "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(item.body || {}),
      });
      if (res.ok) {
        await removeOutboxItem(db, item.id);
        flushed += 1;
      } else {
        break;
      }
    } catch {
      break;
    }
  }
  return flushed;
}

self.addEventListener("sync", (event) => {
  if (event.tag === SYNC_TAG) {
    event.waitUntil(flushOutboxFromSw());
  }
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (isCampaignApi(url.pathname)) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(API_CACHE).then((cache) => cache.put(event.request, clone));
          }
          return res;
        })
        .catch(() =>
          caches.match(event.request).then((cached) => cached || Response.error()),
        ),
    );
    return;
  }

  if (url.pathname.startsWith("/api/")) return;
  if (!isHumanitarianShell(url.pathname)) return;

  event.respondWith(
    fetch(event.request)
      .then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || Response.error())),
  );
});

self.addEventListener("push", (event) => {
  let payload = { title: "Doctor8", body: "", data: { url: "/patient" } };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {
    /* ignore malformed payload */
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || "Doctor8", {
      body: payload.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: payload.data || { url: "/patient" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || "/patient";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});
