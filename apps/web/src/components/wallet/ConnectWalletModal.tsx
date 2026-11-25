import React, { useState } from 'react';
import { useStellarWallet } from '../../context/StellarWalletContext';
import {
  X,
  ExternalLink,
  Loader2,
  Check,
  Zap,
  Key,
  ArrowLeft,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

interface WalletRow {
  id: string;
  name: string;
  subtitle: string;
  url: string;
  isWebSigner?: boolean;
  icon: React.ReactNode;
}

const WALLETS: WalletRow[] = [
  {
    id: 'varial',
    name: 'Varial',
    subtitle: 'varialwallet.com',
    url: 'https://varialwallet.com',
    icon: (
      <svg viewBox="0 0 28 28" fill="none" className="w-6 h-6">
        <circle cx="14" cy="14" r="13" fill="#5A32EB" />
        <path d="M14 6L20 12L14 22L8 12L14 6Z" fill="white" />
        <circle cx="14" cy="13" r="3" fill="#5A32EB" />
      </svg>
    ),
  },
  {
    id: 'lobstr',
    name: 'LOBSTR',
    subtitle: 'lobstr.co',
    url: 'https://lobstr.co',
    icon: (
      <svg viewBox="0 0 28 28" fill="none" className="w-6 h-6">
        <circle cx="14" cy="14" r="13" fill="#181938" stroke="#3730A3" />
        <circle cx="14" cy="14" r="7" stroke="#818CF8" strokeWidth="2" />
        <path
          d="M10 14C10 12 11.5 10 14 10C16.5 10 18 12 18 14"
          stroke="#818CF8"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    id: 'albedo',
    name: 'Albedo',
    subtitle: 'Web signer (no install needed)',
    url: 'https://albedo.link',
    isWebSigner: true,
    icon: (
      <svg viewBox="0 0 28 28" fill="none" className="w-6 h-6">
        <path
          d="M14 4L23 21H5L14 4Z"
          stroke="#00E5FF"
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
        <path d="M8.5 15.5H19.5" stroke="#00E5FF" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'xbull',
    name: 'xBull',
    subtitle: 'xbull.app',
    url: 'https://xbull.app',
    icon: (
      <svg viewBox="0 0 28 28" fill="none" className="w-6 h-6">
        <circle cx="14" cy="14" r="13" fill="#3B1B6A" />
        <path
          d="M9 10C10 14 12 18 14 18C16 18 18 14 19 10"
          stroke="#C084FC"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <path
          d="M8 8C9 13 11 20 14 20C17 20 19 13 20 8"
          stroke="#C084FC"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    id: 'rabet',
    name: 'Rabet',
    subtitle: 'rabet.io',
    url: 'https://rabet.io',
    icon: (
      <svg viewBox="0 0 28 28" fill="none" className="w-6 h-6">
        <circle cx="14" cy="14" r="13" fill="#14181F" stroke="#262E3B" />
        <path
          d="M10 20V14C10 12 11 9 12 7C13 10 13 12 13 14M18 20V14C18 12 17 9 16 7C15 10 15 12 15 14"
          stroke="#E2E8F0"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <circle cx="14" cy="16" r="3" stroke="#E2E8F0" strokeWidth="1.8" />
      </svg>
    ),
  },
];

export const ConnectWalletModal: React.FC = () => {
  const {
    isConnectModalOpen,
    closeConnectModal,
    connectWalletById,
    connectManualKey,
    generateAndConnectTestnet,
    isConnecting,
    connectingWalletId,
    error,
    isFreighterAvailable,
    isLobstrAvailable,
  } = useStellarWallet();

  const [viewMode, setViewMode] = useState<'main' | 'instant' | 'manual'>('main');
  const [manualAddress, setManualAddress] = useState('');
  const [manualError, setManualError] = useState<string | null>(null);
  const [connectionNotice, setConnectionNotice] = useState<{
    wallet: WalletRow;
    message: string;
  } | null>(null);

  if (!isConnectModalOpen) return null;

  const handleWalletSelect = async (wallet: WalletRow) => {
    setConnectionNotice(null);

    const address = await connectWalletById(wallet.id);
    if (!address) {
      setConnectionNotice({
        wallet,
        message: `Could not connect to ${wallet.name}. Please ensure your extension is unlocked and approved, or install it from ${wallet.subtitle}.`,
      });
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = manualAddress.trim();
    if (!clean.startsWith('G') || clean.length !== 56) {
      setManualError('Stellar public key must start with G and be exactly 56 characters.');
      return;
    }
    setManualError(null);
    connectManualKey(clean);
    closeConnectModal();
  };

  const handleInstantGenerate = async () => {
    await generateAndConnectTestnet();
    closeConnectModal();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Dark backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={closeConnectModal}
        aria-hidden="true"
      />

      {/* Two-Column Stellar Wallets Kit Modal Window */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-2xl bg-[#111317] border border-[#23272F] rounded-2xl shadow-2xl z-10 overflow-hidden text-slate-200 animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="grid grid-cols-1 md:grid-cols-12 min-h-[400px]">
          {/* Left Column: Learn more */}
          <div className="md:col-span-5 bg-[#0C0E12] p-6 border-b md:border-b-0 md:border-r border-[#23272F] flex flex-col justify-between">
            <div className="space-y-6">
              <h2 className="text-sm font-semibold text-white tracking-wide">
                Learn more
              </h2>

              <div className="space-y-1.5">
                <h3 className="text-xs font-semibold text-slate-200">
                  What is a wallet?
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Wallets are used to send, receive, and store the keys you use to sign blockchain
                  transactions.
                </p>
              </div>

              <div className="space-y-1.5">
                <h3 className="text-xs font-semibold text-slate-200">
                  What is Stellar?
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Stellar is a decentralized, public blockchain that gives developers the tools to
                  create experiences that are more like cash than crypto.
                </p>
              </div>
            </div>

            {/* Testnet Status */}
            <div className="pt-6 border-t border-[#1C2028] mt-6 flex items-center gap-2 text-[11px] text-slate-500 font-mono">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
              <span>Stellar Testnet &bull; Soroban v22</span>
            </div>
          </div>

          {/* Right Column: Connect a Wallet */}
          <div className="md:col-span-7 p-6 flex flex-col justify-between bg-[#111317]">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-[#23272F]">
                {viewMode === 'main' ? (
                  <h2 className="text-sm font-semibold text-white">
                    Connect a Wallet
                  </h2>
                ) : (
                  <button
                    onClick={() => setViewMode('main')}
                    className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Wallets</span>
                  </button>
                )}

                <button
                  onClick={closeConnectModal}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#1A1E24] transition-colors"
                  aria-label="Close dialog"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Error Alert */}
              {error && (
                <div className="mt-3 p-2.5 rounded-lg bg-rose-950/30 border border-rose-800/40 text-xs text-rose-300">
                  {error}
                </div>
              )}

              {/* Notice / Install Helper if connection couldn't open */}
              {connectionNotice && (
                <div className="mt-3 p-3 rounded-lg bg-[#181B21] border border-[#2D333F] text-xs text-slate-300 space-y-1.5 animate-in fade-in">
                  <p>{connectionNotice.message}</p>
                  <div className="flex items-center gap-3 pt-1">
                    <a
                      href={connectionNotice.wallet.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-cyan-400 hover:underline font-semibold"
                    >
                      Visit {connectionNotice.wallet.name} <ExternalLink className="w-3 h-3" />
                    </a>
                    <button
                      type="button"
                      onClick={() => handleWalletSelect(WALLETS[2])}
                      className="text-[11px] text-amber-300 hover:underline font-semibold"
                    >
                      Use Albedo instead
                    </button>
                  </div>
                </div>
              )}

              {/* Main Wallet List */}
              {viewMode === 'main' && (
                <div className="mt-4 space-y-1">
                  {WALLETS.map((w) => {
                    const isDetected =
                      w.id === 'varial'
                        ? isFreighterAvailable
                        : w.id === 'lobstr'
                          ? isLobstrAvailable
                          : w.isWebSigner;

                    const isThisConnecting = isConnecting && connectingWalletId === w.id;

                    return (
                      <button
                        key={w.id}
                        type="button"
                        disabled={isConnecting}
                        onClick={() => handleWalletSelect(w)}
                        className={`w-full group p-3 rounded-xl flex items-center justify-between text-left transition-all ${
                          isThisConnecting
                            ? 'bg-cyan-950/20 border border-cyan-500/40'
                            : 'hover:bg-[#181B22] border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 flex items-center justify-center shrink-0">
                            {w.icon}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">
                                {w.name}
                              </span>
                              {w.id === 'varial' && (
                                <span className="text-[10px] text-slate-400 font-mono">
                                  varialwallet.com
                                </span>
                              )}
                            </div>
                            {w.isWebSigner && (
                              <span className="text-[11px] text-cyan-400/90 block">
                                Web Signer &bull; No extension needed
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Status Label on Right */}
                        <div className="shrink-0 flex items-center gap-1.5">
                          {isThisConnecting ? (
                            <div className="flex items-center gap-1.5 text-xs text-cyan-400 font-medium">
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Connecting...</span>
                            </div>
                          ) : isDetected ? (
                            <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1 bg-emerald-950/20 px-2 py-0.5 rounded border border-emerald-800/30">
                              <Check className="w-3 h-3" /> Ready
                            </span>
                          ) : (
                            <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-colors" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Instant Testnet View */}
              {viewMode === 'instant' && (
                <div className="mt-4 space-y-4">
                  <div className="p-3.5 rounded-xl bg-[#0D1016] border border-[#23272F] space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
                      <Zap className="w-4 h-4 text-amber-400" />
                      <span>Instant Funded Testnet Account</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Generates a fresh keypair and claims 10,000 testnet XLM from the Stellar
                      Friendbot faucet. Zero extension install required.
                    </p>
                  </div>

                  <button
                    onClick={handleInstantGenerate}
                    disabled={isConnecting}
                    className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  >
                    {isConnecting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Zap className="w-4 h-4" />
                    )}
                    <span>Generate Funded Account (10,000 XLM)</span>
                  </button>
                </div>
              )}

              {/* Manual Public Key View */}
              {viewMode === 'manual' && (
                <form onSubmit={handleManualSubmit} className="mt-4 space-y-3">
                  <p className="text-xs text-slate-400">
                    Paste a 56-character Stellar public key (starting with G) to connect in read-only mode:
                  </p>

                  {manualError && (
                    <div className="p-2 rounded bg-rose-950/30 text-rose-300 text-xs">
                      {manualError}
                    </div>
                  )}

                  <input
                    type="text"
                    value={manualAddress}
                    onChange={(e) => setManualAddress(e.target.value.trim().toUpperCase())}
                    placeholder="GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[#0D1016] border border-[#23272F] text-white focus:outline-none focus:border-cyan-400 font-mono"
                    required
                  />

                  <button
                    type="submit"
                    className="w-full py-2 px-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs transition-colors"
                  >
                    Connect Public Key
                  </button>
                </form>
              )}
            </div>

            {/* Bottom Alternative Options */}
            <div className="pt-3 border-t border-[#23272F] mt-4 flex items-center justify-between text-[11px] text-slate-400">
              {viewMode === 'main' ? (
                <>
                  <button
                    type="button"
                    onClick={() => setViewMode('instant')}
                    className="text-amber-400 hover:underline flex items-center gap-1 font-medium"
                  >
                    <Zap className="w-3 h-3 text-amber-400" />
                    <span>Instant 10k XLM Account</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('manual')}
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    Enter Address
                  </button>
                </>
              ) : (
                <span className="text-slate-500 text-[10px]">
                  Non-custodial &bull; Keys remain local
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
