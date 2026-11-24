import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import { Button } from '../design-system/Button';
import { ShieldCheck, Music2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const PublicLayout: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-slate-100">
      {/* Navigation */}
      <header className="sticky top-0 z-40 w-full border-b border-border-subtle/80 bg-canvas/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-lg bg-surface-elevated border border-border-subtle flex items-center justify-center text-brand-gold group-hover:border-slate-500 transition-colors">
              <Music2 className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight text-slate-100 flex items-center gap-1.5">
                FairTune
                <span className="text-[10px] font-mono px-1.5 py-0.2 bg-brand-stellar-subtle text-brand-stellar border border-brand-stellar/20 rounded">
                  Stellar
                </span>
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#how-it-works" className="hover:text-slate-100 transition-colors">
              How it works
            </a>
            <a href="#contract-intelligence" className="hover:text-slate-100 transition-colors">
              Contract AI
            </a>
            <a href="#soroban-royalties" className="hover:text-slate-100 transition-colors">
              Stellar Royalties
            </a>
            <a href="#trust" className="hover:text-slate-100 transition-colors">
              Security & Trust
            </a>
          </nav>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Link to="/dashboard">
                <Button size="sm" variant="primary">
                  Go to Dashboard
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/login">
                  <Button size="sm" variant="ghost">
                    Sign in
                  </Button>
                </Link>
                <Link to="/register">
                  <Button size="sm" variant="primary">
                    Get started
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-border-subtle bg-surface-subtle py-12 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-brand-stellar" />
            <span>FairTune Non-Custodial Music Rights Platform. Powered by Stellar Soroban.</span>
          </div>
          <div className="flex items-center gap-6">
            <span className="text-slate-500">
              Not legal advice. All calculations deterministic.
            </span>
            <span>&copy; {new Date().getFullYear()} FairTune. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
