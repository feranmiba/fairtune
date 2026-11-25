import React, { useState, useEffect } from 'react';
import { useStellarWallet } from '../../context/StellarWalletContext';
import { stellarApi } from '../../api/stellar.api';
import { Button } from '../../design-system/Button';
import { Card, CardHeader, CardTitle } from '../../design-system/Card';
import { Badge } from '../../design-system/Badge';
import { Alert } from '../../design-system/Alert';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '../../design-system/Table';
import {
  Wallet,
  Coins,
  ShieldCheck,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Loader2,
  Lock,
} from 'lucide-react';

export const WalletSettingsPage: React.FC = () => {
  const {
    isFreighterAvailable,
    isConnected,
    publicKey,
    balances,
    networkConfig,
    connectWallet,
    openConnectModal,
    disconnectWallet,
    refreshBalances,
    isConnecting,
    error,
  } = useStellarWallet();

  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<
    Array<{
      id: string;
      hash: string;
      type: string;
      status: string;
      sourceAccount: string;
      createdAt: string;
    }>
  >([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    stellarApi
      .getHistory()
      .then(setHistory)
      .catch(() => null);
  }, []);

  const handleCopy = () => {
    if (!publicKey) return;
    navigator.clipboard.writeText(publicKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshBalances();
      const updatedHistory = await stellarApi.getHistory();
      setHistory(updatedHistory);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border-subtle">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            <Wallet className="w-6 h-6 text-brand-stellar" />
            Stellar Wallet &amp; Network
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Connect your non-custodial Stellar wallet to sign royalty agreements and receive
            automated payouts.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleRefresh}
            isLoading={isRefreshing}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh Balances
          </Button>

          {isConnected ? (
            <Button size="sm" variant="secondary" onClick={disconnectWallet}>
              Disconnect
            </Button>
          ) : (
            <Button
              size="sm"
              variant="stellar"
              onClick={connectWallet}
              isLoading={isConnecting}
              leftIcon={<Wallet className="w-3.5 h-3.5" />}
            >
              Connect Wallet
            </Button>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="danger" title="Wallet Connection Error">
          {error}
        </Alert>
      )}

      {/* Non-Custodial Security Notice */}
      <div className="p-4 rounded-xl bg-surface-elevated/70 border border-border-subtle flex items-start gap-3 text-xs text-slate-300">
        <Lock className="w-5 h-5 text-brand-gold shrink-0 mt-0.5" />
        <div>
          <strong className="text-slate-100 block mb-0.5">Strict Non-Custodial Protocol:</strong>
          FairTune never asks for or stores private keys. Transactions are prepared as unsigned
          Base64 envelopes and signed in your browser via the official Stellar Wallets Kit
          (supporting Varial, Freighter, xBull, Albedo, Lobstr, Hana, and hardware signers).
        </div>
      </div>

      {/* Wallet Details & Balances */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Account Status</CardTitle>
            <Badge variant={isConnected ? 'success' : 'default'} size="sm">
              {isConnected ? 'Connected' : 'Disconnected'}
            </Badge>
          </CardHeader>

          <div className="space-y-4 text-xs">
            <div>
              <span className="text-slate-400 block mb-1">Stellar Public Address</span>
              {publicKey ? (
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface-elevated border border-border-subtle font-mono text-brand-stellar text-xs">
                  <span className="truncate pr-2">{publicKey}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={handleCopy}
                      className="text-slate-400 hover:text-slate-200 transition-colors p-1"
                      aria-label="Copy public address"
                    >
                      {copied ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <a
                      href={`https://stellar.expert/explorer/testnet/account/${publicKey}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-slate-400 hover:text-slate-200 p-1"
                      aria-label="View on Stellar Expert"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ) : (
                <p className="text-slate-500 italic">No wallet connected</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3 rounded-lg bg-surface-elevated border border-border-subtle">
                <span className="text-slate-400 block text-[11px]">Network:</span>
                <span className="font-semibold text-slate-200 font-mono">Stellar Testnet</span>
              </div>
              <div className="p-3 rounded-lg bg-surface-elevated border border-border-subtle">
                <span className="text-slate-400 block text-[11px]">Extension:</span>
                <span className="font-semibold text-slate-200">
                  {isFreighterAvailable ? 'Freighter Detected' : 'Not Installed'}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Live Balances Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Account Balances</CardTitle>
            <Coins className="w-4 h-4 text-brand-gold" />
          </CardHeader>

          {!isConnected ? (
            <p className="text-xs text-slate-500 py-8 text-center italic">
              Connect your Stellar wallet to view live testnet balances.
            </p>
          ) : balances.length === 0 ? (
            <p className="text-xs text-slate-500 py-8 text-center">
              Account unfunded or 0 balances returned. Use Stellar Friendbot to fund your testnet
              account.
            </p>
          ) : (
            <div className="divide-y divide-border-subtle/50 text-xs">
              {balances.map((b, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-100 font-mono">
                      {b.asset === 'native' ? 'XLM (Native)' : b.asset}
                    </span>
                  </div>
                  <span className="font-mono text-sm font-semibold text-emerald-400">
                    {Number(b.balance).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 7,
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* On-Chain Transaction Audit Log */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Recent On-Chain Activity</CardTitle>
        </CardHeader>

        {history.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">
            No transactions executed on Stellar yet.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Transaction Hash</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Explorer</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.slice(0, 10).map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell className="font-semibold text-slate-200">{tx.type}</TableCell>
                  <TableCell className="font-mono text-xs text-brand-stellar">
                    {tx.hash.substring(0, 12)}...
                  </TableCell>
                  <TableCell>
                    <Badge variant="success" size="sm">
                      {tx.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-400 font-mono text-xs">
                    {new Date(tx.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <a
                      href={`https://stellar.expert/explorer/testnet/tx/${tx.hash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-brand-stellar hover:underline inline-flex items-center gap-1 text-xs"
                    >
                      Inspect <ExternalLink className="w-3 h-3" />
                    </a>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
};
