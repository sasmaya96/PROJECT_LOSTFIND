// ── BarangListPage ─────────────────────────────────────────────────────────────
import { useEffect, useState, useCallback } from 'react'
import { Search, Filter, X } from 'lucide-react'
import { barangAPI } from '@/services/api'
import { ItemCard, EmptyState, LoadingPage, Pagination } from '@/components/ui'
import { Package } from 'lucide-react'

export function BarangListPage() {
  const [items,    setItems]    = useState([])
  const [count,    setCount]    = useState(0)
  const [loading,  setLoading]  = useState(true)
  const [kategori, setKategori] = useState([])
  const [page,     setPage]     = useState(1)
  const [filter,   setFilter]   = useState({ jenis:'', kategori:'', search:'' })
  const [showF,    setShowF]    = useState(false)

  useEffect(() => {
    barangAPI.getKategori().then(({ data }) => setKategori(data.results ?? data))
  }, [])

  const fetchItems = useCallback(() => {
    setLoading(true)
    const p = { page, search: filter.search }
    if (filter.jenis)    p.jenis    = filter.jenis
    if (filter.kategori) p.kategori = filter.kategori
    barangAPI.getList(p)
      .then(({ data }) => { setItems(data.results ?? []); setCount(data.count ?? 0) })
      .finally(() => setLoading(false))
  }, [page, filter])

  useEffect(() => { fetchItems() }, [fetchItems])

  const setF = (k, v) => { setPage(1); setFilter((f) => ({ ...f, [k]: v })) }
  const hasFilter = filter.jenis || filter.kategori

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Semua Laporan Barang</h1>
        <p className="text-gray-500 text-sm mt-1">{count} laporan ditemukan</p>
      </div>

      {/* Search + filter bar */}
      <div className="flex gap-3 mb-4 flex-col sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Cari judul, lokasi..."
            value={filter.search} onChange={(e) => setF('search', e.target.value)} />
        </div>
        <button onClick={() => setShowF(!showF)}
          className={`btn-secondary ${hasFilter ? 'border-primary-400 text-primary-600' : ''}`}>
          <Filter size={16} /> Filter
          {hasFilter && <span className="bg-primary-600 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">!</span>}
        </button>
      </div>

      {showF && (
        <div className="card mb-5 flex flex-wrap gap-5">
          <div>
            <label className="label">Jenis</label>
            <div className="flex gap-2">
              {[['','Semua'],['hilang','🔴 Hilang'],['temuan','🟢 Temuan']].map(([v,l]) => (
                <button key={v} onClick={() => setF('jenis', v)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors
                    ${filter.jenis === v ? 'bg-primary-600 text-white border-primary-600' : 'bg-white border-gray-300 hover:bg-gray-50'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="label">Kategori</label>
            <select className="input" value={filter.kategori} onChange={(e) => setF('kategori', e.target.value)}>
              <option value="">Semua Kategori</option>
              {kategori.map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}
            </select>
          </div>
          {hasFilter && (
            <div className="flex items-end">
              <button onClick={() => { setFilter({ jenis:'', kategori:'', search:'' }); setPage(1) }}
                className="flex items-center gap-1 text-sm text-red-500 hover:underline">
                <X size={14} /> Reset
              </button>
            </div>
          )}
        </div>
      )}

      {loading ? <LoadingPage /> : items.length === 0 ? (
        <EmptyState icon={Package} title="Tidak ada laporan" desc="Coba ubah filter pencarian." />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {items.map((item) => <ItemCard key={item.id} item={item} />)}
          </div>
          <Pagination page={page} count={count} onChange={setPage} />
        </>
      )}
    </div>
  )
}

export default BarangListPage
