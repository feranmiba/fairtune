import React, { useState } from 'react';
import { useStellarWallet } from '../../context/StellarWalletContext';
import { Dialog } from '../../design-system/Dialog';
import { Button } from '../../design-system/Button';
import { Input } from '../../design-system/Input';
import { Alert } from '../../design-system/Alert';
import { Badge } from '../../design-system/Badge';
import { Wallet, Zap, Key, ExternalLink, Check, AlertCircle, Loader2 } from 'lucide-react';

export const ConnectWalletModal: React.FC = () => {
  const {
    isConnectModalOpen,
    closeConnectModal,
    isFreighterAvailable,
    connectFreighter,
    connectManualKey,
    generateAndConnectTestnet,
    isConnecting,
    error,
  } = useStellarWallet();

  const [activeTab, setActiveTab] = useState<'freighter' | 'instant' | 'manual'>('freighter');
  const [manualAddress, setManualAddress] = useState('');
  const [manualError, setManualError] = useState<string | null>(null);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAddress = manualAddress.trim();
    if (!cleanAddress.startsWith('G') || cleanAddress.length !== 56) {
      setManualError('Stellar public key must start with G and be exactly 56 characters.');
      return;
    }
    setManualError(null);
    connectManualKey(cleanAddress);
    closeConnectModal();
  };

  const handleInstantGenerate = async () => {
    await generateAndConnectTestnet();
    closeConnectModal();
  };

  const handleFreighterConnect = async () => {
    const key = await connectFreighter();
    if (key) {
      closeConnectModal();
    }
  };

  return (
    <Dialog
      isOpen={isConnectModalOpen}
      onClose={closeConnectModal}
      title="Connect Stellar Wallet"
      description="Connect a non-custodial wallet or generate a funded testnet account to sign royalty contracts."
      maxWidth="md"
    >
      <div className="space-y-5">
        {error && (
          <Alert variant="danger" title="Connection Error">
            {error}
          </Alert>
        )}

        {/* Tab Selector */}
        <div className="flex border-b border-border-subtle gap-2 pb-2">
          <button
            onClick={() => setActiveTab('freighter')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'freighter'
                ? 'bg-brand-stellar/10 text-brand-stellar font-semibold border border-brand-stellar/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            Varial / Freighter
          </button>
          <button
            onClick={() => setActiveTab('instant')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'instant'
                ? 'bg-brand-stellar/10 text-brand-stellar font-semibold border border-brand-stellar/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-brand-gold" />
            Instant Testnet
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'manual'
                ? 'bg-brand-stellar/10 text-brand-stellar font-semibold border border-brand-stellar/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            Enter Address
          </button>
        </div>

        {/* Tab 1: Varial / Freighter Extension */}
        {activeTab === 'freighter' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-surface-elevated border border-border-subtle flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-surface border border-border-subtle flex items-center justify-center text-brand-stellar shrink-0">
                <Wallet className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-100">
                    Varial Wallet (formerly Freighter)
                  </span>
                  {isFreighterAvailable ? (
                    <Badge variant="success" size="sm">
                      <Check className="w-3 h-3" /> Detected
                    </Badge>
                  ) : (
                    <Badge variant="default" size="sm">
                      Not Detected
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-slate-400">
                  The official non-custodial browser wallet for Stellar and Soroban smart contracts.
                </p>
              </div>
            </div>

            {isFreighterAvailable ? (
              <Button
                variant="stellar"
                className="w-full"
                onClick={handleFreighterConnect}
                isLoading={isConnecting}
              >
                Connect Varial Extension
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-800/40 text-xs text-amber-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    Varial/Freighter is not detected. Please install it or use the{' '}
                    <strong>Instant Testnet</strong> tab.
                  </span>
                </div>
                <a
                  href="https://varialwallet.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="block"
                >
                  <Button
                    variant="secondary"
                    className="w-full"
                    rightIcon={<ExternalLink className="w-3.5 h-3.5" />}
                  >
                    Get Varial Wallet (varialwallet.com)
                  </Button>
                </a>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Instant Testnet Account */}
        {activeTab === 'instant' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-surface-elevated border border-border-subtle space-y-2">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-brand-gold" />
                <span className="text-xs font-semibold text-slate-100">
                  Instant Funded Testnet Wallet
                </span>
                <Badge variant="gold" size="sm">
                  Recommended for Dev / Review
                </Badge>
              </div>
              <p className="text-xs text-slate-400">
                Generates a fresh Stellar keypair and automatically requests 10,000 testnet XLM from
                the Stellar Friendbot faucet. No browser extensions required.
              </p>
            </div>

            <Button
              variant="primary"
              className="w-full"
              onClick={handleInstantGenerate}
              isLoading={isConnecting}
              leftIcon={<Zap className="w-4 h-4" />}
            >
              Generate &amp; Connect Funded Testnet Account
            </Button>
          </div>
        )}

        {/* Tab 3: Manual Address */}
        {activeTab === 'manual' && (
          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div className="space-y-1">
              <p className="text-xs text-slate-400">
                Connect any existing Stellar Testnet public address to inspect balances and track
                royalty distributions.
              </p>
            </div>

            {manualError && (
              <Alert variant="danger" title="Validation">
                {manualError}
              </Alert>
            )}

            <Input
              label="Stellar Public Key"
              placeholder="e.g. GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5"
              value={manualAddress}
              onChange={(e) => setManualAddress(e.target.value.trim().toUpperCase())}
              helperText="Must be a valid 56-character Ed25519 public key starting with G"
              required
            />

            <Button
              type="submit"
              variant="stellar"
              className="w-full"
              leftIcon={<Key className="w-4 h-4" />}
            >
              Connect Address
            </Button>
          </form>
        )}
      </div>
    </Dialog>
  );
};
