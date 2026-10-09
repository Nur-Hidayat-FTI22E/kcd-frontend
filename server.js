// ─────────────────────────────────────────────────────────────
// KotaCloud Spaces Demo Frontend (Node, tanpa dependency)
//
// Mengetes fitur platform:
//   - PORT dari env (default 3000)
//   - API_BASE_URL dari env (menunjuk ke service demo-api) —
//     proxy semua /api/* ke backend (mengetes proxy & service-to-service)
//   - Multi-page routing + form POST server-rendered
//   - Static assets dari /static
//   - /health endpoint
// ─────────────────────────────────────────────────────────────
const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL, URLSearchParams } = require("url");

const PORT = process.env.PORT || 3000;
const API_URL = (process.env.API_BASE_URL || "").replace(/\/+$/, "");
const APP_NAME = process.env.APP_NAME || "KotaCloud Demo";

const STATIC_DIR = path.join(__dirname, "static");

const MIME = {
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};

// ── Proxy helper: meneruskan request /api/* ke backend ───────
function proxyApi(req, res) {
  if (!API_URL) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      error: "API_BASE_URL belum diset",
      hint: "Isi env API_BASE_URL=<url-service-api> lalu redeploy.",
    }));
    return;
  }
  const target = API_URL + req.url.replace(/^\/api/, "/api");
  const proxyReq = http.request(target, { method: req.method, headers: { "content-type": req.headers["content-type"] || "application/json" } }, (apiRes) => {
    res.writeHead(apiRes.statusCode || 502, {
      "content-type": apiRes.headers["content-type"] || "application/json",
    });
    const apiCt = apiRes.headers["content-type"] || "";
    if (apiCt.includes("event-stream")) {
      apiRes.pipe(res); // streaming SSE harus di-pipe langsung
    } else {
      let body = "";
      apiRes.on("data", (c) => (body += c));
      apiRes.on("end", () => res.end(body));
    }
  });
  proxyReq.on("error", (err) => {
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "backend unreachable", detail: err.message, target }));
  });
  req.pipe(proxyReq);
}

// ── Layout & views ────────────────────────────────────────────
function layout(title, body, extraHead = "") {
  return `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} — ${APP_NAME}</title>
<link rel="stylesheet" href="/static/style.css">
${extraHead}
</head>
<body>
<header>
  <a href="/" class="brand">🚀 ${APP_NAME}</a>
  <nav>
    <a href="/">Home</a>
    <a href="/products">Products</a>
    <a href="/about">About</a>
    <a href="/health-check">API Status</a>
  </nav>
</header>
<main>${body}</main>
<footer>Deployed via <strong>KotaCloud Spaces</strong> · service web · ${new Date().toISOString()}</footer>
<script src="/static/app.js"></script>
</body>
</html>`;
}

const views = {
  home: () => layout("Home", `
  <section class="hero">
    <h1>Full-featured demo app</h1>
    <p>Repo ini sengaja dibuat untuk mengetes KotaCloud Spaces dengan service yang kompleks — bukan sekadar landing page.</p>
    <div class="grid">
      <div class="card"><h3>📦 Multi-page routing</h3><p>Home, Products (list + detail + create), About.</p></div>
      <div class="card"><h3>🔗 Service-to-service</h3><p>Form & tombol memanggil <code>/api/*</code> yang di-proxy ke backend Go (service berbeda).</p></div>
      <div class="card"><h3>🗄️ Database</h3><p>Backend tersambung ke Postgres bila env <code>DATABASE_URL</code> diisi — kalau tidak, fallback ke memory.</p></div>
      <div class="card"><h3>📡 Realtime SSE</h3><p>Live feed dari backend via Server-Sent Events.</p></div>
      <div class="card"><h3>🩺 Health check</h3><p><code>/health</code> di backend dan frontend.</p></div>
      <div class="card"><h3>⚙️ Env vars</h3><p><code>PORT</code>, <code>API_BASE_URL</code>, <code>APP_NAME</code> dibaca saat runtime.</p></div>
    </div>
    <p class="cta"><a class="btn" href="/products">Lihat Products →</a></p>
  </section>`),
  about: () => layout("About", `
  <section>
    <h1>About</h1>
    <p>Frontend ini dibangun dengan Node.js murni (tanpa framework) sengaja agar build cepat dan ringan — fokusnya mengetes platform KotaCloud: routing, proxy antar service, env, dan health.</p>
    <ul>
      <li>Frontend: Node.js <code>http</code> module — multi-page + form + proxy API</li>
      <li>Backend: Go — JSON API CRUD + SSE + Postgres</li>
      <li>Database: Postgres (service type DATABASE)</li>
    </ul>
  </section>`),
  notFound: (pathName) => layout("404", `
  <section><h1>404 — halaman tidak ada</h1><p><code>${pathName}</code></p><p><a href="/">← Kembali ke Home</a></p></section>`),
};

// ── Router ────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = u.pathname;

  // 1) proxy API ke backend
  if (pathname.startsWith("/api/")) {
    proxyApi(req, res);
    return;
  }

  // 2) static files
  if (pathname.startsWith("/static/")) {
    const file = path.join(STATIC_DIR, path.basename(pathname));
    fs.readFile(file, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end("not found");
        return;
      }
      res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
      res.end(data);
    });
    return;
  }

  // 3) health
  if (pathname === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", service: "frontend", app_name: APP_NAME, api_configured: !!API_URL, uptime_s: Math.floor(process.uptime()) }));
    return;
  }

  // 4) pages
  const params = u.searchParams;

  // form submit halaman Products (POST form biasa → proxy json fetch di sisi server)
  if (pathname === "/products/create" && req.method === "POST") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const form = new URLSearchParams(body);
      renderProductsPage(res, { flash: `Membuat note "${form.get("title")}"…`, noteTitle: form.get("title") || "", noteBody: form.get("body") || "", doCreate: true });
      // kirim create ke backend secara fire-and-forget
      if (API_URL && form.get("title")) {
        const apiReq = http.request(API_URL + "/api/notes", { method: "POST", headers: { "content-type": "application/json" } }, () => {});
        apiReq.on("error", () => {});
        apiReq.end(JSON.stringify({ title: form.get("title"), body: form.get("body") || "" }));
      }
    });
    return;
  }
  if (pathname === "/products/delete" && req.method === "POST") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const form = new URLSearchParams(body);
      const id = form.get("id");
      if (API_URL && id) {
        const apiReq = http.request(API_URL + `/api/notes/${id}`, { method: "DELETE" }, () => {});
        apiReq.on("error", () => {});
        apiReq.end();
      }
      renderProductsPage(res, { flash: `Menghapus note #${id}…` });
    });
    return;
  }

  switch (true) {
    case pathname === "/":
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(views.home());
      return;
    case pathname === "/about":
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(views.about());
      return;
    case pathname === "/products":
      renderProductsPage(res, { q: params.get("q") || "" });
      return;
    case /^\/products\/\d+$/.test(pathname):
      renderProductDetail(res, Number(pathname.split("/").pop()));
      return;
    case pathname === "/products/create":
      renderProductsPage(res, { showForm: true });
      return;
    case pathname === "/health-check":
      renderHealthPage(res);
      return;
    default:
      res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
      res.end(views.notFound(pathname));
  }
});

// ── Products page (menarik data API dari backend) ─────────────
function fetchJSON(urlPath) {
  return new Promise((resolve) => {
    if (!API_URL) return resolve({ _proxy_error: "API_BASE_URL belum diset" });
    http.get(API_URL + urlPath, (apiRes) => {
      let body = "";
      apiRes.on("data", (c) => (body += c));
      apiRes.on("end", () => {
        try { resolve(JSON.parse(body)); } catch { resolve({ _proxy_error: "response bukan JSON", raw: body.slice(0, 200) }); }
      });
    }).on("error", (err) => resolve({ _proxy_error: err.message }));
  });
}

async function renderProductsPage(res, opts = {}) {
  const data = await fetchJSON("/api/notes");
  const notes = Array.isArray(data.notes) ? data.notes : [];
  const filtered = opts.q ? notes.filter((n) => (n.title || "").toLowerCase().includes(opts.q.toLowerCase())) : notes;
  const flash = opts.flash ? `<div class="flash">${opts.flash}</div>` : "";
  const bar = `
  ${flash}
  <div class="toolbar">
    <form method="get" action="/products" class="inline"><input name="q" placeholder="cari…" value="${opts.q || ""}"><button>cari</button></form>
    <a class="btn small" href="/products/create">+ Note baru</a>
  </div>
  ${data._proxy_error ? `<div class="flash warn">⚠ Backend tidak tersedia: ${data._proxy_error}</div>` : ""}
  ${opts.noteTitle ? `<div class="flash">${opts.doCreate ? "" : "Draft: "}${opts.noteTitle}</div>` : ""}`;
  const rows = filtered.map((n) => `
    <tr>
      <td><a href="/products/${n.id}">#${n.id}</a></td>
      <td>${n.title}</td>
      <td>${(n.body || "").slice(0, 60)}</td>
      <td>${n.status || ""}</td>
      <td>
        <form class="inline" method="post" action="/products/delete"><input type="hidden" name="id" value="${n.id}"><button class="danger">hapus</button></form>
      </td>
    </tr>`).join("\n");
  const formHtml = opts.showForm === true || opts.doCreate ? `
  <h2>Note baru</h2>
  <form method="post" action="/products/create" class="stack">
    <label>Judul <input name="title" required value="${opts.noteTitle || ""}"></label>
    <label>Isi <textarea name="body" rows="3">${opts.noteBody || ""}</textarea></label>
    <button class="btn">Simpan</button>
  </form>` : "";
  const body = `
  <section>
    <h1>Products (Notes)</h1>
    <p>Data diambil dari backend Go via <code>/api/notes</code>. Source: <code>${data.source || (data._proxy_error ? "unreachable" : "?")}</code> · count: <code>${data.count ?? notes.length}</code></p>
    ${bar}
    <table class="list">
      <thead><tr><th>ID</th><th>Judul</th><th>Isi</th><th>DB</th><th></th></tr></thead>
      <tbody>${rows || '<tr><td colspan="5" class="empty">Belum ada data — buat note baru!</td></tr>'}</tbody>
    </table>
    ${formHtml}
    <h2>Live feed (SSE)</h2>
    <pre id="sse-stream">(menghubungkan…)</pre>
  </section>`;
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(layout("Products", body));
}

async function renderProductDetail(res, id) {
  const n = await fetchJSON(`/api/notes/${id}`);
  if (n && n._proxy_error === undefined && n.id) {
    const body = `
    <section>
      <h1>#${n.id} — ${n.title}</h1>
      <pre>${n.body || ""}</pre>
      <p><small>dibuat: ${n.created_at} · db: ${n.status}</small></p>
      <a href="/products">← Semua notes</a>
    </section>`;
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(layout("Detail", body));
  } else {
    const body = `<section><h1>Note #${id} tidak ada</h1><p>${n._proxy_error || ""}</p><a href="/products">← Semua notes</a></section>`;
    res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
    res.end(layout("404", body));
  }
}

async function renderHealthPage(res) {
  const stats = await fetchJSON("/api/stats");
  const body = `
  <section>
    <h1>API Status</h1>
    <pre>${JSON.stringify(stats, null, 2)}</pre>
    <p><a href="/health">/health frontend</a> · <a href="${API_URL || ""}/health" target="_blank">/health backend</a></p>
  </section>`;
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(layout("API Status", body));
}

server.listen(PORT, () => {
  console.log(`[frontend] listening on :${PORT} · APP_NAME=${APP_NAME} · API_BASE_URL=${API_URL || "(belum diset)"}`);
});
