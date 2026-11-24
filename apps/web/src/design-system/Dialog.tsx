import React, { useEffect } from 'react';
import { clsx } from 'clsx';
import { X } from 'lucide-react';

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = 'md',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidths = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-canvas/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Card */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className={clsx(
          'relative w-full bg-surface-elevated border border-border-subtle rounded-2xl shadow-dialog z-10 p-6 overflow-hidden transform transition-all',
          maxWidths[maxWidth],
        )}
      >
        <div className="flex items-start justify-between pb-4 border-b border-border-subtle mb-4">
          <div>
            <h2 id="dialog-title" className="text-lg font-semibold text-slate-100">
              {title}
            </h2>
            {description && (
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-100 p-1 rounded-lg hover:bg-surface transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-stellar"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="text-sm text-slate-200">{children}</div>

        {footer && (
          <div className="mt-6 pt-4 border-t border-border-subtle flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
