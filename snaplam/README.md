# SnapLam - Downloader

Fullstack Node.js (Express + EJS + Socket.IO + SQLite) multi-platform downloader dengan tema retro pastel, chat realtime, dan panel admin.

## ✨ Fitur
- **Auth JWT**: Login/Register, cookie httpOnly. Admin default: `lamzy` / `adminzyy969` (auto-seed saat pertama kali jalan).
- **Tema**: abu (default), biru, putih, orange, emas — tersimpan per user, desain organik (no kotak siku, full rounded + blob glow).
- **Downloader**: Multi platform (TikTok, YouTube, Instagram, Facebook, Twitter/X, dll), pilih resolusi 1080p/720p. Progress bar + log terminal realtime via Socket.IO.
- **Dashboard**: Riwayat unduhan per user.
- **Admin Panel**: Lihat log terminal semua user realtime (sukses/gagal/error), daftar user, broadcast notifikasi ke semua user.
- **Chat Room**: Realtime di sidebar kiri atas, tersimpan di SQLite.
- **Ringan**: SQLite file-based (better-sqlite3), tanpa dependency berat.

## 🚀 Menjalankan Lokal
```bash
npm install
cp .env.example .env
npm start
```
Buka `http://localhost:80` (ubah `PORT` di `.env` jika 80 butuh sudo, mis. `PORT=3000`).

## ⚙️ Environment Variables
| Var | Default | Keterangan |
|---|---|---|
| `PORT` | `80` | Port server |
| `JWT_SECRET` | - | **Wajib diganti** di production |
| `ADMIN_USERNAME` | `lamzy` | Username admin (di-seed otomatis) |
| `ADMIN_PASSWORD` | `adminzyy969` | Password admin (di-seed otomatis) |
| `DOWNLOAD_API_URL` | `https://dl.valore.web.id/api/download` | Endpoint API downloader |

## 🐳 Deploy ke Pterodactyl (Port 80)
1. Buat server baru dengan egg **Node.js** (generic/yarn/nodejs egg).
2. Upload seluruh isi folder ini ke direktori server (atau via Git).
3. Startup command: `node server.js`
4. Set variable `PORT` sesuai port yang dialokasikan Pterodactyl (default allocation biasanya bukan 80 — gunakan port yang di-assign panel; app otomatis membaca `process.env.PORT`).
5. Jika ingin memaksa port 80, pastikan allocation server memang 80 dan container punya izin bind (jalankan sebagai user dengan capability net_bind_service, atau gunakan port >1024 lalu reverse-proxy dari 80).
6. Install dependencies: `npm install` (biasanya otomatis lewat panel "Install").
7. Start server dari panel.

## 🚂 Deploy ke Railway
1. Push project ini ke repo GitHub.
2. Buat New Project di Railway → Deploy from GitHub Repo.
3. Railway otomatis mendeteksi Node.js, jalankan `npm install` lalu `npm start`.
4. Set Environment Variables di tab **Variables**: `JWT_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `DOWNLOAD_API_URL`. **Jangan set `PORT` manual** — Railway inject otomatis, dan `server.js` sudah membaca `process.env.PORT`.
5. Deploy. Domain publik otomatis tersedia dari tab **Settings → Networking**.

> Catatan: SQLite disimpan di `data/snaplam.db`. Di Railway, storage bersifat ephemeral kecuali kamu attach Volume — jika butuh data persisten jangka panjang, tambahkan Railway Volume dan mount ke folder `data/`.

## 📁 Struktur Folder
```
snaplam/
├── server.js              # Entry point Express + Socket.IO
├── db.js                  # Setup & migrasi SQLite (better-sqlite3)
├── middleware/auth.js     # JWT sign/verify + guard routes
├── routes/
│   ├── auth.js            # Login, Register, Logout, ganti tema
│   ├── download.js        # POST /api/download, GET /api/history
│   └── admin.js           # Log semua user, notifikasi broadcast, stats
├── socket/index.js        # Auth socket via cookie JWT, chat, room per-user & admin
├── views/                 # EJS templates
├── public/css/style.css   # Tema retro pastel + responsive
├── public/js/             # theme.js, chat.js, dashboard.js, admin.js
└── data/snaplam.db        # Database (auto-generate saat start)
```

## 🔌 API Endpoints
| Method | Endpoint | Auth | Keterangan |
|---|---|---|---|
| POST | `/register` | - | Daftar akun baru |
| POST | `/login` | - | Login, set cookie JWT |
| GET | `/logout` | - | Hapus cookie |
| POST | `/theme` | User | Ganti tema UI |
| POST | `/api/download` | User | Proses unduhan (call API eksternal + log realtime) |
| GET | `/api/history` | User | Riwayat unduhan user |
| GET | `/api/admin/logs` | Admin | Semua log unduhan semua user |
| GET | `/api/admin/users` | Admin | Daftar semua user |
| GET | `/api/admin/stats` | Admin | Statistik ringkas |
| POST | `/api/admin/notify` | Admin | Broadcast notifikasi ke semua user (Socket.IO) |

## 🔒 Keamanan
- Password di-hash dengan bcrypt.
- Token JWT disimpan di cookie httpOnly (tidak bisa diakses JS client).
- Socket.IO diautentikasi lewat cookie JWT sebelum koneksi diterima (`io.use` middleware).
- Role-based guard (`requireAdmin`) untuk semua endpoint & halaman admin.

## 🧪 Pengujian Manual Endpoint
Setelah `npm start`, jalankan cek cepat:
```bash
curl -i http://localhost:PORT/login
curl -i -X POST http://localhost:PORT/register -H "Content-Type: application/json" -d '{"username":"testuser","password":"12345","confirm":"12345"}'
curl -i -X POST http://localhost:PORT/login -H "Content-Type: application/json" -d '{"username":"lamzy","password":"adminzyy969"}'
```
Semua route sudah dibungkus try/catch dan validasi input dasar (URL valid, panjang password, dsb) untuk mencegah crash.

---
© lamzysoloera
