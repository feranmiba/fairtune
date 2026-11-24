import React from 'react';
import { clsx } from 'clsx';
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'success' | 'warning' | 'danger';
  title?: string;
}

export const Alert: React.FC<AlertProps> = ({
  className,
  variant = 'info',
  title,
  children,
  ...props
}) => {
  const icons = {
    info: <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />,
    success: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />,
    danger: <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />,
  };

  const variants = {
    info: 'bg-blue-950/30 border-blue-800/40 text-blue-200',
    success: 'bg-emerald-950/30 border-emerald-800/40 text-emerald-200',
    warning: 'bg-amber-950/30 border-amber-800/40 text-amber-200',
    danger: 'bg-rose-950/30 border-rose-800/40 text-rose-200',
  };

  return (
    <div
      role="alert"
      className={clsx('flex gap-3 p-4 rounded-xl border text-sm', variants[variant], className)}
      {...props}
    >
      {icons[variant]}
      <div className="space-y-1">
        {title && <h4 className="font-semibold leading-tight">{title}</h4>}
        <div className="text-xs leading-relaxed opacity-90">{children}</div>
      </div>
    </div>
  );
};
