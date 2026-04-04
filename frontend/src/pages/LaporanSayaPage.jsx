import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PlusCircle, Package, Trash2, CheckCircle } from 'lucide-react'
import { barangAPI, klaimAPI } from '@/services/api'
import { ItemCard, EmptyState, LoadingPage, BadgeStatus } from '@/components/ui'
import toast from 'react-hot-toast'

export default function LaporanSayaPage() {
  const [items,      setItems]      = useState([])
  const [klaimSaya,  setKlaimSaya]  = useState([])
  const [loading,    setLoading]    = useState(true)
  const [tab,        setTab]        = useState('laporan') // 'laporan' | 'klaim'

  const fetchData = () => {
    setLoading(true)
    Promise.all([
      barangAPI.milikSaya(),
      klaimAPI.klaimSaya(),
    ]).then(([l, k]) => {
      setItems(l.data.results ?? l.data)
      setKlaimSaya(k.data.results ?? k.data)
    }).catch(() => toast.error('Gagal memuat data.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [])

  const handleDelete = async (id) => {
    if (!window.confirm('Hapus laporan ini?')) return
    try {
      await barangAPI.delete(id)
      setItems((prev) => prev.filter((i) => i.id !== id))
      toast.success('Laporan dihapus.')
    } catch { toast.error('Gagal menghapus.') }
  }

  const handleTandaiSelesai = async (id) => {
    try {
      await barangAPI.updateStatus(id, 'diambil')
      setItems((prev) => prev.map((i) => i.id === id ? { ...i, status: 'diambil' } : i))
      toast.success('Status diubah ke "Barang Telah Diambil".')
    } catch { toast.error('Gagal mengubah status.') }
  }

  const STATUS_KLAIM = {
    menunggu:  { cls: 'bg-yellow-100 text-yellow-700', label: 'Menunggu Verifikasi' },
    disetujui: { cls: 'bg-green-100 text-green-700',  label: 'Disetujui ✅' },
    ditolak:   { cls: 'bg-red-100 text-red-600',      label: 'Ditolak ❌' },
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Laporan Saya</h1>
        <Link to="/lapor" className="btn-primary text-sm">
          <PlusCircle size={16} /> Buat Laporan
        </Link>
      </div>

      {/* Tab */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
        {[
          { key: 'laporan', label: `Laporan Saya (${items.length})` },
          { key: 'klaim',   label: `Klaim Saya (${klaimSaya.length})` },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${tab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {loading ? <LoadingPage /> : (
        <>
          {/* Tab: Laporan Saya */}
          {tab === 'laporan' && (
            items.length === 0 ? (
              <EmptyState icon={Package} title="Belum ada laporan"
                desc="Anda belum pernah membuat laporan barang hilang atau temuan."
                action={<Link to="/lapor" className="btn-primary"><PlusCircle size={16} /> Buat Laporan</Link>} />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {items.map((item) => (
                  <div key={item.id} className="relative">
                    <ItemCard item={item} />
                    {/* Action overlay */}
                    <div className="flex gap-1.5 mt-2">
                      {item.status === 'aktif' && (
                        <button onClick={() => handleTandaiSelesai(item.id)}
                          className="flex-1 flex items-center justify-center gap-1 text-xs py-1.5 rounded-lg bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors">
                          <CheckCircle size={12} /> Selesai
                        </button>
                      )}
                      <button onClick={() => handleDelete(item.id)}
                        className="flex-1 flex items-center justify-center gap-1 text-xs py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors">
                        <Trash2 size={12} /> Hapus
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* Tab: Klaim Saya */}
          {tab === 'klaim' && (
            klaimSaya.length === 0 ? (
              <EmptyState icon={Package} title="Belum ada klaim"
                desc="Anda belum pernah mengajukan klaim barang." />
            ) : (
              <div className="space-y-4">
                {klaimSaya.map((k) => {
                  const st = STATUS_KLAIM[k.status] ?? STATUS_KLAIM.menunggu
                  return (
                    <div key={k.id} className="card flex flex-col sm:flex-row gap-4 items-start">
                      {/* Foto KTM kecil */}
                      {k.foto_ktm_url && (
                        <img src={k.foto_ktm_url} alt="KTM"
                          className="w-24 h-18 object-cover rounded-xl flex-shrink-0 border" />
                      )}
                      <div className="flex-1 space-y-1.5">
                        <Link to={`/barang/${k.laporan_info?.id}`}
                          className="font-semibold text-gray-800 hover:text-primary-600 transition-colors">
                          {k.laporan_info?.judul}
                        </Link>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${st.cls}`}>
                            {st.label}
                          </span>
                          {k.laporan_info?.jenis === 'hilang'
                            ? <span className="badge-hilang">Hilang</span>
                            : <span className="badge-temuan">Temuan</span>}
                        </div>
                        {k.keterangan && (
                          <p className="text-sm text-gray-500 line-clamp-2">{k.keterangan}</p>
                        )}
                        {k.catatan_admin && (
                          <p className="text-xs text-gray-400 italic">Catatan: {k.catatan_admin}</p>
                        )}
                        <p className="text-xs text-gray-400">
                          Diajukan: {new Date(k.created_at).toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' })}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          )}
        </>
      )}
    </div>
  )
}
