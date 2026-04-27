import React from 'react';
import { cn } from '@/lib/utils';

interface ListProps extends React.HTMLAttributes<HTMLDivElement> {}

export function List({ className, ...props }: ListProps) {
  return <div className={cn("flex flex-col space-y-3", className)} {...props} />;
}

interface ListItemProps extends React.HTMLAttributes<HTMLDivElement> {}

export function ListItem({ className, ...props }: ListItemProps) {
  return (
    <div
      className={cn(
        "bg-white rounded-xl p-4 flex items-center border border-gray-100 shadow-sm transition-all hover:shadow-md",
        className
      )}
      {...props}
    />
  );
}
