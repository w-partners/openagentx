'use client';

import { Button } from '@/components/ui/button';

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}

const LIMIT_OPTIONS = [10, 20, 50, 100];

function getPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages: (number | '...')[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) pages.push('...');
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < total - 1) pages.push('...');
  pages.push(total);
  return pages;
}

export default function AdminPagination({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
  onLimitChange,
}: PaginationProps) {
  if (total === 0) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4">
      {/* Left: total count + limit selector */}
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span>총 {total.toLocaleString()}건</span>
        <select
          value={limit}
          onChange={(e) => onLimitChange(Number(e.target.value))}
          className="h-8 rounded-md border border-input bg-background px-2 text-xs"
        >
          {LIMIT_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n}개씩
            </option>
          ))}
        </select>
      </div>

      {/* Right: page navigation */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          {/* First */}
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2 text-xs"
            disabled={page <= 1}
            onClick={() => onPageChange(1)}
          >
            {'<<'}
          </Button>
          {/* Prev */}
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2 text-xs"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            {'<'}
          </Button>

          {/* Page numbers */}
          {getPageNumbers(page, totalPages).map((p, idx) =>
            p === '...' ? (
              <span key={`dots-${idx}`} className="px-1 text-xs text-muted-foreground">
                ...
              </span>
            ) : (
              <Button
                key={p}
                variant={p === page ? 'default' : 'outline'}
                size="sm"
                className="h-8 w-8 px-0 text-xs"
                onClick={() => onPageChange(p)}
              >
                {p}
              </Button>
            ),
          )}

          {/* Next */}
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2 text-xs"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            {'>'}
          </Button>
          {/* Last */}
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2 text-xs"
            disabled={page >= totalPages}
            onClick={() => onPageChange(totalPages)}
          >
            {'>>'}
          </Button>

          {/* Page info */}
          <span className="ml-2 text-xs text-muted-foreground whitespace-nowrap">
            {page} / {totalPages} 페이지
          </span>
        </div>
      )}
    </div>
  );
}
