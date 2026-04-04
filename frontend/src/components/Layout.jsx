import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { Search, PlusCircle, Package, User, LogOut, Menu, X,
         Home, Bell, MessageCircle } from 'lucide-react'
import { useState, useEffect } from 'react'
import useAuthStore from '@/store/authStore'
import { notifAPI } from '@/services/api'
import toast from 'react-hot-toast'

export default function Layout() {
  const { isAuthenticated, user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen]           = useState(false)
  const [unread, setUnread]       = useState(0)

  // Poll unread count tiap 30 detik
  useEffect(() => {
    if (!isAuthenticated) return
    const fetch = () => notifAPI.unreadCount().then(({ data }) => setUnread(data.unread_count)).catch(() => {})
    fetch()
    const timer = setInterval(fetch, 30000)
    return () => clearInterval(timer)
  }, [isAuthenticated])

  const handleLogout = async () => {
    await logout()
    toast.success('Berhasil logout')
    navigate('/login')
  }

  const isActive = (to) => to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)

  const navLinks = [
    { to: '/',      label: 'Beranda',  icon: Home },
    { to: '/barang',label: 'Barang',   icon: Package },
  ]

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 font-bold text-primary-600 text-lg">
            <Search size={20} />
            <span>Lost<span className="text-gray-800">&Found</span></span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(({ to, label, icon: Icon }) => (
              <Link key={to} to={to}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                  ${isActive(to) ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-100'}`}>
                <Icon size={16} />{label}
              </Link>
            ))}
          </nav>

          {/* Desktop right */}
          <div className="hidden md:flex items-center gap-2">
            {isAuthenticated ? (
              <>
                <Link to="/lapor" className="btn-primary text-sm">
                  <PlusCircle size={16} /> Lapor
                </Link>
                {/* Notifikasi */}
                <Link to="/notifikasi" className="relative btn-ghost px-2.5 py-2">
                  <Bell size={18} />
                  {unread > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                </Link>
                {/* Chat */}
                <Link to="/chat" className="btn-ghost px-2.5 py-2">
                  <MessageCircle size={18} />
                </Link>
                {/* Profile dropdown */}
                <div className="relative group">
                  <button className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-100 text-sm text-gray-700">
                    <div className="w-7 h-7 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 text-xs font-bold">
                      {user?.nama_lengkap?.[0] ?? 'U'}
                    </div>
                    <span className="max-w-[100px] truncate">{user?.nama_lengkap}</span>
                  </button>
                  <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-100 rounded-xl shadow-lg py-1 hidden group-hover:block z-50">
                    <Link to="/laporan-saya" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                      <Package size={14} /> Laporan Saya
                    </Link>
                    <Link to="/profil" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                      <User size={14} /> Profil
                    </Link>
                    <hr className="my-1 border-gray-100" />
                    <button onClick={handleLogout}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full">
                      <LogOut size={14} /> Logout
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <Link to="/login"    className="btn-secondary text-sm">Masuk</Link>
                <Link to="/register" className="btn-primary text-sm">Daftar</Link>
              </>
            )}
          </div>

          {/* Mobile toggle */}
          <button onClick={() => setOpen(!open)} className="md:hidden btn-ghost p-2">
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile menu */}
        {open && (
          <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-1">
            {navLinks.map(({ to, label, icon: Icon }) => (
              <Link key={to} to={to} onClick={() => setOpen(false)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium
                  ${isActive(to) ? 'bg-primary-50 text-primary-700' : 'text-gray-700'}`}>
                <Icon size={16} />{label}
              </Link>
            ))}
            {isAuthenticated ? (
              <>
                <hr className="border-gray-100 my-2" />
                <Link to="/lapor"        onClick={() => setOpen(false)} className="flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700"><PlusCircle size={16} /> Buat Laporan</Link>
                <Link to="/notifikasi"   onClick={() => setOpen(false)} className="flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700">
                  <Bell size={16} /> Notifikasi {unread > 0 && <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{unread}</span>}
                </Link>
                <Link to="/chat"         onClick={() => setOpen(false)} className="flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700"><MessageCircle size={16} /> Chat</Link>
                <Link to="/laporan-saya" onClick={() => setOpen(false)} className="flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700"><Package size={16} /> Laporan Saya</Link>
                <Link to="/profil"       onClick={() => setOpen(false)} className="flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700"><User size={16} /> Profil</Link>
                <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-2.5 text-sm text-red-600 w-full">
                  <LogOut size={16} /> Logout
                </button>
              </>
            ) : (
              <>
                <hr className="border-gray-100 my-2" />
                <Link to="/login"    onClick={() => setOpen(false)} className="block px-3 py-2.5 text-sm text-gray-700">Masuk</Link>
                <Link to="/register" onClick={() => setOpen(false)} className="block px-3 py-2.5 text-sm text-primary-600 font-medium">Daftar</Link>
              </>
            )}
          </div>
        )}
      </header>

      <main className="flex-1"><Outlet /></main>

      <footer className="bg-white border-t border-gray-100 py-5 text-center text-xs text-gray-400">
        © 2026 Lost &amp; Found AI — Universitas Muhammadiyah Surakarta
      </footer>
    </div>
  )
}
