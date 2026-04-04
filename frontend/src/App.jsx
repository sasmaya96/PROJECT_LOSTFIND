import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import useAuthStore from '@/store/authStore'
import Layout         from '@/components/Layout'
import ProtectedRoute from '@/components/ProtectedRoute'
import { LoadingPage } from '@/components/ui'

import LoginPage      from '@/pages/LoginPage'
import RegisterPage   from '@/pages/RegisterPage'
import HomePage       from '@/pages/HomePage'
import BarangListPage from '@/pages/BarangListPage'
import BarangDetailPage from '@/pages/BarangDetailPage'
import LaporPage      from '@/pages/LaporPage'
import LaporanSayaPage from '@/pages/LaporanSayaPage'
import ChatPage       from '@/pages/ChatPage'
import NotifikasiPage from '@/pages/NotifikasiPage'
import ProfilPage     from '@/pages/ProfilPage'

export default function App() {
  const { init, isLoading } = useAuthStore()
  useEffect(() => { init() }, [init])

  if (isLoading) return <LoadingPage />

  return (
    <Routes>
      <Route path="/login"    element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route element={<Layout />}>
        <Route index           element={<HomePage />} />
        <Route path="/barang"  element={<BarangListPage />} />
        <Route path="/barang/:id" element={<BarangDetailPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/lapor"        element={<LaporPage />} />
          <Route path="/laporan-saya" element={<LaporanSayaPage />} />
          <Route path="/chat"         element={<ChatPage />} />
          <Route path="/notifikasi"   element={<NotifikasiPage />} />
          <Route path="/profil"       element={<ProfilPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
