import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, CheckCheck, Package, MessageCircle, ShieldCheck, Info } from 'lucide-react'
import { notifAPI } from '@/services/api'
import { EmptyState, LoadingPage } from '@/components/ui'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import toast from 'react-hot-toast'

const TIPE_ICON = {
  klaim_masuk:     { icon: Package,      cls: 'bg-blue-100 text-blue-600' },
  klaim_disetujui: { icon: ShieldCheck,  cls: 'bg-green-100 text-green-600' },
  klaim_ditolak:   { icon: ShieldCheck,  cls: 'bg-red-100 text-red-500' },
  pesan_baru:      { icon: MessageCircle,cls: 'bg-purple-100 text-purple-600' },
  info:            { icon: Info,         cls: 'bg-gray-100 text-gray-500' },
}

export default function NotifikasiPage() {
  const [notifs,   setNotifs]   = useState([])
  const [loading,  setLoading]  = useState(true)

  const fetchNotifs = () => {
    setLoading(true)
    notifAPI.getAll()
      .then(({ data }) => setNotifs(data.results ?? data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchNotifs() }, [])

  const handleBacaSemua = async () => {
    await notifAPI.bacaSemua()
    setNotifs((prev) => prev.map((n) => ({ ...n, sudah_dibaca: true })))
    toast.success('Semua notifikasi ditandai sudah dibaca.')
  }

  const handleBaca = async (notifId) => {
    await notifAPI.baca(notifId)
    setNotifs((prev) => prev.map((n) => n.id === notifId ? { ...n, sudah_dibaca: true } : n))
  }

  const unreadCount = notifs.filter((n) => !n.sudah_dibaca).length

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifikasi</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-gray-500 mt-0.5">{unreadCount} belum dibaca</p>
          )}
        </div>
        {unreadCount > 0 && (
          <button onClick={handleBacaSemua}
            className="btn-secondary text-sm gap-1.5">
            <CheckCheck size={15} /> Tandai semua dibaca
          </button>
        )}
      </div>

      {loading ? <LoadingPage /> : notifs.length === 0 ? (
        <EmptyState icon={Bell} title="Tidak ada notifikasi"
          desc="Notifikasi klaim, pesan, dan info sistem akan muncul di sini." />
      ) : (
        <div className="space-y-2">
          {notifs.map((n) => {
            const tipe    = TIPE_ICON[n.tipe] ?? TIPE_ICON.info
            const Icon    = tipe.icon
            return (
              <div key={n.id}
                onClick={() => { if (!n.sudah_dibaca) handleBaca(n.id) }}
                className={`flex gap-4 p-4 rounded-2xl border transition-colors cursor-pointer
                  ${n.sudah_dibaca
                    ? 'bg-white border-gray-100 hover:bg-gray-50'
                    : 'bg-blue-50 border-blue-100 hover:bg-blue-100'}`}>

                {/* Ikon */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${tipe.cls}`}>
                  <Icon size={18} />
                </div>

                {/* Konten */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-semibold ${n.sudah_dibaca ? 'text-gray-700' : 'text-gray-900'}`}>
                      {n.judul}
                    </p>
                    {!n.sudah_dibaca && (
                      <span className="w-2 h-2 bg-primary-600 rounded-full flex-shrink-0 mt-1.5" />
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{n.pesan}</p>
                  <p className="text-xs text-gray-400 mt-1.5">
                    {format(new Date(n.created_at), 'd MMM yyyy, HH:mm', { locale: id })}
                  </p>
                  {n.laporan && (
                    <Link to={`/barang/${n.laporan}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs text-primary-600 hover:underline mt-1 inline-block">
                      Lihat laporan →
                    </Link>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
