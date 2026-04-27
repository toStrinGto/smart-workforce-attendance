import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Card({ className, ...props }: CardProps) {
  return (
    <div className={cn("bg-card text-card-foreground rounded-xl border border-border shadow-xs overflow-hidden", className)} {...props} />
  );
}

export function CardHeader({ className, ...props }: CardProps) {
  return <div className={cn("px-5 py-4 border-b border-border", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-sm font-semibold text-foreground", className)} {...props} />;
}

export function CardContent({ className, ...props }: CardProps) {
  return <div className={cn("px-5 py-4", className)} {...props} />;
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function StatCard({ label, value, icon, className, onClick }: StatCardProps) {
  return (
    <Card
      className={cn(
        'px-5 py-4 flex items-center justify-between gap-4',
        onClick && 'cursor-pointer hover:bg-muted/50 transition-colors',
        className
      )}
      onClick={onClick}
    >
      <div>
        <div className="text-xs font-medium text-muted-foreground mb-1">{label}</div>
        <div className="text-xl font-semibold text-foreground tabular-nums">{value}</div>
      </div>
      <div className="text-muted-foreground/60" aria-hidden="true">{icon}</div>
    </Card>
  );
}
