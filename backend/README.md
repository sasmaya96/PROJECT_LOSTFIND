# 🔍 Lost & Found — Backend API

Backend Django REST Framework untuk sistem barang hilang & temuan kampus UMS.

---

## 📦 Tech Stack
- **Django 4.2** + Django REST Framework
- **SQLite** (database lokal)
- **JWT** Auth via `djangorestframework-simplejwt`
- **Django Channels** + **Daphne** untuk WebSocket (DM realtime)
- **Pillow** untuk upload foto

---

## 📂 Struktur Project

```
lostfound_backend/
├── config/               ← settings, urls, asgi, wsgi
├── lostfound/            ← app utama (user, barang, klaim, notif)
│   ├── models.py
│   ├── serializers.py
│   ├── filters.py
│   ├── views/
│   │   ├── auth_views.py
│   │   ├── barang_views.py
│   │   └── notif_views.py
│   └── urls/
│       ├── auth.py
│       ├── barang.py
│       └── notifikasi.py
├── chat/                 ← app DM realtime (WebSocket)
│   ├── models.py
│   ├── consumers.py      ← WebSocket handler
│   ├── middleware.py     ← JWT auth untuk WS
│   ├── routing.py
│   ├── serializers.py
│   ├── views.py
│   └── urls.py
├── media/                ← upload foto barang & KTM
├── manage.py
└── requirements.txt
```

---

## 🚀 Cara Setup & Menjalankan

### 1. Install dependencies

```bash
# Buat virtual environment
python -m venv env
source env/bin/activate       # Linux/Mac
env\Scripts\activate          # Windows

pip install -r requirements.txt
```

### 2. Migrasi & seed data

```bash
python manage.py makemigrations lostfound chat
python manage.py migrate
python manage.py seed_kategori        # isi 12 kategori barang default
python manage.py createsuperuser      # buat akun admin
```

### 3. Jalankan server

```bash
# Pakai daphne (support HTTP + WebSocket sekaligus)
daphne -p 8000 config.asgi:application

# Atau pakai runserver biasa (hanya HTTP, WebSocket tidak jalan)
python manage.py runserver
```

> ⚠️ Untuk WebSocket DM realtime, **wajib pakai daphne**, bukan `runserver`.

---

## 📡 API Endpoints

### 🔐 Auth  (`/api/auth/`)
| Method | URL         | Deskripsi                         | Auth |
|--------|-------------|-----------------------------------|------|
| POST   | `login/`    | Login email + password → JWT token | ❌  |
| POST   | `register/` | Daftar akun baru                  | ❌   |
| POST   | `refresh/`  | Refresh access token              | ❌   |
| GET    | `profile/`  | Lihat profil sendiri              | ✅   |
| PATCH  | `profile/`  | Edit profil + foto profil         | ✅   |
| POST   | `logout/`   | Logout (blacklist refresh token)  | ✅   |

#### Contoh Login
```json
POST /api/auth/login/
{
  "email": "user@ums.ac.id",
  "password": "password123"
}
```
Response:
```json
{
  "access": "eyJ...",
  "refresh": "eyJ..."
}
```

---

### 📦 Barang  (`/api/barang/`)
| Method | URL                               | Deskripsi                        | Auth |
|--------|-----------------------------------|----------------------------------|------|
| GET    | `kategori/`                       | Daftar kategori barang           | ❌   |
| GET    | `/`                               | List semua laporan (+ filter)    | ❌   |
| POST   | `/`                               | Buat laporan baru                | ✅   |
| GET    | `<id>/`                           | Detail laporan                   | ❌   |
| PATCH  | `<id>/`                           | Edit laporan (owner)             | ✅   |
| DELETE | `<id>/`                           | Hapus laporan (owner)            | ✅   |
| GET    | `saya/`                           | Laporan milik saya               | ✅   |
| POST   | `<id>/fotos/`                     | Upload foto barang (multi)       | ✅   |
| PATCH  | `<id>/status/`                    | Ubah status manual               | ✅   |
| POST   | `<id>/klaim/`                     | Ajukan klaim + upload foto KTM   | ✅   |
| GET    | `<id>/klaim/list/`                | Lihat klaim masuk (owner/admin)  | ✅   |
| GET    | `klaim/saya/`                     | Daftar klaim yang saya ajukan    | ✅   |
| POST   | `klaim/<klaim_id>/verifikasi/`    | Approve / reject klaim           | ✅   |

#### Filter Laporan
```
GET /api/barang/?jenis=temuan&kategori=1&status=aktif&search=dompet
GET /api/barang/?tanggal_dari=2026-01-01&tanggal_sampai=2026-03-31
```

#### Upload Foto Barang (multipart)
```
POST /api/barang/<id>/fotos/
Content-Type: multipart/form-data
fotos: <file1>, <file2>, ...
```

#### Ajukan Klaim Barang (multipart)
```
POST /api/barang/<id>/klaim/
Content-Type: multipart/form-data
foto_ktm:   <file foto KTM/KTP>
keterangan: "Dompet saya warna coklat, ada foto keluarga di dalamnya"
```

#### Verifikasi Klaim (approve / reject)
```json
POST /api/barang/klaim/<klaim_id>/verifikasi/
{
  "aksi": "approve",
  "catatan": "KTM cocok, silakan ambil barang di pos keamanan gedung B"
}
```
Saat disetujui:
- Status klaim → `disetujui`
- Status laporan → **`diambil`** (otomatis)
- Klaim lain yang masih menunggu → `ditolak` (otomatis)
- Notifikasi dikirim ke pengklaim ✅

---

### 🔔 Notifikasi  (`/api/notif/`)
| Method | URL                  | Deskripsi                       | Auth |
|--------|----------------------|---------------------------------|------|
| GET    | `/`                  | Daftar semua notifikasi saya    | ✅   |
| GET    | `unread-count/`      | Jumlah notif belum dibaca       | ✅   |
| PATCH  | `baca-semua/`        | Tandai semua sudah dibaca       | ✅   |
| PATCH  | `<id>/baca/`         | Tandai satu notif sudah dibaca  | ✅   |

---

### 💬 Chat  (`/api/chat/` + WebSocket)

#### REST API
| Method | URL                    | Deskripsi                         | Auth |
|--------|------------------------|-----------------------------------|------|
| GET    | `/`                    | Daftar ruang DM saya              | ✅   |
| POST   | `buka/`                | Buka/buat ruang DM dengan user    | ✅   |
| GET    | `<ruang_id>/`          | Detail ruang chat                 | ✅   |
| GET    | `<ruang_id>/pesan/`    | Riwayat pesan (pagination)        | ✅   |

#### Buka Ruang DM
```json
POST /api/chat/buka/
{
  "user_id": 5,
  "laporan_id": 12
}
```

#### WebSocket (Realtime)
```
ws://localhost:8000/ws/chat/<ruang_id>/?token=<access_token>
```

**Kirim pesan:**
```json
{ "type": "pesan", "isi": "Halo, apakah ini dompet saya?" }
```

**Tandai sudah dibaca:**
```json
{ "type": "baca" }
```

**Event yang diterima:**
```json
{ "type": "pesan_baru", "pesan": { "id": 1, "isi": "...", "pengirim_nama": "...", "created_at": "..." } }
{ "type": "riwayat",    "pesan": [ ... ] }
{ "type": "error",      "message": "..." }
```

---

## 🔄 Alur Klaim Barang

```
Penemu upload barang (foto + kategori + lokasi)
         │
         ▼
Pemilik menemukan laporan (filter kategori/search)
         │
         ▼
Pemilik ajukan klaim → upload foto KTM + keterangan
         │
         ▼
Penemu/Admin terima notifikasi "Ada Klaim Baru"
         │
         ▼
Penemu/Admin lihat foto KTM di /api/barang/<id>/klaim/list/
         │
    ┌────┴────┐
    ▼         ▼
 Approve    Reject
    │         │
    ▼         ▼
Status laporan    Notifikasi ke
→ "Barang Telah   pengklaim bahwa
  Diambil" ✅     klaim ditolak ❌
```

---

## 👥 Tim
| Nama                         | NIM        | Peran              |
|------------------------------|------------|--------------------|
| Sasmaya Sri Candra S. Oetomo | L200230214 | Backend Developer  |

---
*Universitas Muhammadiyah Surakarta — Capstone Project 2026*
