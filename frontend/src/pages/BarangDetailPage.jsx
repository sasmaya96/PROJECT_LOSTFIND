import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { MapPin, Calendar, Phone, User, ChevronLeft, CheckCircle, XCircle, MessageCircle, Upload } from 'lucide-react'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { barangAPI, klaimAPI, chatAPI } from '@/services/api'
import { BadgeJenis, BadgeStatus, LoadingPage } from '@/components/ui'
import useAuthStore from '@/store/authStore'
import toast from 'react-hot-toast'

export default function BarangDetailPage() {
  const { id: laporanId } = useParams()
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuthStore()

  const [laporan,   setLaporan]   = useState(null)
  const [klaims,    setKlaims]    = useState([])
  const [loading,   setLoading]   = useState(true)
  const [activeImg, setActiveImg] = useState(0)

  // State form klaim
  const [klaimMode, setKlaimMode] = useState(false)
  const [ktmFile,   setKtmFile]   = useState(null)
  const [ktmPrev,   setKtmPrev]   = useState(null)
  const [keterangan, setKeterangan] = useState('')
  const [submitting,  setSubmitting] = useState(false)

  const isOwner = user?.id === laporan?.pelapor?.id

  useEffect(() => {
    Promise.all([
      barangAPI.getById(laporanId),
      isAuthenticated ? klaimAPI.listKlaim(laporanId).catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
    ]).then(([l, k]) => {
      setLaporan(l.data)
      setKlaims(k.data.results ?? k.data)
    }).catch(() => toast.error('Gagal memuat data.'))
      .finally(() => setLoading(false))
  }, [laporanId, isAuthenticated])

  const handleKlaimSubmit = async () => {
    if (!ktmFile) { toast.error('Upload foto KTM terlebih dahulu.'); return }
    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.append('foto_ktm', ktmFile)
      fd.append('keterangan', keterangan)
      //nambahin id dari barang
      fd.append('laporan', laporanId)
      await klaimAPI.ajukan(laporanId, fd)
      toast.success('Klaim berhasil diajukan! Tunggu verifikasi dari penemu.')
      setKlaimMode(false)
      // refresh
      const l = await barangAPI.getById(laporanId)
      setLaporan(l.data)
    } catch (err) {
      const d = err.response?.data
      if (d) Object.values(d).flat().forEach((m) => toast.error(m))
      else toast.error('Gagal mengajukan klaim.')
    } finally { setSubmitting(false) }
  }

  const handleVerifikasi = async (klaimId, aksi) => {
    try {
      await klaimAPI.verifikasi(klaimId, { aksi })
      toast.success(aksi === 'approve' ? 'Klaim disetujui! Status barang diubah ke "Barang Telah Diambil".' : 'Klaim ditolak.')
      const [l, k] = await Promise.all([barangAPI.getById(laporanId), klaimAPI.listKlaim(laporanId)])
      setLaporan(l.data); setKlaims(k.data.results ?? k.data)
    } catch { toast.error('Gagal memproses klaim.') }
  }

  const handleBukaChat = async (userId) => {
    try {
      const { data } = await chatAPI.bukaRuang({ user_id: userId, laporan_id: Number(laporanId) })
      navigate('/chat', { state: { ruangId: data.id } })
    } catch { toast.error('Gagal membuka chat.') }
  }

  if (loading) return <LoadingPage />
  if (!laporan) return <div className="text-center py-20 text-gray-400">Laporan tidak ditemukan.</div>

  const fotos = laporan.fotos ?? []
  const klaimSaya = laporan.klaim_saya

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-6">
        <ChevronLeft size={16} /> Kembali
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Foto */}
        <div>
          <div className="h-80 bg-gray-100 rounded-2xl overflow-hidden mb-3 relative">
            {fotos.length > 0
              ? <img src={fotos[activeImg]?.foto_url} alt={laporan.judul} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-gray-300 text-sm">Tidak ada foto</div>
            }
          </div>
          {fotos.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {fotos.map((f, i) => (
                <button key={f.id} onClick={() => setActiveImg(i)}
                  className={`flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-colors ${i === activeImg ? 'border-primary-500' : 'border-transparent'}`}>
                  <img src={f.foto_url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <BadgeJenis jenis={laporan.jenis} />
            <BadgeStatus status={laporan.status} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{laporan.judul}</h1>
          {laporan.kategori && <p className="text-sm text-gray-400">Kategori: <strong>{laporan.kategori.nama}</strong></p>}
          <p className="text-gray-600 text-sm leading-relaxed">{laporan.deskripsi}</p>

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-gray-600"><MapPin size={14} className="text-gray-400" />{laporan.lokasi}</div>
            <div className="flex items-center gap-2 text-gray-600"><Calendar size={14} className="text-gray-400" />
              {format(new Date(laporan.tanggal_kejadian), 'd MMMM yyyy', { locale: id })}
            </div>
            <div className="flex items-center gap-2 text-gray-600"><User size={14} className="text-gray-400" />
              {laporan.pelapor?.nama_lengkap}
            </div>
          </div>

          {laporan.kontak_wa && (
            <a href={`https://wa.me/${laporan.kontak_wa}`} target="_blank" rel="noreferrer"
              className="btn bg-green-500 hover:bg-green-600 text-white w-fit">
              <Phone size={15} /> Hubungi via WhatsApp
            </a>
          )}

          {/* Tombol Chat dengan pelapor */}
          {isAuthenticated && !isOwner && (
            <button onClick={() => handleBukaChat(laporan.pelapor?.id)} className="btn-secondary w-fit">
              <MessageCircle size={15} /> Chat dengan {laporan.pelapor?.nama_lengkap}
            </button>
          )}

          {/* Klaim — hanya tampil jika bukan owner & status aktif */}
          {isAuthenticated && !isOwner && laporan.status === 'aktif' && (
            <div className="pt-2 border-t border-gray-100">
              {klaimSaya ? (
                <div className={`text-sm font-medium px-3 py-2 rounded-xl w-fit
                  ${klaimSaya.status === 'menunggu' ? 'bg-yellow-50 text-yellow-700' :
                    klaimSaya.status === 'disetujui' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                  Klaim Anda: {klaimSaya.status === 'menunggu' ? 'Menunggu verifikasi' :
                               klaimSaya.status === 'disetujui' ? 'Disetujui ✅' : 'Ditolak ❌'}
                </div>
              ) : !klaimMode ? (
                <button onClick={() => setKlaimMode(true)} className="btn-primary">
                  <CheckCircle size={15} /> Ajukan Klaim Barang Ini
                </button>
              ) : (
                <div className="space-y-3 bg-blue-50 rounded-2xl p-4">
                  <h3 className="font-semibold text-gray-800 text-sm">Upload Foto KTM / KTP sebagai Bukti</h3>
                  {ktmPrev
                    ? <img src={ktmPrev} alt="KTM" className="h-32 rounded-xl object-cover border" />
                    : (
                      <label className="flex flex-col items-center justify-center border-2 border-dashed border-blue-300 rounded-xl p-6 cursor-pointer hover:bg-blue-100 transition-colors">
                        <Upload size={24} className="text-blue-400 mb-2" />
                        <span className="text-xs text-blue-600 font-medium">Klik untuk upload foto KTM/KTP</span>
                        <input type="file" accept="image/*" className="sr-only"
                          onChange={(e) => { const f = e.target.files[0]; if (f) { setKtmFile(f); setKtmPrev(URL.createObjectURL(f)) } }} />
                      </label>
                    )}
                  <textarea className="input resize-none" rows={3}
                    placeholder="Jelaskan ciri khas barang Anda untuk membuktikan kepemilikan..."
                    value={keterangan} onChange={(e) => setKeterangan(e.target.value)} />
                  <div className="flex gap-2">
                    <button onClick={handleKlaimSubmit} disabled={submitting} className="btn-primary flex-1 justify-center">
                      {submitting ? 'Mengirim...' : 'Kirim Klaim'}
                    </button>
                    <button onClick={() => { setKlaimMode(false); setKtmFile(null); setKtmPrev(null) }}
                      className="btn-secondary">Batal</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Daftar klaim — hanya untuk owner */}
      {isOwner && klaims.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Klaim Masuk ({klaims.length})</h2>
          <div className="space-y-4">
            {klaims.map((k) => (
              <div key={k.id} className="card flex flex-col sm:flex-row gap-4">
                {/* Foto KTM */}
                <img src={k.foto_ktm_url} alt="KTM" className="w-32 h-24 object-cover rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-1">
                  <p className="font-semibold text-gray-800">{k.pengklaim?.nama_lengkap}</p>
                  <p className="text-sm text-gray-500">{k.keterangan || 'Tidak ada keterangan tambahan.'}</p>
                  <p className="text-xs text-gray-400">{format(new Date(k.created_at), 'd MMM yyyy, HH:mm', { locale: id })}</p>
                  <div className="flex items-center gap-1 text-xs">
                    Status:
                    <span className={`font-semibold ml-1 ${k.status === 'menunggu' ? 'text-yellow-600' : k.status === 'disetujui' ? 'text-green-600' : 'text-red-500'}`}>
                      {k.status === 'menunggu' ? 'Menunggu' : k.status === 'disetujui' ? 'Disetujui ✅' : 'Ditolak ❌'}
                    </span>
                  </div>
                </div>
                {k.status === 'menunggu' && laporan.status !== 'diambil' && (
                  <div className="flex sm:flex-col gap-2 justify-end">
                    <button onClick={() => handleVerifikasi(k.id, 'approve')}
                      className="btn bg-green-500 hover:bg-green-600 text-white text-xs py-1.5 px-3">
                      <CheckCircle size={14} /> Setujui
                    </button>
                    <button onClick={() => handleVerifikasi(k.id, 'reject')}
                      className="btn bg-red-500 hover:bg-red-600 text-white text-xs py-1.5 px-3">
                      <XCircle size={14} /> Tolak
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
