const CACHE_NAME = "nekko-static-v2";

const OFFLINE_HTML = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="theme-color" content="#f4f3ef">
  <title>Nekko · 离线</title>
  <style>
    *{box-sizing:border-box}body{margin:0;min-height:100dvh;display:grid;place-items:center;padding:32px;background:#f4f3ef;color:#19191b;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.wrap{width:min(100%,420px);text-align:center}.mark{margin:auto;display:grid;height:64px;width:64px;place-items:center;border-radius:8px;background:#19191b;color:#f4f3ef;font:italic 42px Georgia,serif;border-left:5px solid #e54d2e}h1{margin:24px 0 8px;font-size:22px}p{margin:0;color:#707075;font-size:14px;line-height:1.7}button{margin-top:24px;height:42px;border:0;border-radius:6px;background:#19191b;color:#fff;padding:0 20px;font-size:14px;font-weight:600}
  </style>
</head>
<body><main class="wrap"><div class="mark">N</div><h1>网络暂时断开</h1><p>Nekko 没有缓存你的私人工作数据。<br>恢复网络后即可继续使用。</p><button onclick="location.reload()">重新连接</button></main></body>
</html>`;

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => new Response(OFFLINE_HTML, {
        status: 503,
        headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
      }))
    );
    return;
  }

  const cacheable = url.pathname.startsWith("/_next/static/")
    || url.pathname.startsWith("/icons/")
    || request.destination === "font";
  if (!cacheable) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        event.waitUntil(
          fetch(request)
            .then((response) => response.ok ? caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone())) : undefined)
            .catch(() => undefined)
        );
        return cached;
      }
      return fetch(request).then((response) => {
        if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
        return response;
      });
    })
  );
});
