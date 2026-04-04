import { useEffect, useState, useRef, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { Send, MessageCircle } from 'lucide-react'
import { chatAPI, bukaWsChat } from '@/services/api'
import { LoadingPage, Spinner } from '@/components/ui'
import useAuthStore from '@/store/authStore'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import toast from 'react-hot-toast'

export default function ChatPage() {
  const { user } = useAuthStore()
  const location  = useLocation()

  const [ruangs,       setRuangs]       = useState([])
  const [activeRuang,  setActiveRuang]  = useState(null)
  const [messages,     setMessages]     = useState([])
  const [inputMsg,     setInputMsg]     = useState('')
  const [loadingRuang, setLoadingRuang] = useState(true)
  const [wsStatus,     setWsStatus]     = useState('idle') // idle | connecting | open | closed

  const wsRef      = useRef(null)
  const bottomRef  = useRef(null)

  // Fetch daftar ruang
  const fetchRuangs = useCallback(() => {
    chatAPI.daftarRuang()
      .then(({ data }) => setRuangs(data.results ?? data))
      .catch(() => {})
      .finally(() => setLoadingRuang(false))
  }, [])

  useEffect(() => { fetchRuangs() }, [fetchRuangs])

  // Buka ruang dari state navigasi (misal dari halaman detail barang)
  useEffect(() => {
    if (location.state?.ruangId) {
      bukaRuangChat(location.state.ruangId)
    }
  }, [location.state])

  // Scroll ke bawah saat ada pesan baru
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Buka WebSocket untuk ruang tertentu
  const bukaRuangChat = (ruangId) => {
    // Tutup WS lama jika ada
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    setMessages([])
    setActiveRuang(ruangId)
    setWsStatus('connecting')

    const ws = bukaWsChat(ruangId)
    wsRef.current = ws

    ws.onopen = () => setWsStatus('open')

    ws.onmessage = (e) => {
      const data = JSON.parse(e.data)
      if (data.type === 'riwayat') {
        setMessages(data.pesan)
      } else if (data.type === 'pesan_baru') {
        setMessages((prev) => [...prev, data.pesan])
        // Update preview pesan terakhir di sidebar
        fetchRuangs()
      } else if (data.type === 'error') {
        toast.error(data.message)
      }
    }

    ws.onclose = (e) => {
      setWsStatus('closed')
      // Reconnect otomatis kecuali ditutup manual (4001/4003)
      if (e.code !== 4001 && e.code !== 4003 && e.code !== 1000) {
        setTimeout(() => bukaRuangChat(ruangId), 3000)
      }
    }

    ws.onerror = () => setWsStatus('closed')
  }

  const kirimPesan = () => {
    const isi = inputMsg.trim()
    if (!isi || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
    wsRef.current.send(JSON.stringify({ type: 'pesan', isi }))
    setInputMsg('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); kirimPesan() }
  }

  // Cleanup saat unmount
  useEffect(() => {
    return () => { if (wsRef.current) wsRef.current.close(1000) }
  }, [])

  // Cari detail ruang yang aktif
  const detailRuangAktif = ruangs.find((r) => r.id === activeRuang)

  // Nama lawan bicara
  const nameLawan = detailRuangAktif?.peserta
    ?.filter((p) => p.id !== user?.id)
    ?.map((p) => p.nama_lengkap)
    ?.join(', ') ?? 'Chat'

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-5">Pesan</h1>

      <div className="flex gap-4 h-[600px]">
        {/* Sidebar daftar ruang */}
        <div className="w-64 flex-shrink-0 flex flex-col border border-gray-200 rounded-2xl overflow-hidden bg-white">
          <div className="px-4 py-3 border-b border-gray-100 font-semibold text-sm text-gray-700">
            Percakapan
          </div>
          {loadingRuang
            ? <div className="flex-1 flex items-center justify-center"><Spinner /></div>
            : ruangs.length === 0
              ? <div className="flex-1 flex flex-col items-center justify-center text-gray-400 text-sm p-4 text-center">
                  <MessageCircle size={32} className="mb-2 text-gray-200" />
                  Belum ada percakapan.<br />Buka dari halaman detail barang.
                </div>
              : <div className="flex-1 overflow-y-auto">
                  {ruangs.map((r) => {
                    const lawan = r.peserta?.filter((p) => p.id !== user?.id) ?? []
                    const namaLawan = lawan.map((p) => p.nama_lengkap).join(', ') || 'Pengguna'
                    return (
                      <button key={r.id} onClick={() => bukaRuangChat(r.id)}
                        className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors
                          ${activeRuang === r.id ? 'bg-primary-50 border-l-2 border-l-primary-500' : ''}`}>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="font-medium text-sm text-gray-800 truncate max-w-[140px]">{namaLawan}</span>
                          {r.jumlah_belum_dibaca > 0 && (
                            <span className="bg-primary-600 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0">
                              {r.jumlah_belum_dibaca}
                            </span>
                          )}
                        </div>
                        {r.laporan_info && (
                          <p className="text-xs text-gray-400 truncate">re: {r.laporan_info.judul}</p>
                        )}
                        {r.pesan_terakhir && (
                          <p className="text-xs text-gray-400 truncate mt-0.5">{r.pesan_terakhir.isi}</p>
                        )}
                      </button>
                    )
                  })}
                </div>
          }
        </div>

        {/* Area chat */}
        <div className="flex-1 flex flex-col border border-gray-200 rounded-2xl overflow-hidden bg-white">
          {!activeRuang ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
              <MessageCircle size={48} className="mb-3 text-gray-200" />
              <p className="text-sm">Pilih percakapan untuk mulai chat</p>
            </div>
          ) : (
            <>
              {/* Header chat */}
              <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-800">{nameLawan}</p>
                  {detailRuangAktif?.laporan_info && (
                    <p className="text-xs text-gray-400">re: {detailRuangAktif.laporan_info.judul}</p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className={`w-2 h-2 rounded-full ${wsStatus === 'open' ? 'bg-green-500' : wsStatus === 'connecting' ? 'bg-yellow-400' : 'bg-gray-300'}`} />
                  <span className="text-gray-400">
                    {wsStatus === 'open' ? 'Terhubung' : wsStatus === 'connecting' ? 'Menghubungkan...' : 'Terputus'}
                  </span>
                </div>
              </div>

              {/* Pesan */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                {messages.length === 0 && wsStatus === 'open' && (
                  <p className="text-center text-sm text-gray-400 mt-8">Belum ada pesan. Mulai percakapan!</p>
                )}
                {messages.map((msg) => {
                  const isSaya = msg.pengirim_id === user?.id
                  return (
                    <div key={msg.id} className={`flex ${isSaya ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] ${isSaya ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                        {!isSaya && (
                          <span className="text-xs text-gray-400 px-1">{msg.pengirim_nama}</span>
                        )}
                        <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed
                          ${isSaya
                            ? 'bg-primary-600 text-white rounded-br-sm'
                            : 'bg-gray-100 text-gray-800 rounded-bl-sm'}`}>
                          {msg.isi}
                        </div>
                        <span className="text-[10px] text-gray-400 px-1">
                          {msg.created_at
                            ? format(new Date(msg.created_at), 'HH:mm', { locale: id })
                            : ''}
                        </span>
                      </div>
                    </div>
                  )
                })}
                <div ref={bottomRef} />
              </div>

              {/* Input pesan */}
              <div className="px-4 py-3 border-t border-gray-100">
                <div className="flex gap-2 items-end">
                  <textarea
                    className="input resize-none flex-1 max-h-28 min-h-[44px]"
                    placeholder="Ketik pesan... (Enter untuk kirim)"
                    rows={1}
                    value={inputMsg}
                    onChange={(e) => setInputMsg(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={wsStatus !== 'open'}
                  />
                  <button onClick={kirimPesan}
                    disabled={!inputMsg.trim() || wsStatus !== 'open'}
                    className="btn-primary px-3 py-2.5 flex-shrink-0">
                    <Send size={18} />
                  </button>
                </div>
                {wsStatus === 'closed' && (
                  <p className="text-xs text-yellow-600 mt-1.5">Koneksi terputus. Mencoba menghubungkan ulang...</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
