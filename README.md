# 🔍 Lost & Found — UMS

Sistem barang hilang & temuan kampus dengan DM realtime dan verifikasi KTM.

---

## 📂 Struktur Project

```
PROJECT_LOSTFIND/
├── backend/         ← Django REST API + WebSocket
└── frontend/        ← Vite + React + Tailwind CSS
```

---

## 🚀 Setup dari Awal

### ── BACKEND ──────────────────────────────────────────

#### 1. Buat & aktifkan virtual environment

```bash
cd PROJECT_LOSTFIND

python -m venv env
env\Scripts\activate        # Windows
source env/bin/activate     # Mac / Linux
```

#### 2. Masuk ke folder backend & install dependencies

```bash
cd backend
pip install -r requirements.txt
```

#### 3. Buat file .env

```bash
cp .env.example .env   # Mac/Linux
copy .env.example .env # Windows
```

Isi `.env` (default sudah siap untuk development, tidak perlu diubah):
```env
SECRET_KEY=django-insecure-ganti-ini-dengan-key-yang-panjang-dan-acak
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
```

#### 4. Migrasi database & isi data awal

```bash
python manage.py makemigrations lostfound chat
python manage.py migrate
python manage.py seed_kategori
```

#### 5. Buat akun admin

```bash
python manage.py createsuperuser
# Masukkan: email, nama_lengkap, password
```

#### 6. Jalankan backend

```bash
# Wajib pakai daphne agar WebSocket DM bisa jalan
daphne -p 8000 config.asgi:application
```

Backend jalan di → `http://localhost:8000`
Admin panel      → `http://localhost:8000/admin`

---

### ── FRONTEND ─────────────────────────────────────────

Buka **terminal baru** (biarkan backend tetap jalan).

#### 1. Masuk ke folder frontend & install dependencies

```bash
cd PROJECT_LOSTFIND/frontend
npm install
```

#### 2. Jalankan frontend

```bash
npm run dev
```

Frontend jalan di → `http://localhost:5173`

> Vite sudah dikonfigurasi proxy ke backend port 8000,
> jadi tidak perlu CORS issue saat development.

---

## 🔄 Cara Pakai Sehari-hari

Setiap kali mau development, jalankan **dua terminal**:

```bash
# Terminal 1 — Backend
cd PROJECT_LOSTFIND/backend
env\Scripts\activate      # atau source env/bin/activate
daphne -p 8000 config.asgi:application

# Terminal 2 — Frontend
cd PROJECT_LOSTFIND/frontend
npm run dev
```

---

## 📡 Fitur & Endpoint Utama

| Fitur | Endpoint |
|---|---|
| Register / Login | `POST /api/auth/register/` `/login/` |
| Daftar & filter barang | `GET /api/barang/?jenis=temuan&kategori=1` |
| Upload barang temuan | `POST /api/barang/` + `POST /api/barang/<id>/fotos/` |
| Klaim + upload KTM | `POST /api/barang/<id>/klaim/` |
| Approve / reject klaim | `POST /api/barang/klaim/<id>/verifikasi/` |
| DM WebSocket | `ws://localhost:8000/ws/chat/<ruang_id>/?token=...` |
| Notifikasi | `GET /api/notif/` |

---

## ⚠️ Troubleshooting

| Error | Solusi |
|---|---|
| `ModuleNotFoundError` | Pastikan env aktif: `env\Scripts\activate` |
| `no such table` | Jalankan `python manage.py migrate` |
| WebSocket tidak konek | Pastikan pakai `daphne`, bukan `runserver` |
| CORS error di browser | Pastikan frontend jalan di port 5173 |
| Port 8000 sudah dipakai | `daphne -p 8001 config.asgi:application` lalu ubah proxy di `vite.config.js` |

---

*Universitas Muhammadiyah Surakarta — Capstone Project 2026*
