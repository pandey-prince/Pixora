import { LoaderCircle } from "lucide-react";
import { useEffect, useRef } from "react";

interface InfiniteScrollTriggerProps {
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
}

export const InfiniteScrollTrigger = ({ hasMore, isLoading, onLoadMore }: InfiniteScrollTriggerProps) => {
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const trigger = triggerRef.current;
    if (!trigger || !hasMore) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !isLoading) onLoadMore();
      },
      { rootMargin: "500px 0px" },
    );
    observer.observe(trigger);
    return () => observer.disconnect();
  }, [hasMore, isLoading, onLoadMore]);

  return (
    <div ref={triggerRef} className="grid min-h-24 place-items-center">
      {isLoading && <LoaderCircle className="animate-spin text-violet-500" size={24} />}
      {!hasMore && <p className="text-sm text-slate-400">You’ve reached the end of your gallery.</p>}
    </div>
  );
};
