import React from 'react';
import { clsx } from 'clsx';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}) => {
  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center p-8 text-center rounded-xl border border-dashed border-border-subtle bg-surface/40 my-4',
        className,
      )}
    >
      {icon && (
        <div className="w-12 h-12 rounded-xl bg-surface-elevated border border-border-subtle flex items-center justify-center text-slate-400 mb-3">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
      <p className="text-xs text-slate-400 max-w-sm mt-1 mb-4 leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <Button size="sm" variant="secondary" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
