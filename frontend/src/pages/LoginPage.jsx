import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Eye, EyeOff, Search } from 'lucide-react'
import useAuthStore from '@/store/authStore'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const { login } = useAuthStore()
  const navigate  = useNavigate()
  const [showPw, setShowPw]   = useState(false)
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm()

  const onSubmit = async ({ email, password }) => {
    setLoading(true)
    try {
      await login(email, password)
      toast.success('Selamat datang!')
      navigate('/')
    } catch (err) {
      toast.error(err.response?.data?.detail ?? 'Email atau password salah.')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary-600 rounded-2xl mb-4 shadow-lg">
            <Search size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Masuk ke Lost&Found</h1>
          <p className="text-gray-500 text-sm mt-1">Sistem barang hilang &amp; temuan UMS</p>
        </div>

        <div className="card shadow-lg">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" placeholder="email@ums.ac.id"
                {...register('email', { required: 'Email wajib diisi' })} />
              {errors.email && <p className="form-error">{errors.email.message}</p>}
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input className="input pr-10" type={showPw ? 'text' : 'password'}
                  placeholder="Password Anda"
                  {...register('password', { required: 'Password wajib diisi' })} />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="form-error">{errors.password.message}</p>}
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 justify-center mt-2">
              {loading ? 'Memproses...' : 'Masuk'}
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-4">
            Belum punya akun?{' '}
            <Link to="/register" className="text-primary-600 font-medium hover:underline">Daftar di sini</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
