import React from 'react';
import { clsx } from 'clsx';

export interface TabItem {
  id: string;
  label: string;
  badge?: number | string;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange, className }) => {
  return (
    <div
      className={clsx(
        'flex items-center gap-1 border-b border-border-subtle overflow-x-auto',
        className,
      )}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={clsx(
              'px-4 py-2.5 text-xs sm:text-sm font-medium transition-colors border-b-2 -mb-px flex items-center gap-2 whitespace-nowrap focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-stellar',
              isActive
                ? 'border-brand-stellar text-slate-100 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600',
            )}
          >
            {tab.label}
            {tab.badge !== undefined && (
              <span
                className={clsx(
                  'px-1.5 py-0.5 rounded text-[10px] font-mono',
                  isActive
                    ? 'bg-brand-stellar-subtle text-brand-stellar'
                    : 'bg-surface-elevated text-slate-400',
                )}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
