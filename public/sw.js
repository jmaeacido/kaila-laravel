const CACHE = "kaila-laravel-v1";
const CORE = ["/", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png", "/kaila-logo.svg"];

self.addEventListener("install", (event) => {
    event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", (event) => {
    const request = event.request;
    if (request.method !== "GET") return;

    event.respondWith(
        fetch(request)
            .then((response) => {
                const copy = response.clone();
                caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
                return response;
            })
            .catch(() => caches.match(request).then((cached) => cached || caches.match("/")))
    );
});

self.addEventListener("push", (event) => {
    const payload = event.data?.json() || {};
    const title = payload.title || "KAILA update";
    const options = {
        body: payload.body || "Open KAILA for details.",
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        data: {
            url: payload.url || "/",
            requestId: payload.requestId || null,
            notificationId: payload.notificationId || null,
            type: payload.type || "push",
        },
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const url = event.notification.data?.url || "/";

    event.waitUntil(
        self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
            for (const client of clients) {
                if ("focus" in client) {
                    client.navigate(url).catch(() => {});
                    return client.focus();
                }
            }
            return self.clients.openWindow(url);
        })
    );
});
