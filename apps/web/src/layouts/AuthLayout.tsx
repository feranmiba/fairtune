import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import { Music2 } from 'lucide-react';

export const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-canvas flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-slate-100">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-flex items-center gap-2.5 mb-6 group">
          <div className="w-10 h-10 rounded-xl bg-surface-elevated border border-border-subtle flex items-center justify-center text-brand-gold group-hover:border-slate-500 transition-colors">
            <Music2 className="w-5 h-5" />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-100">FairTune</span>
        </Link>
      </div>

      <div className="mt-2 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-surface border border-border-subtle py-8 px-6 sm:px-10 rounded-2xl shadow-card">
          <Outlet />
        </div>
      </div>
    </div>
  );
};
