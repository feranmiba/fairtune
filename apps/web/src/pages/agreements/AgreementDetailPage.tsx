import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { agreementsApi, AgreementWithCollaborators } from '../../api/agreements.api';
import { stellarApi } from '../../api/stellar.api';
import { useStellarWallet } from '../../context/StellarWalletContext';
import { useNotifications } from '../../context/NotificationContext';
import { AgreementStatus, ApprovalStatus } from '@fairtune/shared';
import { Button } from '../../design-system/Button';
import { Card, CardHeader, CardTitle } from '../../design-system/Card';
import { Badge } from '../../design-system/Badge';
import { Alert } from '../../design-system/Alert';
import { Dialog } from '../../design-system/Dialog';
import { Input } from '../../design-system/Input';
import {
  Scale,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Coins,
  Send,
  Loader2,
  ExternalLink,
  ShieldCheck,
  Wallet,
} from 'lucide-react';

export const AgreementDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { isConnected, publicKey, connectWallet, signTransaction } = useStellarWallet();
  const { addToast } = useNotifications();

  const [agreement, setAgreement] = useState<AgreementWithCollaborators | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Deposit Escrow Modal State
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState('100');
  const [depositAsset, setDepositAsset] = useState('XLM');

  // Distribute Modal State
  const [isDistributeOpen, setIsDistributeOpen] = useState(false);
  const [distributeAmount, setDistributeAmount] = useState('');

  const loadAgreement = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const data = await agreementsApi.getById(id);
      setAgreement(data);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to load agreement');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAgreement();
  }, [id]);

  if (isLoading) {
    return (
      <div className="h-96 flex items-center justify-center text-brand-gold">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!agreement) {
    return (
      <div className="text-center py-12">
        <h2 className="text-lg font-semibold text-slate-100">Agreement not found</h2>
        <Link to="/agreements" className="mt-4 inline-block">
          <Button size="sm" variant="secondary">
            Return to agreements
          </Button>
        </Link>
      </div>
    );
  }

  // Check if current user is an unapproved collaborator
  const currentParticipant = agreement.participants.find(
    (p) => p.collaborator?.walletAddress === publicKey,
  );
  const canApprove =
    isConnected &&
    currentParticipant &&
    currentParticipant.approvalStatus !== ApprovalStatus.APPROVED &&
    agreement.status === AgreementStatus.PENDING_APPROVAL;

  // 1. Submit for approval
  const handleSubmitAgreement = async () => {
    setIsSubmittingAction(true);
    setActionError(null);
    try {
      await agreementsApi.submit(agreement.id);
      addToast({ type: 'success', message: 'Agreement submitted for collaborator approvals.' });
      await loadAgreement();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to submit agreement.');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // 2. Sign approval on-chain with Freighter
  const handleApproveWithFreighter = async () => {
    if (!publicKey) return;
    setIsSubmittingAction(true);
    setActionError(null);

    try {
      // Step A: Prepare transaction on backend
      const prepared = await stellarApi.prepareApproveAgreementTx(agreement.id, {
        collaboratorPublicKey: publicKey,
        network: agreement.stellarNetwork,
      });

      // Step B: Client-side signing with Freighter
      const signedXdr = await signTransaction(prepared.unsignedXdr);

      // Step C: Submit signed transaction
      await stellarApi.submitSignedTx({
        signedTxXdr: signedXdr,
        network: agreement.stellarNetwork,
      });

      // Step D: Record approval in DB
      await agreementsApi.approve(agreement.id);

      addToast({
        type: 'success',
        title: 'Approval Confirmed',
        message: 'Your approval was signed and submitted to Stellar.',
      });
      await loadAgreement();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to approve agreement.');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // 3. Activate agreement
  const handleActivateAgreement = async () => {
    setIsSubmittingAction(true);
    setActionError(null);
    try {
      await agreementsApi.activate(agreement.id);
      addToast({ type: 'success', message: 'Agreement activated on-chain!' });
      await loadAgreement();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Activation failed.');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // 4. Deposit into Escrow
  const handleDepositEscrow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicKey) {
      setActionError('Please connect your Freighter wallet to deposit escrow funds.');
      return;
    }

    setIsSubmittingAction(true);
    setActionError(null);

    try {
      const prepared = await stellarApi.prepareDepositEscrowTx(agreement.id, {
        depositorPublicKey: publicKey,
        amount: depositAmount,
        network: agreement.stellarNetwork,
      });

      const signedXdr = await signTransaction(prepared.unsignedXdr);
      await stellarApi.submitSignedTx({
        signedTxXdr: signedXdr,
        network: agreement.stellarNetwork,
      });

      setIsDepositOpen(false);
      addToast({
        type: 'success',
        title: 'Deposit Confirmed',
        message: `Deposited ${depositAmount} ${depositAsset} into Soroban escrow.`,
      });
      await loadAgreement();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Deposit failed.');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // 5. Distribute Royalties
  const handleDistribute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicKey) return;

    setIsSubmittingAction(true);
    setActionError(null);

    try {
      const prepared = await stellarApi.prepareDistributeRoyaltiesTx(agreement.id, {
        callerPublicKey: publicKey,
        network: agreement.stellarNetwork,
      });

      const signedXdr = await signTransaction(prepared.unsignedXdr);
      await stellarApi.submitSignedTx({
        signedTxXdr: signedXdr,
        network: agreement.stellarNetwork,
      });

      setIsDistributeOpen(false);
      addToast({
        type: 'success',
        title: 'Distribution Executed',
        message: 'Royalties split and distributed to collaborator wallets.',
      });
      await loadAgreement();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Distribution failed.');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const allApproved = agreement.participants.every(
    (p) => p.approvalStatus === ApprovalStatus.APPROVED,
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border-subtle">
        <div className="flex items-center gap-3">
          <Link to="/agreements">
            <Button size="sm" variant="ghost" className="p-2 h-auto">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-100">{agreement.title}</h1>
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
            <p className="text-xs text-slate-400 mt-0.5">
              Track: <strong className="text-slate-200">{agreement.trackName}</strong> &bull; Total
              Allocation: {agreement.totalAllocation}%
            </p>
          </div>
        </div>

        {/* Dynamic Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {agreement.status === AgreementStatus.DRAFT && (
            <Button
              size="sm"
              variant="primary"
              onClick={handleSubmitAgreement}
              isLoading={isSubmittingAction}
              leftIcon={<Send className="w-3.5 h-3.5" />}
            >
              Submit for Collaborator Signatures
            </Button>
          )}

          {canApprove && (
            <Button
              size="sm"
              variant="stellar"
              onClick={handleApproveWithFreighter}
              isLoading={isSubmittingAction}
              leftIcon={<ShieldCheck className="w-3.5 h-3.5" />}
            >
              Sign Approval with Freighter
            </Button>
          )}

          {agreement.status === AgreementStatus.PENDING_APPROVAL && allApproved && (
            <Button
              size="sm"
              variant="primary"
              onClick={handleActivateAgreement}
              isLoading={isSubmittingAction}
              leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
            >
              Activate On-Chain Agreement
            </Button>
          )}

          {agreement.status === AgreementStatus.ACTIVE && (
            <>
              <Button
                size="sm"
                variant="stellar"
                onClick={() => setIsDepositOpen(true)}
                leftIcon={<Coins className="w-3.5 h-3.5" />}
              >
                Deposit Escrow
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setIsDistributeOpen(true)}
                leftIcon={<Send className="w-3.5 h-3.5" />}
              >
                Distribute Royalties
              </Button>
            </>
          )}
        </div>
      </div>

      {actionError && (
        <Alert variant="danger" title="Action Failed">
          {actionError}
        </Alert>
      )}

      {/* Contract & Soroban Info Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="text-xs text-slate-400">Stellar Network</div>
          <div className="text-sm font-semibold text-slate-100 font-mono mt-1">
            {agreement.stellarNetwork}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Soroban Testnet Protocol</div>
        </Card>

        <Card>
          <div className="text-xs text-slate-400">Soroban Contract Address</div>
          <div className="text-sm font-semibold text-brand-stellar font-mono mt-1 truncate">
            {agreement.contractAddress || 'Generated upon deployment'}
          </div>
          {agreement.contractAddress && (
            <a
              href={`https://stellar.expert/explorer/testnet/contract/${agreement.contractAddress}`}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-brand-stellar hover:underline inline-flex items-center gap-1 mt-1"
            >
              Inspect on Stellar Expert <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </Card>

        <Card>
          <div className="text-xs text-slate-400">Approval Threshold</div>
          <div className="text-sm font-semibold text-slate-100 font-mono mt-1">
            {
              agreement.participants.filter((p) => p.approvalStatus === ApprovalStatus.APPROVED)
                .length
            }{' '}
            / {agreement.participants.length} Parties Signed
          </div>
          <div className="text-[11px] text-slate-500 mt-1">100% consensus required</div>
        </Card>
      </div>

      {/* Collaborators Split Table */}
      <Card>
        <CardHeader>
          <CardTitle>Collaborator Shares &amp; Approvals</CardTitle>
        </CardHeader>

        <div className="divide-y divide-border-subtle/50 text-xs">
          {agreement.participants.map((p) => (
            <div
              key={p.id}
              className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="space-y-0.5">
                <div className="font-semibold text-slate-200 text-sm">
                  {p.collaborator?.displayName || 'Collaborator'}
                </div>
                <div className="font-mono text-[10px] text-slate-500 truncate max-w-sm">
                  {p.collaborator?.walletAddress}
                </div>
              </div>

              <div className="flex items-center gap-6 sm:text-right">
                <div>
                  <div className="font-mono font-bold text-sm text-brand-gold">
                    {p.royaltyPercentage.toFixed(2)}%
                  </div>
                  <div className="text-[10px] font-mono text-slate-500">
                    {Math.round(p.royaltyPercentage * 100)} bps
                  </div>
                </div>

                <Badge
                  variant={p.approvalStatus === ApprovalStatus.APPROVED ? 'success' : 'warning'}
                  size="sm"
                >
                  {p.approvalStatus === ApprovalStatus.APPROVED ? (
                    <CheckCircle2 className="w-3 h-3" />
                  ) : (
                    <Clock className="w-3 h-3" />
                  )}
                  {p.approvalStatus}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Deposit Escrow Modal Dialog */}
      <Dialog
        isOpen={isDepositOpen}
        onClose={() => setIsDepositOpen(false)}
        title="Deposit Escrow Revenue"
        description="Deposit streaming or synchronization revenue into the agreement escrow contract."
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setIsDepositOpen(false)}
              disabled={isSubmittingAction}
            >
              Cancel
            </Button>
            <Button variant="primary" onClick={handleDepositEscrow} isLoading={isSubmittingAction}>
              Sign with Freighter
            </Button>
          </>
        }
      >
        <form onSubmit={handleDepositEscrow} className="space-y-4">
          <Input
            label="Deposit Amount"
            type="number"
            min="0.1"
            step="0.1"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            required
          />
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-300">Asset</label>
            <select
              value={depositAsset}
              onChange={(e) => setDepositAsset(e.target.value)}
              className="w-full bg-surface text-slate-100 border border-border-subtle rounded-lg text-sm p-2.5 focus:outline-none focus:border-brand-stellar"
            >
              <option value="XLM">Native XLM (Lumens)</option>
              <option value="USDC">Stellar USDC</option>
            </select>
          </div>
          <p className="text-[11px] text-slate-400">
            You will be prompted to sign an unsigned Soroban invocation XDR in your Freighter wallet
            extension.
          </p>
        </form>
      </Dialog>

      {/* Distribute Royalties Modal Dialog */}
      <Dialog
        isOpen={isDistributeOpen}
        onClose={() => setIsDistributeOpen(false)}
        title="Distribute Escrow Royalties"
        description="Execute mathematical distribution of escrow funds across all collaborators according to their basis points."
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setIsDistributeOpen(false)}
              disabled={isSubmittingAction}
            >
              Cancel
            </Button>
            <Button variant="primary" onClick={handleDistribute} isLoading={isSubmittingAction}>
              Sign &amp; Distribute
            </Button>
          </>
        }
      >
        <form onSubmit={handleDistribute} className="space-y-4">
          <Input
            label="Amount to distribute (in stroops or unit amount)"
            type="number"
            min="0.1"
            step="0.1"
            placeholder="e.g. 100"
            value={distributeAmount}
            onChange={(e) => setDistributeAmount(e.target.value)}
            required
          />
          <p className="text-[11px] text-slate-400">
            Soroban will deterministically distribute funds to each collaborator address with zero
            remainder leakage.
          </p>
        </form>
      </Dialog>
    </div>
  );
};
