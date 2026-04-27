import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getProjectStatusStyle(status: string): string {
  switch (status) {
    case '未开工': return 'bg-muted text-muted-foreground';
    case '施工中': return 'bg-blue-500/10 text-blue-600';
    case '维保中': return 'bg-purple-500/10 text-purple-600';
    case '已完工': return 'bg-emerald-500/10 text-emerald-600';
    default: return 'bg-muted text-muted-foreground';
  }
}

export function extractList<T>(data: T[] | { list?: T[] } | null | undefined): T[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object' && 'list' in data) return (data as { list?: T[] }).list ?? [];
  return [];
}

export function getProgressByStatus(status: string): number {
  switch (status) {
    case '未开工': return 0;
    case '施工中': return 50;
    case '维保中': return 75;
    case '已完工': return 90;
    default: return 0;
  }
}
