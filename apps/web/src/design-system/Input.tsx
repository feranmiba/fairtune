import React from 'react';
import { clsx } from 'clsx';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, leftIcon, rightIcon, id, disabled, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-medium text-slate-300">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 pointer-events-none text-slate-400 flex items-center">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            disabled={disabled}
            className={clsx(
              'w-full bg-surface text-slate-100 placeholder:text-slate-500 border rounded-lg text-sm transition-colors',
              'focus:outline-none focus:ring-1 focus:ring-brand-stellar focus:border-brand-stellar',
              'disabled:opacity-50 disabled:bg-surface-elevated disabled:cursor-not-allowed',
              error
                ? 'border-status-danger focus:ring-status-danger'
                : 'border-border-subtle hover:border-slate-600',
              leftIcon ? 'pl-9' : 'pl-3.5',
              rightIcon ? 'pr-9' : 'pr-3.5',
              'py-2 h-10',
              className,
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 pointer-events-none text-slate-400 flex items-center">
              {rightIcon}
            </div>
          )}
        </div>
        {error ? (
          <p className="text-xs text-status-danger flex items-center gap-1 mt-1">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-slate-400 mt-1">{helperText}</p>
        ) : null}
      </div>
    );
  },
);

Input.displayName = 'Input';
