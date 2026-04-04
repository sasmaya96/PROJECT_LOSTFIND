// LaporPage.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Upload, X, ImagePlus } from 'lucide-react'
import { barangAPI } from '@/services/api'
import toast from 'react-hot-toast'

export function LaporPage() {
  const navigate  = useNavigate()
  const [loading,  setLoading]  = useState(false)
  const [kategori, setKategori] = useState([])
  const [photos,   setPhotos]   = useState([])
  const { register, handleSubmit, watch, formState: { errors } } = useForm({ defaultValues: { jenis:'hilang' } })

  useEffect(() => {
    barangAPI.getKategori().then(({ data }) => setKategori(data.results ?? data))
  }, [])

  const addPhoto = (e) => {
    const files = Array.from(e.target.files)
    setPhotos((prev) => [...prev, ...files.map((f) => ({ file: f, preview: URL.createObjectURL(f) }))].slice(0, 5))
    e.target.value = ''
  }

  const onSubmit = async (data) => {
    if (photos.length === 0) { toast.error('Upload minimal 1 foto barang.'); return }
    setLoading(true)
    try {
      const payload = { jenis: data.jenis, judul: data.judul, deskripsi: data.deskripsi,
        lokasi: data.lokasi, tanggal_kejadian: data.tanggal_kejadian,
        kontak_wa: data.kontak_wa || null }
      if (data.kategori_id) payload.kategori_id = Number(data.kategori_id)
      const { data: laporan } = await barangAPI.create(payload)
      for (let i = 0; i < photos.length; i++) {
        const fd = new FormData()
        fd.append('fotos', photos[i].file)
        await barangAPI.uploadFoto(laporan.id, fd)
      }
      toast.success('Laporan berhasil dibuat!')
      navigate(`/barang/${laporan.id}`)
    } catch (err) {
      const d = err.response?.data
      if (d) Object.entries(d).forEach(([k,v]) => toast.error(`${k}: ${Array.isArray(v)?v[0]:v}`))
      else toast.error('Gagal membuat laporan.')
    } finally { setLoading(false) }
  }

  const jenis = watch('jenis')

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Buat Laporan Baru</h1>
      <p className="text-gray-500 text-sm mb-8">Isi detail barang hilang atau temuan Anda.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Jenis */}
        <div className="card">
          <label className="label mb-3">Jenis Laporan *</label>
          <div className="grid grid-cols-2 gap-3">
            {[['hilang','🔴 Barang Hilang','Saya kehilangan barang'],
              ['temuan','🟢 Barang Temuan','Saya menemukan barang orang lain']].map(([v,l,d]) => (
              <label key={v} className={`flex flex-col gap-1 border-2 rounded-xl p-4 cursor-pointer transition-colors
                ${jenis === v ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}`}>
                <input type="radio" value={v} className="sr-only" {...register('jenis')} />
                <span className="font-semibold text-sm">{l}</span>
                <span className="text-xs text-gray-500">{d}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Detail */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-800">Detail Barang</h2>
          <div>
            <label className="label">Judul Laporan *</label>
            <input className="input" placeholder='Contoh: "Dompet hitam hilang di kantin FKI"'
              {...register('judul', { required:'Judul wajib diisi' })} />
            {errors.judul && <p className="form-error">{errors.judul.message}</p>}
          </div>
          <div>
            <label className="label">Kategori</label>
            <select className="input" {...register('kategori_id')}>
              <option value="">-- Pilih Kategori --</option>
              {kategori.map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Deskripsi *</label>
            <textarea className="input resize-none" rows={4}
              placeholder="Warna, merek, ciri khas, isi barang, dsb."
              {...register('deskripsi', { required:'Deskripsi wajib diisi' })} />
            {errors.deskripsi && <p className="form-error">{errors.deskripsi.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Lokasi *</label>
              <input className="input" placeholder='Kantin FKI, Gedung E Lt.2'
                {...register('lokasi', { required:'Lokasi wajib diisi' })} />
              {errors.lokasi && <p className="form-error">{errors.lokasi.message}</p>}
            </div>
            <div>
              <label className="label">Tanggal *</label>
              <input type="date" className="input"
                {...register('tanggal_kejadian', { required:'Tanggal wajib diisi' })} />
              {errors.tanggal_kejadian && <p className="form-error">{errors.tanggal_kejadian.message}</p>}
            </div>
          </div>
          <div>
            <label className="label">No. WhatsApp Penghubung</label>
            <input className="input" placeholder="628xxxxxxx (tanpa + atau spasi)"
              {...register('kontak_wa')} />
          </div>
        </div>

        {/* Upload Foto */}
        <div className="card space-y-3">
          <div>
            <h2 className="font-semibold text-gray-800">Foto Barang *</h2>
            <p className="text-xs text-gray-400 mt-1">Maksimal 5 foto. Foto pertama = foto utama.</p>
          </div>
          {photos.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {photos.map((p, i) => (
                <div key={i} className="relative group aspect-square">
                  <img src={p.preview} alt="" className="w-full h-full object-cover rounded-xl" />
                  {i === 0 && <span className="absolute bottom-1 left-1 bg-primary-600 text-white text-[9px] px-1.5 py-0.5 rounded">Utama</span>}
                  <button type="button" onClick={() => setPhotos((prev) => prev.filter((_,idx) => idx !== i))}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 hidden group-hover:flex">
                    <X size={11} />
                  </button>
                </div>
              ))}
            </div>
          )}
          {photos.length < 5 && (
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-8 cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-colors">
              <ImagePlus size={28} className="text-gray-300 mb-2" />
              <span className="text-sm text-gray-500">Klik untuk upload foto</span>
              <input type="file" accept="image/*" multiple className="sr-only" onChange={addPhoto} />
            </label>
          )}
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full py-3 justify-center text-base">
          {loading ? <><div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> Menyimpan...</>
            : <><Upload size={18} /> Buat Laporan</>}
        </button>
      </form>
    </div>
  )
}

export default LaporPage
