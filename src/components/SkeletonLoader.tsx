import React from 'react';

interface SkeletonGridProps {
  count?: number;
}

export function SkeletonFilmCard() {
  return (
    <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl overflow-hidden animate-pulse flex flex-col h-full shadow-lg">
      {/* Poster skeleton */}
      <div className="aspect-[2/3] w-full bg-zinc-850/80 relative">
        <div className="absolute top-3 left-3 w-14 h-5 bg-zinc-800 rounded-md" />
        <div className="absolute bottom-3 right-3 w-12 h-6 bg-zinc-800 rounded-lg" />
      </div>

      {/* Info skeleton */}
      <div className="p-4 flex flex-col justify-between flex-1 space-y-3">
        <div className="space-y-2">
          <div className="w-10 h-3 bg-zinc-800 rounded" />
          <div className="w-3/4 h-4 bg-zinc-800 rounded" />
          <div className="w-full h-3 bg-zinc-800/70 rounded" />
          <div className="w-2/3 h-3 bg-zinc-800/70 rounded" />
        </div>

        <div className="pt-3 border-t border-zinc-800/50 flex justify-between items-center">
          <div className="w-16 h-3 bg-zinc-800 rounded" />
          <div className="w-12 h-3 bg-zinc-800 rounded" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonGrid({ count = 8 }: SkeletonGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
      {Array.from({ length: count }).map((_, idx) => (
        <SkeletonFilmCard key={`skeleton-card-${idx}`} />
      ))}
    </div>
  );
}

export function SkeletonHeroBanner() {
  return (
    <div className="w-full h-48 sm:h-64 rounded-3xl bg-zinc-900/60 border border-zinc-800/80 animate-pulse p-8 flex flex-col justify-end space-y-3">
      <div className="w-32 h-5 bg-zinc-800 rounded-full" />
      <div className="w-2/3 h-8 bg-zinc-800 rounded-xl" />
      <div className="w-1/2 h-4 bg-zinc-800/80 rounded-lg" />
    </div>
  );
}
