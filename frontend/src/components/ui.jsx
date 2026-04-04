import { MapPin, Calendar } from 'lucide-react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'

// ── Badge ─────────────────────────────────────────────────────────────────────
export function BadgeJenis({ jenis }) {
  return jenis === 'hilang'
    ? <span className="badge-hilang">● Hilang</span>
    : <span className="badge-temuan">● Temuan</span>
}

export function BadgeStatus({ status }) {
  const cls = { aktif:'badge-aktif', proses:'badge-proses', diambil:'badge-diambil' }
  const lbl = { aktif:'Aktif', proses:'Dalam Proses', diambil:'Barang Telah Diambil' }
  return <span className={cls[status] ?? 'badge-aktif'}>{lbl[status] ?? status}</span>
}

// ── Item Card ─────────────────────────────────────────────────────────────────
export function ItemCard({ item }) {
  return (
    <Link to={`/barang/${item.id}`}
      className="card hover:shadow-md transition-all flex flex-col group cursor-pointer">
      <div className="relative h-44 bg-gray-100 rounded-xl overflow-hidden mb-3">
        {item.foto_primary
          ? <img src={item.foto_primary} alt={item.judul}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          : <div className="w-full h-full flex items-center justify-center text-gray-300">
              <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
        }
        <div className="absolute top-2 left-2 flex gap-1">
          <BadgeJenis jenis={item.jenis} />
        </div>
        {item.status !== 'aktif' && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <BadgeStatus status={item.status} />
          </div>
        )}
      </div>
      <div className="flex-1 flex flex-col gap-1.5">
        <h3 className="font-semibold text-gray-800 line-clamp-2 text-sm">{item.judul}</h3>
        {item.kategori && <span className="text-xs text-gray-400">{item.kategori.nama}</span>}
        <div className="flex items-center gap-1 text-xs text-gray-500 mt-auto pt-1.5">
          <MapPin size={11} /><span className="truncate">{item.lokasi}</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <Calendar size={11} />
          <span>{item.tanggal_kejadian
            ? format(new Date(item.tanggal_kejadian), 'd MMM yyyy', { locale: id }) : '-'}</span>
        </div>
      </div>
    </Link>
  )
}

// ── Empty State ───────────────────────────────────────────────────────────────
export function EmptyState({ icon: Icon, title, desc, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-4">
      {Icon && <Icon size={48} className="text-gray-200 mb-4" />}
      <h3 className="text-lg font-semibold text-gray-500 mb-1">{title}</h3>
      {desc && <p className="text-sm text-gray-400 mb-6 max-w-xs">{desc}</p>}
      {action}
    </div>
  )
}

// ── Spinner ───────────────────────────────────────────────────────────────────
export function Spinner({ size = 'md', className = '' }) {
  const s = { sm:'h-4 w-4', md:'h-8 w-8', lg:'h-12 w-12' }
  return <div className={`animate-spin rounded-full border-2 border-gray-200 border-t-primary-600 ${s[size]} ${className}`} />
}

export function LoadingPage() {
  return <div className="flex justify-center items-center py-32"><Spinner size="lg" /></div>
}

// ── Pagination ────────────────────────────────────────────────────────────────
export function Pagination({ page, count, pageSize = 12, onChange }) {
  const total = Math.ceil(count / pageSize)
  if (total <= 1) return null
  return (
    <div className="flex justify-center gap-1 mt-8 flex-wrap">
      <button onClick={() => onChange(page - 1)} disabled={page === 1}
        className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-40 hover:bg-gray-50">‹</button>
      {Array.from({ length: total }, (_, i) => i + 1).map((p) => (
        <button key={p} onClick={() => onChange(p)}
          className={`px-3 py-1.5 rounded-lg border text-sm ${p === page ? 'bg-primary-600 text-white border-primary-600' : 'hover:bg-gray-50'}`}>
          {p}
        </button>
      ))}
      <button onClick={() => onChange(page + 1)} disabled={page === total}
        className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-40 hover:bg-gray-50">›</button>
    </div>
  )
}
