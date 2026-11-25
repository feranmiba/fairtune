import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useStellarWallet } from '../../context/StellarWalletContext';
import { usersApi } from '../../api/users.api';
import { Input } from '../../design-system/Input';
import { Button } from '../../design-system/Button';
import { Alert } from '../../design-system/Alert';
import { Badge } from '../../design-system/Badge';
import { Sparkles, Globe, Wallet, ArrowRight, Check } from 'lucide-react';

export const ArtistOnboardingPage: React.FC = () => {
  const { user, refreshProfile } = useAuth();
  const { isConnected, publicKey, connectWallet, openConnectModal, isConnecting } =
    useStellarWallet();
  const navigate = useNavigate();

  const [stageName, setStageName] = useState(user?.artistProfile?.stageName || '');
  const [bio, setBio] = useState(user?.artistProfile?.bio || '');
  const [country, setCountry] = useState(user?.artistProfile?.country || 'USA');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stageName.trim()) {
      setError('Stage name is required to identify you on agreements.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await usersApi.updateProfile({
        stageName: stageName.trim(),
        bio: bio.trim() || undefined,
        country: country.trim() ? country.toUpperCase().trim() : undefined,
      });
      await refreshProfile();
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save artist profile.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-12 px-4 sm:px-6">
      <div className="bg-surface border border-border-subtle rounded-2xl p-6 sm:p-10 shadow-card space-y-8">
        <div className="space-y-2 text-center">
          <Badge variant="gold" className="font-mono">
            ARTIST ONBOARDING
          </Badge>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">
            Set up your artist profile
          </h1>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            This information identifies you to collaborators and establishes your royalty
            agreements.
          </p>
        </div>

        {error && (
          <Alert variant="danger" title="Error">
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Artist or stage name"
            placeholder="e.g. Luna Beats"
            value={stageName}
            onChange={(e) => setStageName(e.target.value)}
            leftIcon={<Sparkles className="w-4 h-4 text-brand-gold" />}
            helperText="The public name used on agreements and splits"
            required
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-300">
              Biography or role summary
            </label>
            <textarea
              rows={3}
              className="w-full bg-surface text-slate-100 placeholder:text-slate-500 border border-border-subtle rounded-lg text-sm p-3 focus:outline-none focus:ring-1 focus:ring-brand-stellar focus:border-brand-stellar"
              placeholder="Producer and songwriter specializing in electronic and ambient music."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
          </div>

          <Input
            label="Country (3-letter ISO code)"
            placeholder="USA"
            value={country}
            maxLength={3}
            onChange={(e) => setCountry(e.target.value.toUpperCase())}
            leftIcon={<Globe className="w-4 h-4" />}
            helperText="Used for regional royalty compliance (e.g. USA, GBR, CAN, DEU)"
          />

          {/* Optional Wallet Linking */}
          <div className="p-4 rounded-xl bg-surface-elevated border border-border-subtle space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-brand-stellar" />
                <span className="text-xs font-semibold text-slate-200">Stellar Wallet</span>
              </div>
              {isConnected ? (
                <Badge variant="success" size="sm">
                  <Check className="w-3 h-3" /> Connected
                </Badge>
              ) : (
                <Badge variant="default" size="sm">
                  Optional now
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Connect your Stellar wallet to sign agreements on-chain. You can also connect
              anytime later in settings.
            </p>
            {isConnected ? (
              <div className="p-2.5 rounded-lg bg-surface border border-border-subtle font-mono text-xs text-brand-stellar truncate">
                {publicKey}
              </div>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="stellar"
                onClick={connectWallet}
                isLoading={isConnecting}
              >
                Connect Stellar Wallet
              </Button>
            )}
          </div>

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            isLoading={isSubmitting}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Complete setup &amp; open dashboard
          </Button>
        </form>
      </div>
    </div>
  );
};
