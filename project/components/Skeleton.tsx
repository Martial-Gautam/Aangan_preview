'use client';

/**
 * Reusable skeleton loading components for premium perceived performance.
 * Uses the `.skeleton` CSS class from globals.css for shimmer animation.
 */

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ className = '', style }: SkeletonProps) {
  return <div className={`skeleton ${className}`} style={style} />;
}

export function SkeletonAvatar({ size = 40 }: { size?: number }) {
  return (
    <div
      className="skeleton flex-shrink-0"
      style={{ width: size, height: size, borderRadius: '50%' }}
    />
  );
}

export function SkeletonLine({ width = '100%', height = 12 }: { width?: string | number; height?: number }) {
  return (
    <div
      className="skeleton"
      style={{ width, height, borderRadius: 6 }}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-[#FAF7F2] rounded-2xl p-4 border border-[#C9A66B]/10 space-y-3">
      <div className="flex items-center gap-3">
        <SkeletonAvatar size={36} />
        <div className="flex-1 space-y-1.5">
          <SkeletonLine width="60%" height={10} />
          <SkeletonLine width="30%" height={8} />
        </div>
      </div>
      <SkeletonLine width="100%" height={10} />
      <SkeletonLine width="80%" height={10} />
      <SkeletonLine width="40%" height={32} />
    </div>
  );
}

export function SkeletonFeedPage() {
  return (
    <div className="animate-pageEnter space-y-3 px-4 pt-4">
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
    </div>
  );
}

export function SkeletonMessageList() {
  return (
    <div className="animate-pageEnter space-y-2 px-4 pt-4">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-[#FAF7F2]">
          <SkeletonAvatar size={44} />
          <div className="flex-1 space-y-1.5">
            <SkeletonLine width="50%" height={11} />
            <SkeletonLine width="70%" height={9} />
          </div>
          <SkeletonLine width={40} height={9} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonTreePage() {
  return (
    <div className="absolute inset-0 bg-[#0a0e17] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <SkeletonAvatar size={56} />
          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full skeleton" />
        </div>
        <SkeletonLine width={100} height={10} />
        <SkeletonLine width={60} height={8} />
        <div className="flex gap-8 mt-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex flex-col items-center gap-2">
              <SkeletonAvatar size={36} />
              <SkeletonLine width={50} height={8} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SkeletonProfilePage() {
  return (
    <div className="animate-pageEnter px-6 pt-16 space-y-4">
      <div className="flex flex-col items-center gap-3">
        <SkeletonAvatar size={72} />
        <SkeletonLine width={120} height={14} />
        <SkeletonLine width={80} height={10} />
      </div>
      <div className="grid grid-cols-3 gap-3 mt-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="skeleton h-16 rounded-2xl" />
        ))}
      </div>
      <div className="space-y-2 mt-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="skeleton h-12 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
