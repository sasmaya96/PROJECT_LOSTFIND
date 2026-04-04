import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { User, Save, Camera, LogOut } from 'lucide-react'
import { authAPI } from '@/services/api'
import useAuthStore from '@/store/authStore'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

const ROLE_LABEL = {
  mahasiswa: 'Mahasiswa', dosen: 'Dosen',
  staf: 'Staf Kampus', security: 'Petugas Keamanan', admin: 'Administrator',
}

export default function ProfilPage() {
  const { user, setUser, logout } = useAuthStore()
  const navigate = useNavigate()
  const [loading, setLoading]   = useState(false)
  const [fotoPreview, setFotoPreview] = useState(null)
  const [fotoFile,    setFotoFile]    = useState(null)

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      nama_lengkap: user?.nama_lengkap ?? '',
      nim_nik:      user?.nim_nik ?? '',
      no_hp:        user?.no_hp ?? '',
    },
  })

  const handleFoto = (e) => {
    const f = e.target.files[0]
    if (!f) return
    setFotoFile(f)
    setFotoPreview(URL.createObjectURL(f))
  }

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('nama_lengkap', data.nama_lengkap)
      if (data.nim_nik) fd.append('nim_nik', data.nim_nik)
      if (data.no_hp)   fd.append('no_hp',   data.no_hp)
      if (fotoFile)     fd.append('foto_profil', fotoFile)

      const { data: updated } = await authAPI.updateProfile(fd)
      setUser(updated)
      toast.success('Profil berhasil diperbarui.')
    } catch (err) {
      const d = err.response?.data
      if (d) Object.values(d).flat().forEach((m) => toast.error(m))
      else toast.error('Gagal memperbarui profil.')
    } finally { setLoading(false) }
  }

  const handleLogout = async () => {
    await logout()
    toast.success('Berhasil logout.')
    navigate('/login')
  }

  const avatarSrc = fotoPreview ?? user?.foto_profil ?? null

  return (
    <div className="max-w-lg mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Profil Saya</h1>

      {/* Avatar */}
      <div className="flex flex-col items-center mb-8">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-primary-100 flex items-center justify-center overflow-hidden border-4 border-white shadow-md">
            {avatarSrc
              ? <img src={avatarSrc} alt="Profil" className="w-full h-full object-cover" />
              : <User size={36} className="text-primary-400" />}
          </div>
          <label className="absolute bottom-0 right-0 bg-primary-600 text-white w-7 h-7 rounded-full flex items-center justify-center cursor-pointer shadow hover:bg-primary-700 transition-colors">
            <Camera size={14} />
            <input type="file" accept="image/*" className="sr-only" onChange={handleFoto} />
          </label>
        </div>
        <p className="mt-3 font-semibold text-gray-800">{user?.nama_lengkap}</p>
        <span className="text-sm text-gray-400">{ROLE_LABEL[user?.role] ?? user?.role}</span>
      </div>

      {/* Form */}
      <div className="card">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Email (read-only) */}
          <div>
            <label className="label text-gray-400">Email (tidak bisa diubah)</label>
            <input className="input bg-gray-50 text-gray-400 cursor-not-allowed"
              value={user?.email ?? ''} disabled />
          </div>

          <div>
            <label className="label">Nama Lengkap *</label>
            <input className="input"
              {...register('nama_lengkap', { required: 'Nama wajib diisi' })} />
            {errors.nama_lengkap && <p className="form-error">{errors.nama_lengkap.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">NIM / NIK</label>
              <input className="input" placeholder="L200230xxx"
                {...register('nim_nik')} />
            </div>
            <div>
              <label className="label">No. HP / WhatsApp</label>
              <input className="input" placeholder="08xxxxxxxxxx"
                {...register('no_hp')} />
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="btn-primary w-full justify-center py-2.5 mt-2">
            {loading
              ? <><div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> Menyimpan...</>
              : <><Save size={16} /> Simpan Perubahan</>}
          </button>
        </form>
      </div>

      {/* Logout */}
      <div className="mt-4">
        <button onClick={handleLogout}
          className="btn-danger w-full justify-center py-2.5">
          <LogOut size={16} /> Logout
        </button>
      </div>
    </div>
  )
}
