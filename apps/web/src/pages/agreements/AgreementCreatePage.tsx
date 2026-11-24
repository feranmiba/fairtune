import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useStellarWallet } from '../../context/StellarWalletContext';
import { agreementsApi } from '../../api/agreements.api';
import { StellarNetwork } from '@fairtune/shared';
import { Input } from '../../design-system/Input';
import { Button } from '../../design-system/Button';
import { Card, CardHeader, CardTitle } from '../../design-system/Card';
import { Alert } from '../../design-system/Alert';
import { Badge } from '../../design-system/Badge';
import {
  Scale,
  Plus,
  Trash2,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface CollaboratorFormRow {
  name: string;
  email: string;
  stellarWalletAddress: string;
  royaltyPercentage: number;
}

export const AgreementCreatePage: React.FC = () => {
  const { user } = useAuth();
  const { publicKey } = useStellarWallet();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [trackName, setTrackName] = useState('');
  const [description, setDescription] = useState('');

  // Initialize with the artist as the primary collaborator
  const [collaborators, setCollaborators] = useState<CollaboratorFormRow[]>([
    {
      name: user?.artistProfile?.stageName || `${user?.firstName} ${user?.lastName}`,
      email: user?.email || '',
      stellarWalletAddress: publicKey || '',
      royaltyPercentage: 100,
    },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const totalPercentage = collaborators.reduce(
    (acc, c) => acc + (Number(c.royaltyPercentage) || 0),
    0,
  );
  const isTotalValid = Math.abs(totalPercentage - 100) < 0.001;

  const handleAddCollaborator = () => {
    setCollaborators((prev) => [
      ...prev,
      {
        name: '',
        email: '',
        stellarWalletAddress: '',
        royaltyPercentage: 0,
      },
    ]);
  };

  const handleRemoveCollaborator = (index: number) => {
    if (collaborators.length <= 1) return;
    setCollaborators((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateCollaborator = (
    index: number,
    field: keyof CollaboratorFormRow,
    value: string | number,
  ) => {
    setCollaborators((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !trackName.trim()) {
      setErrorMessage('Agreement title and track name are required.');
      return;
    }

    if (!isTotalValid) {
      setErrorMessage(
        `Total royalty allocation must equal exactly 100.00%. Current sum: ${totalPercentage.toFixed(2)}%.`,
      );
      return;
    }

    for (const c of collaborators) {
      if (!c.name.trim() || !c.email.trim() || !c.stellarWalletAddress.trim()) {
        setErrorMessage(
          'All collaborators must have a name, email address, and Stellar wallet address (starting with G).',
        );
        return;
      }
      if (!c.stellarWalletAddress.startsWith('G') || c.stellarWalletAddress.length !== 56) {
        setErrorMessage(
          `Invalid Stellar public address for "${c.name}". Address must be a 56-character Ed25519 key starting with 'G'.`,
        );
        return;
      }
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const created = await agreementsApi.create({
        title: title.trim(),
        trackName: trackName.trim(),
        description: description.trim() || undefined,
        stellarNetwork: StellarNetwork.TESTNET,
        participants: collaborators.map((c) => ({
          displayName: c.name.trim(),
          walletAddress: c.stellarWalletAddress.trim(),
          royaltyPercentage: Number(c.royaltyPercentage),
        })),
      });

      navigate(`/agreements/${created.id}`);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to create royalty agreement.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-border-subtle">
        <Link to="/agreements">
          <Button size="sm" variant="ghost" className="p-2 h-auto">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            <Scale className="w-5 h-5 text-brand-gold" />
            Create Royalty Split Agreement
          </h1>
          <p className="text-xs text-slate-400">
            Define collaborator shares with 10,000 basis points precision on Stellar Soroban.
          </p>
        </div>
      </div>

      {errorMessage && (
        <Alert variant="danger" title="Validation Failed">
          {errorMessage}
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Track & Agreement Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">General Details</CardTitle>
          </CardHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Track or Project Title"
                placeholder="e.g. Midnight Horizon"
                value={trackName}
                onChange={(e) => setTrackName(e.target.value)}
                required
              />
              <Input
                label="Agreement Legal Title"
                placeholder="e.g. Master Royalty Split Agreement 2026"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">
                Agreement Scope &amp; Notes (optional)
              </label>
              <textarea
                rows={2}
                className="w-full bg-surface text-slate-100 placeholder:text-slate-500 border border-border-subtle rounded-lg text-sm p-3 focus:outline-none focus:border-brand-stellar"
                placeholder="Covers master recording streaming royalties, digital downloads, and sync licensing."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
        </Card>

        {/* Collaborators & Splits */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <div>
                <CardTitle className="text-sm">Collaborator Allocations</CardTitle>
                <p className="text-xs text-slate-400 mt-0.5">
                  Every party will sign the agreement with their Stellar wallet.
                </p>
              </div>

              {/* Real-time Basis Points Tracker */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono">
                  Total:{' '}
                  <strong className={isTotalValid ? 'text-emerald-400' : 'text-status-danger'}>
                    {totalPercentage.toFixed(2)}%
                  </strong>{' '}
                  / 100.00%
                </span>
                <Badge variant={isTotalValid ? 'success' : 'danger'} size="sm">
                  {isTotalValid ? (
                    <CheckCircle2 className="w-3 h-3" />
                  ) : (
                    <AlertCircle className="w-3 h-3" />
                  )}
                  {isTotalValid ? 'Valid Split' : 'Must Equal 100%'}
                </Badge>
              </div>
            </div>
          </CardHeader>

          <div className="space-y-4">
            {collaborators.map((collab, index) => (
              <div
                key={index}
                className="p-4 rounded-xl bg-surface-elevated/70 border border-border-subtle space-y-3"
              >
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                  <span>
                    Collaborator #{index + 1} {index === 0 && '(Lead Artist)'}
                  </span>
                  {collaborators.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveCollaborator(index)}
                      className="text-slate-400 hover:text-status-danger transition-colors p-1"
                      aria-label="Remove collaborator"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Input
                    label="Full Name"
                    placeholder="Marcus Vance"
                    value={collab.name}
                    onChange={(e) => handleUpdateCollaborator(index, 'name', e.target.value)}
                    required
                  />
                  <Input
                    type="email"
                    label="Email Address"
                    placeholder="marcus@producer.com"
                    value={collab.email}
                    onChange={(e) => handleUpdateCollaborator(index, 'email', e.target.value)}
                    required
                  />
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max="100"
                    label="Royalty Share (%)"
                    placeholder="50.00"
                    value={collab.royaltyPercentage}
                    onChange={(e) =>
                      handleUpdateCollaborator(
                        index,
                        'royaltyPercentage',
                        parseFloat(e.target.value) || 0,
                      )
                    }
                    required
                  />
                </div>

                <Input
                  label="Stellar Public Key (Starting with G)"
                  placeholder="GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQ6AAA4IKWQH6EBHMJD52Z"
                  value={collab.stellarWalletAddress}
                  onChange={(e) =>
                    handleUpdateCollaborator(index, 'stellarWalletAddress', e.target.value)
                  }
                  className="font-mono text-xs"
                  helperText="Recipient Stellar address where royalties will be distributed directly"
                  required
                />
              </div>
            ))}

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleAddCollaborator}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Add another collaborator
            </Button>
          </div>
        </Card>

        {/* Submit Bar */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-subtle">
          <Link to="/agreements">
            <Button variant="ghost" disabled={isSubmitting}>
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            disabled={!isTotalValid}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Create Agreement
          </Button>
        </div>
      </form>
    </div>
  );
};
