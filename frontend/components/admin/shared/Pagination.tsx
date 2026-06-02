import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'

export function Pagination({
  page, total, limit, onPage,
}: {
  page: number
  total: number
  limit: number
  onPage: (p: number) => void
}) {
  const { t } = useTranslation()
  const pages = Math.ceil(total / limit) || 1
  if (pages <= 1 && total > 0) return (
    <p className="text-xs text-on-surface-variant pt-1">{total} {t.admin.total}</p>
  )
  return (
    <div className="flex items-center justify-between pt-2">
      <span className="text-xs text-on-surface-variant">{total} {t.admin.total}</span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page === 1}
          className="p-1.5 rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container-high disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label={t.admin.prevPage}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm text-on-surface w-14 text-center">{page} / {pages}</span>
        <button
          onClick={() => onPage(page + 1)}
          disabled={page >= pages}
          className="p-1.5 rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container-high disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label={t.admin.nextPage}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
