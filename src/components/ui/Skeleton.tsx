import React from 'react';
import { cn } from '@/lib/utils';

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("bg-card rounded-xl border border-border shadow-xs px-5 py-4 flex items-center justify-between", className)}>
      <div className="space-y-2">
        <div className="h-3 w-14 rounded bg-muted" />
        <div className="h-5 w-20 rounded bg-muted" />
      </div>
      <div className="w-5 h-5 rounded bg-muted" />
    </div>
  )
}

function SkeletonTable({ rows = 3, cols = 4, className }: { rows?: number; cols?: number; className?: string }) {
  return (
    <div className={cn("bg-card rounded-xl border border-border shadow-xs overflow-hidden", className)}>
      <div className="flex gap-4 px-6 py-3 bg-muted/50 border-b border-border">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-3 flex-1 rounded bg-muted" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 px-6 py-3.5 border-b border-border/50">
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} className="h-4 flex-1 rounded bg-muted/60" />
          ))}
        </div>
      ))}
    </div>
  )
}

export { Skeleton, SkeletonCard, SkeletonTable }
