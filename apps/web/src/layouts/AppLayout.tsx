import React, { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  Music2,
  LayoutDashboard,
  FileText,
  MessageSquare,
  Scale,
  CreditCard,
  TrendingUp,
  AlertOctagon,
  Wallet,
  User,
  LogOut,
  Bell,
  Menu,
  X,
  Check,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useStellarWallet } from '../context/StellarWalletContext';
import { useNotifications } from '../context/NotificationContext';
import { Badge } from '../design-system/Badge';
import { Button } from '../design-system/Button';

export const AppLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const {
    isConnected,
    publicKey,
    connectWallet,
    openConnectModal,
    disconnectWallet,
    isConnecting,
  } = useStellarWallet();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const navigate = useNavigate();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const navItems = [
    { label: 'Overview', to: '/dashboard', icon: LayoutDashboard },
    { label: 'Contracts & AI', to: '/contracts', icon: FileText },
    { label: 'AI Contract Assistant', to: '/contracts/chat', icon: MessageSquare },
    { label: 'Royalty Agreements', to: '/agreements', icon: Scale },
    { label: 'Payments & Escrow', to: '/payments', icon: CreditCard },
    { label: 'Intelligence & Forecasts', to: '/intelligence', icon: TrendingUp },
    { label: 'Audit & Anomalies', to: '/anomalies', icon: AlertOctagon },
    { label: 'Stellar Wallet', to: '/wallet', icon: Wallet },
    { label: 'Artist Profile', to: '/profile', icon: User },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const truncatedKey = publicKey
    ? `${publicKey.substring(0, 4)}...${publicKey.substring(publicKey.length - 4)}`
    : null;

  return (
    <div className="min-h-screen flex bg-canvas text-slate-100">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-border-subtle bg-surface shrink-0 fixed inset-y-0 z-30">
        {/* Brand */}
        <div className="h-16 px-6 flex items-center border-b border-border-subtle gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-surface-elevated border border-border-subtle flex items-center justify-center text-brand-gold">
            <Music2 className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-sm tracking-tight text-slate-100 block">FairTune</span>
            <span className="text-[10px] text-slate-400 font-mono block">Soroban Royalty Core</span>
          </div>
        </div>

        {/* Artist Profile Bar */}
        <div className="p-4 border-b border-border-subtle/80 bg-surface-subtle/50">
          <div className="text-xs font-semibold text-slate-200 truncate">
            {user?.artistProfile?.stageName || `${user?.firstName} ${user?.lastName}`}
          </div>
          <div className="text-[11px] text-slate-400 truncate">{user?.email}</div>
          <div className="mt-2 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
            <span className="text-[10px] font-mono text-slate-400">Stellar Testnet</span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/dashboard' || item.to === '/contracts'}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors',
                    isActive
                      ? 'bg-brand-gold-subtle text-brand-gold font-semibold border border-brand-gold/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-surface-elevated',
                  )
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-border-subtle">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-status-danger hover:bg-rose-950/20 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:pl-64 min-w-0">
        {/* Top Header */}
        <header className="h-16 border-b border-border-subtle bg-canvas/80 backdrop-blur-md sticky top-0 z-20 px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-surface-elevated"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <span className="text-xs font-mono text-slate-400 hidden sm:inline-block">
              FairTune &bull; Rights &amp; Royalty Protection
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Wallet Button */}
            {isConnected ? (
              <div className="flex items-center gap-2">
                <Link to="/wallet">
                  <Badge
                    variant="stellar"
                    className="font-mono text-xs cursor-pointer hover:bg-cyan-950/40 flex items-center gap-1.5"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    {truncatedKey}
                  </Badge>
                </Link>
                <button
                  onClick={disconnectWallet}
                  className="text-[11px] text-slate-400 hover:text-rose-400 transition-colors"
                  title="Disconnect wallet"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="stellar"
                onClick={openConnectModal}
                isLoading={isConnecting}
                leftIcon={<Wallet className="w-3.5 h-3.5" />}
              >
                Connect Wallet
              </Button>
            )}

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="relative p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-surface-elevated transition-colors"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-brand-gold"></span>
                )}
              </button>

              {/* Notification Dropdown */}
              {isNotificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-surface-elevated border border-border-subtle rounded-xl shadow-dialog z-50 p-4">
                  <div className="flex items-center justify-between pb-3 border-b border-border-subtle mb-3">
                    <span className="text-xs font-semibold text-slate-100">Notifications</span>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-[11px] text-brand-stellar hover:underline flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" /> Mark all read
                      </button>
                    )}
                  </div>

                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-slate-500 text-center py-4">
                        No notifications yet.
                      </p>
                    ) : (
                      notifications.slice(0, 10).map((n) => (
                        <div
                          key={n.id}
                          onClick={() => markAsRead(n.id)}
                          className={clsx(
                            'p-2.5 rounded-lg text-xs cursor-pointer transition-colors border',
                            n.read
                              ? 'bg-surface/50 border-transparent text-slate-400'
                              : 'bg-surface border-border-subtle text-slate-200 font-medium',
                          )}
                        >
                          <div className="text-[11px] font-semibold text-slate-100">{n.title}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">
                            {n.message}
                          </div>
                          <div className="text-[9px] text-slate-500 font-mono mt-1">
                            {new Date(n.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-40 bg-canvas/90 backdrop-blur-md pt-16 p-6">
            <nav className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      clsx(
                        'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium',
                        isActive
                          ? 'bg-brand-gold-subtle text-brand-gold font-semibold'
                          : 'text-slate-300 hover:bg-surface-elevated',
                      )
                    }
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-status-danger"
              >
                <LogOut className="w-5 h-5" />
                <span>Sign out</span>
              </button>
            </nav>
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
