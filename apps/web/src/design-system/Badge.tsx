import React from 'react';
import { clsx } from 'clsx';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'stellar' | 'gold' | 'info';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'default',
  size = 'md',
  children,
  ...props
}) => {
  const variants = {
    default: 'bg-surface-elevated text-slate-300 border border-border-subtle',
    success: 'bg-status-success-subtle text-status-success border border-emerald-500/20',
    warning: 'bg-status-warning-subtle text-status-warning border border-amber-500/20',
    danger: 'bg-status-danger-subtle text-status-danger border border-rose-500/20',
    stellar: 'bg-brand-stellar-subtle text-brand-stellar border border-cyan-400/20',
    gold: 'bg-brand-gold-subtle text-brand-gold border border-amber-400/20',
    info: 'bg-status-info-subtle text-status-info border border-blue-500/20',
  };

  const sizes = {
    sm: 'text-[11px] px-2 py-0.5 rounded font-medium',
    md: 'text-xs px-2.5 py-1 rounded-md font-medium',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 leading-none select-none',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
};
