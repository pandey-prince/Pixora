export const GallerySkeleton = () => (
  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-4 xl:grid-cols-5 2xl:grid-cols-6">
    {Array.from({ length: 12 }).map((_, index) => (
      <div key={index} className="aspect-square animate-pulse rounded-[1.35rem] bg-slate-200/80" />
    ))}
  </div>
);
