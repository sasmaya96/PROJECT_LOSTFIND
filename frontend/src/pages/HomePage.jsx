import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, PlusCircle, ArrowRight, Package, ShieldCheck } from 'lucide-react'
import { barangAPI } from '@/services/api'
import { ItemCard, LoadingPage } from '@/components/ui'
import useAuthStore from '@/store/authStore'

export default function HomePage() {
  const { isAuthenticated } = useAuthStore()
  const [recent,  setRecent]  = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    barangAPI.getList({ page: 1 })
      .then(({ data }) => setRecent(data.results?.slice(0, 6) ?? []))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4 leading-tight">
            Temukan Barang Hilang<br />di Kampus UMS
          </h1>
          <p className="text-primary-100 text-lg mb-8 max-w-xl mx-auto">
            Platform terpusat untuk melaporkan dan menemukan barang hilang.
            Cari berdasarkan kategori, klaim dengan verifikasi KTM, dan chat langsung dengan penemu.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/barang" className="flex items-center gap-2 bg-white text-primary-700 font-semibold px-6 py-3 rounded-xl hover:bg-primary-50 transition-colors">
              <Search size={18} /> Cari Barang
            </Link>
            {isAuthenticated
              ? <Link to="/lapor" className="flex items-center gap-2 bg-primary-500 border border-primary-400 text-white font-semibold px-6 py-3 rounded-xl hover:bg-primary-400 transition-colors">
                  <PlusCircle size={18} /> Buat Laporan
                </Link>
              : <Link to="/register" className="flex items-center gap-2 bg-primary-500 border border-primary-400 text-white font-semibold px-6 py-3 rounded-xl hover:bg-primary-400 transition-colors">
                  Daftar Gratis <ArrowRight size={18} />
                </Link>
            }
          </div>
        </div>
      </section>

      {/* Cara kerja */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-gray-800 mb-10">Cara Kerja</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { icon: PlusCircle, color:'bg-blue-100 text-blue-600',   title:'1. Laporkan', desc:'Upload foto barang temuan beserta lokasi dan kategori.' },
              { icon: Search,     color:'bg-purple-100 text-purple-600', title:'2. Cari & Temukan', desc:'Pemilik mencari berdasarkan kategori, lalu ajukan klaim dengan foto KTM.' },
              { icon: ShieldCheck,color:'bg-green-100 text-green-600',  title:'3. Verifikasi & Ambil', desc:'Penemu verifikasi foto KTM, status berubah jadi "Barang Telah Diambil".' },
            ].map(({ icon: Icon, color, title, desc }) => (
              <div key={title} className="card text-center">
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${color} mb-4`}>
                  <Icon size={22} />
                </div>
                <h3 className="font-semibold text-gray-800 mb-2">{title}</h3>
                <p className="text-sm text-gray-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Laporan terbaru */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Laporan Terbaru</h2>
            <Link to="/barang" className="flex items-center gap-1 text-primary-600 text-sm hover:underline">
              Lihat semua <ArrowRight size={14} />
            </Link>
          </div>
          {loading ? <LoadingPage /> : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {recent.map((item) => <ItemCard key={item.id} item={item} />)}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
