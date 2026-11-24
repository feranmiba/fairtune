import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useStellarWallet } from '../../context/StellarWalletContext';
import { intelligenceApi, EarningsSummary } from '../../api/intelligence.api';
import { agreementsApi, AgreementWithCollaborators } from '../../api/agreements.api';
import { documentsApi } from '../../api/documents.api';
import { paymentsApi } from '../../api/payments.api';
import { DocumentDto, PaymentDto, AgreementStatus } from '@fairtune/shared';
import { Button } from '../../design-system/Button';
import { Card, CardHeader, CardTitle } from '../../design-system/Card';
import { Badge } from '../../design-system/Badge';
import { EmptyState } from '../../design-system/EmptyState';
import {
  Coins,
  Scale,
  FileText,
  AlertTriangle,
  ArrowUpRight,
  Upload,
  Plus,
  Loader2,
  Wallet,
  Clock,
  CheckCircle2,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const {
    isConnected,
    publicKey,
    connectWallet,
    openConnectModal,
    disconnectWallet,
    isConnecting,
  } = useStellarWallet();

  const [isLoading, setIsLoading] = useState(true);
  const [earnings, setEarnings] = useState<EarningsSummary | null>(null);
  const [agreements, setAgreements] = useState<AgreementWithCollaborators[]>([]);
  const [documents, setDocuments] = useState<DocumentDto[]>([]);
  const [recentPayments, setRecentPayments] = useState<PaymentDto[]>([]);
  const [unresolvedAnomaliesCount, setUnresolvedAnomaliesCount] = useState(0);

  useEffect(() => {
    const loadDashboardData = async () => {
      setIsLoading(true);
      try {
        const [earningsRes, agreementsRes, docsRes, paymentsRes, anomaliesRes] =
          await Promise.allSettled([
            intelligenceApi.getEarningsSummary(),
            agreementsApi.list(),
            documentsApi.list(),
            paymentsApi.list(),
            intelligenceApi.listAnomalies({ limit: 1, page: 1 }),
          ]);

        if (earningsRes.status === 'fulfilled') setEarnings(earningsRes.value);
        if (agreementsRes.status === 'fulfilled')
          setAgreements(Array.isArray(agreementsRes.value) ? agreementsRes.value : []);
        if (docsRes.status === 'fulfilled')
          setDocuments(Array.isArray(docsRes.value) ? docsRes.value : []);
        if (paymentsRes.status === 'fulfilled') {
          const p = paymentsRes.value;
          setRecentPayments(Array.isArray(p?.payments) ? p.payments : (p as any)?.items || []);
        }
        if (anomaliesRes.status === 'fulfilled')
          setUnresolvedAnomaliesCount(anomaliesRes.value?.total || 0);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  if (isLoading) {
    return (
      <div className="h-96 flex items-center justify-center text-brand-gold">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const activeAgreements = (agreements || []).filter((a) => a.status === AgreementStatus.ACTIVE);
  const pendingAgreements = (agreements || []).filter(
    (a) => a.status === AgreementStatus.PENDING_APPROVAL,
  );

  return (
    <div className="space-y-8">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border-subtle">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">
            Welcome, {user?.artistProfile?.stageName || user?.firstName}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time rights overview and Stellar royalty tracking.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link to="/contracts">
            <Button size="sm" variant="secondary" leftIcon={<Upload className="w-3.5 h-3.5" />}>
              Upload Contract
            </Button>
          </Link>
          <Link to="/agreements/create">
            <Button size="sm" variant="primary" leftIcon={<Plus className="w-3.5 h-3.5" />}>
              New Royalty Split
            </Button>
          </Link>
        </div>
      </div>

      {/* Wallet Banner */}
      {isConnected ? (
        <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-900/40 border border-emerald-700/50 flex items-center justify-center text-emerald-400 shrink-0">
              <Wallet className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-emerald-200">Stellar Wallet Connected</span>
                <Badge variant="success" size="sm">
                  Active
                </Badge>
              </div>
              <span className="text-slate-300 font-mono text-[11px] block mt-0.5 truncate max-w-xs sm:max-w-md">
                {publicKey}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link to="/wallet">
              <Button size="sm" variant="secondary">
                Wallet Details
              </Button>
            </Link>
            <Button size="sm" variant="ghost" onClick={disconnectWallet}>
              Disconnect
            </Button>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <Wallet className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <span className="font-semibold text-amber-200 block">
                Stellar wallet not connected
              </span>
              <span className="text-slate-300">
                Connect Freighter or generate a funded testnet account to sign agreements and
                receive royalties.
              </span>
            </div>
          </div>
          <Button
            size="sm"
            variant="stellar"
            onClick={openConnectModal}
            isLoading={isConnecting}
            className="shrink-0"
          >
            Connect Wallet
          </Button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Verified Earnings */}
        <Card variant="elevated">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Confirmed On-Chain Payouts</span>
            <Coins className="w-4 h-4 text-brand-gold" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100">
            $
            {(
              (earnings as any)?.totalEarnings ??
              earnings?.totalHistoricalNetDistributed ??
              0
            ).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 font-mono">
            {earnings?.byAsset?.map((a) => `${a.totalAmount} ${a.assetCode}`).join(', ') ||
              '0 confirmed payouts'}
          </p>
        </Card>

        {/* Metric 2: Active Agreements */}
        <Card variant="elevated">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Active Agreements</span>
            <Scale className="w-4 h-4 text-brand-stellar" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100">
            {activeAgreements.length}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {pendingAgreements.length} pending multi-party approval
          </p>
        </Card>

        {/* Metric 3: Analyzed Contracts */}
        <Card variant="elevated">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Contract Vault</span>
            <FileText className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100">
            {(documents || []).length}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {(documents || []).filter((d) => d.status === 'EXTRACTED').length} analyzed contracts
          </p>
        </Card>

        {/* Metric 4: Anomalies */}
        <Card variant="elevated">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Audit Findings</span>
            <AlertTriangle
              className={`w-4 h-4 ${unresolvedAnomaliesCount > 0 ? 'text-amber-400' : 'text-slate-500'}`}
            />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100">
            {unresolvedAnomaliesCount}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {unresolvedAnomaliesCount === 0
              ? 'All reconciliations clean'
              : 'Requires artist review'}
          </p>
        </Card>
      </div>

      {/* Main Grid: Active Agreements & Recent Contracts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Royalty Agreements */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-brand-stellar" />
              <CardTitle>Royalty Agreements</CardTitle>
            </div>
            <Link
              to="/agreements"
              className="text-xs text-brand-stellar hover:underline flex items-center gap-1 font-medium"
            >
              View all <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>

          {agreements.length === 0 ? (
            <EmptyState
              icon={<Scale className="w-6 h-6" />}
              title="No royalty agreements created"
              description="Create an on-chain split agreement with your co-writers and producers."
              actionLabel="Create agreement"
              onAction={() => window.location.assign('/agreements/create')}
            />
          ) : (
            <div className="space-y-3">
              {agreements.slice(0, 4).map((agreement) => (
                <Link
                  key={agreement.id}
                  to={`/agreements/${agreement.id}`}
                  className="p-3.5 rounded-lg bg-surface-elevated/60 border border-border-subtle hover:border-slate-600 block transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-200">{agreement.title}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">Track: {agreement.trackName}</p>
                    </div>
                    <Badge
                      variant={
                        agreement.status === AgreementStatus.ACTIVE
                          ? 'success'
                          : agreement.status === AgreementStatus.PENDING_APPROVAL
                            ? 'warning'
                            : 'default'
                      }
                      size="sm"
                    >
                      {agreement.status}
                    </Badge>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between text-xs text-slate-400 font-mono">
                    <span>{agreement.participants?.length || 0} collaborators</span>
                    <span className="text-brand-gold">
                      {agreement.totalAllocation ?? 100}% allocated
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>

        {/* Right Column: Uploaded Contracts & Analyses */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand-gold" />
              <CardTitle>Contract Intelligence</CardTitle>
            </div>
            <Link
              to="/contracts"
              className="text-xs text-brand-gold hover:underline flex items-center gap-1 font-medium"
            >
              View all <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>

          {documents.length === 0 ? (
            <EmptyState
              icon={<FileText className="w-6 h-6" />}
              title="No contracts uploaded"
              description="Upload a music contract PDF to detect predatory clauses and extract royalty terms."
              actionLabel="Upload contract"
              onAction={() => window.location.assign('/contracts')}
            />
          ) : (
            <div className="space-y-3">
              {documents.slice(0, 4).map((doc) => (
                <Link
                  key={doc.id}
                  to={`/contracts/${doc.id}`}
                  className="p-3.5 rounded-lg bg-surface-elevated/60 border border-border-subtle hover:border-slate-600 block transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="truncate pr-3">
                      <h4 className="text-sm font-semibold text-slate-200 truncate">{doc.title}</h4>
                      <p className="text-xs text-slate-400 mt-0.5 font-mono truncate">
                        {doc.originalFileName}
                      </p>
                    </div>
                    <Badge
                      variant={
                        doc.status === 'EXTRACTED'
                          ? 'success'
                          : doc.status === 'PROCESSING'
                            ? 'warning'
                            : 'default'
                      }
                      size="sm"
                    >
                      {doc.status}
                    </Badge>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </span>
                    <span className="text-brand-stellar hover:underline">View analysis &rarr;</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Bottom Section: Recent Payments */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-emerald-400" />
            <CardTitle>Recent Verified Payments</CardTitle>
          </div>
          <Link
            to="/payments"
            className="text-xs text-brand-stellar hover:underline flex items-center gap-1 font-medium"
          >
            All payment history <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </CardHeader>

        {(recentPayments || []).length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">
            No on-chain payments recorded yet. Confirmed distributions from active agreements will
            appear here.
          </p>
        ) : (
          <div className="divide-y divide-border-subtle/50 text-xs">
            {(recentPayments || []).slice(0, 5).map((pmt) => (
              <div key={pmt.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-200">
                    Royalty Distribution &bull; {pmt.asset?.code || 'XLM'}
                  </div>
                  <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                    {pmt.transactionHash
                      ? `Tx: ${pmt.transactionHash.substring(0, 10)}...`
                      : 'On-chain settlement'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-emerald-400">
                    +${Number(pmt.amount).toFixed(2)}
                  </div>
                  <Badge variant="success" size="sm" className="mt-1">
                    <CheckCircle2 className="w-3 h-3" /> Confirmed
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
