import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Search } from 'lucide-react'
import useAuthStore from '@/store/authStore'
import toast from 'react-hot-toast'

const ROLES = [
  { value:'mahasiswa', label:'Mahasiswa' },
  { value:'dosen',     label:'Dosen' },
  { value:'staf',      label:'Staf Kampus' },
  { value:'security',  label:'Petugas Keamanan' },
]

export default function RegisterPage() {
  const { register: reg } = useAuthStore()
  const navigate  = useNavigate()
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, watch, formState: { errors } } = useForm({ defaultValues: { role:'mahasiswa' } })

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      await reg(data)
      toast.success('Registrasi berhasil!')
      navigate('/')
    } catch (err) {
      const d = err.response?.data
      if (d) Object.values(d).flat().forEach((m) => toast.error(m))
      else toast.error('Registrasi gagal.')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary-600 rounded-2xl mb-4 shadow-lg">
            <Search size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Buat Akun Baru</h1>
          <p className="text-gray-500 text-sm mt-1">Daftarkan diri Anda ke sistem Lost&amp;Found UMS</p>
        </div>

        <div className="card shadow-lg">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="label">Nama Lengkap *</label>
                <input className="input" placeholder="Nama lengkap"
                  {...register('nama_lengkap', { required: 'Wajib diisi' })} />
                {errors.nama_lengkap && <p className="form-error">{errors.nama_lengkap.message}</p>}
              </div>
              <div className="col-span-2">
                <label className="label">Email *</label>
                <input className="input" type="email" placeholder="email@ums.ac.id"
                  {...register('email', { required: 'Wajib diisi' })} />
                {errors.email && <p className="form-error">{errors.email.message}</p>}
              </div>
              <div>
                <label className="label">NIM / NIK</label>
                <input className="input" placeholder="L200230xxx"
                  {...register('nim_nik')} />
              </div>
              <div>
                <label className="label">No. HP</label>
                <input className="input" placeholder="08xxxxxxxxxx"
                  {...register('no_hp')} />
              </div>
              <div className="col-span-2">
                <label className="label">Peran *</label>
                <select className="input" {...register('role')}>
                  {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Password *</label>
                <input className="input" type="password" placeholder="Min. 8 karakter"
                  {...register('password', { required: 'Wajib diisi', minLength: { value:8, message:'Min. 8 karakter' } })} />
                {errors.password && <p className="form-error">{errors.password.message}</p>}
              </div>
              <div>
                <label className="label">Konfirmasi Password *</label>
                <input className="input" type="password" placeholder="Ulangi password"
                  {...register('password2', {
                    required: 'Wajib diisi',
                    validate: (v) => v === watch('password') || 'Password tidak cocok'
                  })} />
                {errors.password2 && <p className="form-error">{errors.password2.message}</p>}
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 justify-center mt-2">
              {loading ? 'Mendaftarkan...' : 'Daftar Sekarang'}
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-4">
            Sudah punya akun?{' '}
            <Link to="/login" className="text-primary-600 font-medium hover:underline">Masuk di sini</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
