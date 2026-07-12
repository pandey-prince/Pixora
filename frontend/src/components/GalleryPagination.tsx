interface GalleryPaginationProps {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
}

export const GalleryPagination = ({ page, totalPages, total, onPageChange }: GalleryPaginationProps) => {
  if (totalPages <= 1) return null;

  return (
    <nav
      aria-label="Gallery pagination"
      className="mt-8 flex flex-wrap items-center justify-center gap-3"
    >
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Previous
      </button>
      <p className="text-sm font-medium text-slate-600">
        Page {page} of {totalPages}
        <span className="ml-2 text-slate-400">({total} photos)</span>
      </p>
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Next
      </button>
    </nav>
  );
};
