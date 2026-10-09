# kotacloud-demo-frontend

Frontend **Node.js** (murni, tanpa dependency) untuk menguji [KotaCloud Spaces](https://spaces.kotacloud.com) dengan service yang kompleks — bukan sekadar landing page. Dipasangkan dengan [`kotacloud-demo-backend`](../kotacloud-demo-backend) (Go) dan sebuah service Database (Postgres).

## Fitur yang dites di platform

| Fitur platform | Bagaimana repo ini mengetesnya |
|---|---|
| Port dari env | Server bind ke `process.env.PORT` (default 3000) |
| Service type WEB/FRONTEND | `package.json` dengan script `start` → dideteksi engine Node |
| Service-to-service | Semua request `/api/*` di-proxy ke `API_BASE_URL` (service demo-api) |
| Multi-route | `/`, `/about`, `/products`, `/products/:id`, `/products/create`, `/health-check` |
| Form POST | Form create/delete note (server-rendered + fetch ke backend) |
| Streaming | `/api/stream` (SSE) di-proxy langsung (`pipe`) ke backend |
| Static assets | `/static/style.css`, `/static/app.js` |
| Health endpoint | `/health` mengembalikan JSON status |
| Env vars | `PORT`, `API_BASE_URL`, `APP_NAME` |

## Environment variables

| Var | Wajib? | Definisi contoh |
|---|---|---|
| `PORT` | otomatis | diset engine / default `3000` |
| `API_BASE_URL` | ya, kalau mau fitur API aktif | URL service demo-api, contoh: `http://demo-api:8080` atau `http://<host>:<port>` |
| `APP_NAME` | opsional | tampil di header, default `KotaCloud Demo` |

> Setelah service demo-api dibuat, salin URL-nya (subdomain atau host:port yang terlihat di halaman service) ke env `API_BASE_URL` service ini, lalu redeploy.

## Jalankan lokal

```bash
npm start
# buka http://localhost:3000
```

Dengan backend:

```bash
API_BASE_URL=http://localhost:8080 npm start
```
