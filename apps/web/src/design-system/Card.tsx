import React from 'react';
import { clsx } from 'clsx';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'interactive';
}

export const Card: React.FC<CardProps> = ({
  className,
  variant = 'default',
  children,
  ...props
}) => {
  const variants = {
    default: 'bg-surface border border-border-subtle',
    elevated: 'bg-surface-elevated border border-border-subtle shadow-card',
    interactive:
      'bg-surface border border-border-subtle hover:border-slate-600 hover:bg-surface-hover cursor-pointer transition-all',
  };

  return (
    <div className={clsx('rounded-xl p-5', variants[variant], className)} {...props}>
      {children}
    </div>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <div
      className={clsx(
        'flex items-center justify-between pb-3 mb-4 border-b border-border-subtle',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <h3
      className={clsx('text-base font-semibold text-slate-100 tracking-tight', className)}
      {...props}
    >
      {children}
    </h3>
  );
};
