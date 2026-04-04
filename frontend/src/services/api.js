import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

// Sisipkan token di setiap request
api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('access')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

// Auto-refresh token saat 401
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const orig = err.config
    if (err.response?.status === 401 && !orig._retry) {
      orig._retry = true
      try {
        const refresh = localStorage.getItem('refresh')
        const { data } = await axios.post('/api/auth/refresh/', { refresh })
        localStorage.setItem('access', data.access)
        orig.headers.Authorization = `Bearer ${data.access}`
        return api(orig)
      } catch {
        localStorage.clear()
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)

export default api

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authAPI = {
  login:   (d) => api.post('/auth/login/', d),
  register:(d) => api.post('/auth/register/', d),
  logout:  (d) => api.post('/auth/logout/', d),
  profile: ()  => api.get('/auth/profile/'),
  updateProfile: (d) => api.patch('/auth/profile/', d, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
}

// ── Barang ────────────────────────────────────────────────────────────────────
export const barangAPI = {
  getKategori: ()       => api.get('/barang/kategori/'),
  getList:  (params)    => api.get('/barang/', { params }),
  getById:  (id)        => api.get(`/barang/${id}/`),
  create:   (d)         => api.post('/barang/', d),
  update:   (id, d)     => api.patch(`/barang/${id}/`, d),
  delete:   (id)        => api.delete(`/barang/${id}/`),
  milikSaya:()          => api.get('/barang/saya/'),
  uploadFoto:(id, fd)   => api.post(`/barang/${id}/fotos/`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  updateStatus:(id, s)  => api.patch(`/barang/${id}/status/`, { status: s }),
}

// ── Klaim ──────────────────────────────────────────────────────────────────────
export const klaimAPI = {
  ajukan:      (laporanId, fd) => api.post(`/barang/${laporanId}/klaim/`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  listKlaim:   (laporanId) => api.get(`/barang/${laporanId}/klaim/list/`),
  klaimSaya:   ()          => api.get('/barang/klaim/saya/'),
  verifikasi:  (klaimId, d)=> api.post(`/barang/klaim/${klaimId}/verifikasi/`, d),
}

// ── Notifikasi ────────────────────────────────────────────────────────────────
export const notifAPI = {
  getAll:      () => api.get('/notif/'),
  unreadCount: () => api.get('/notif/unread-count/'),
  bacaSemua:   () => api.patch('/notif/baca-semua/'),
  baca:        (id) => api.patch(`/notif/${id}/baca/`),
}

// ── Chat ──────────────────────────────────────────────────────────────────────
export const chatAPI = {
  daftarRuang:  ()          => api.get('/chat/'),
  bukaRuang:    (d)         => api.post('/chat/buka/', d),
  detailRuang:  (id)        => api.get(`/chat/${id}/`),
  riwayatPesan: (id)        => api.get(`/chat/${id}/pesan/`),
}

// ── WebSocket helper ──────────────────────────────────────────────────────────
export const bukaWsChat = (ruangId) => {
  const token = localStorage.getItem('access')
  return new WebSocket(`ws://localhost:8000/ws/chat/${ruangId}/?token=${token}`)
}
