import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useStellarWallet } from '../../context/StellarWalletContext';
import { useNotifications } from '../../context/NotificationContext';
import { usersApi } from '../../api/users.api';
import { Button } from '../../design-system/Button';
import { Input } from '../../design-system/Input';
import { Card, CardHeader, CardTitle } from '../../design-system/Card';
import { Badge } from '../../design-system/Badge';
import { Alert } from '../../design-system/Alert';
import { User, Sparkles, Globe, Wallet, Check, Save } from 'lucide-react';

export const ArtistProfilePage: React.FC = () => {
  const { user, refreshProfile } = useAuth();
  const { isConnected, publicKey, connectWallet } = useStellarWallet();
  const { addToast } = useNotifications();

  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [stageName, setStageName] = useState(user?.artistProfile?.stageName || '');
  const [bio, setBio] = useState(user?.artistProfile?.bio || '');
  const [country, setCountry] = useState(user?.artistProfile?.country || 'USA');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setStageName(user.artistProfile?.stageName || '');
      setBio(user.artistProfile?.bio || '');
      setCountry(user.artistProfile?.country || 'USA');
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      await usersApi.updateProfile({
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        stageName: stageName.trim() || undefined,
        bio: bio.trim() || undefined,
        country: country.trim() ? country.toUpperCase().trim() : undefined,
      });

      await refreshProfile();
      addToast({
        type: 'success',
        title: 'Profile Updated',
        message: 'Your artist profile information has been saved.',
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-border-subtle">
        <h1 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
          <User className="w-6 h-6 text-brand-gold" />
          Artist Profile &amp; Identity
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Manage your public stage name, legal details, and Stellar payout configuration.
        </p>
      </div>

      {error && (
        <Alert variant="danger" title="Update Failed">
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Public Artist Info</CardTitle>
          </CardHeader>

          <div className="space-y-4">
            <Input
              label="Stage Name / Artist Handle"
              placeholder="e.g. Luna Beats"
              value={stageName}
              onChange={(e) => setStageName(e.target.value)}
              leftIcon={<Sparkles className="w-4 h-4 text-brand-gold" />}
              helperText="How your name appears on public agreements and contributor splits"
              required
            />

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">
                Artist Bio &amp; Role Summary
              </label>
              <textarea
                rows={3}
                placeholder="Producer, composer, and mixing engineer..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full bg-surface text-slate-100 placeholder:text-slate-500 border border-border-subtle rounded-lg text-sm p-3 focus:outline-none focus:border-brand-stellar"
              />
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Personal &amp; Legal Details</CardTitle>
          </CardHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="First Name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
              <Input
                label="Last Name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Email (Account)"
                value={user?.email || ''}
                disabled
                helperText="Primary email cannot be modified directly"
              />
              <Input
                label="Country (3-Letter ISO Code)"
                value={country}
                maxLength={3}
                onChange={(e) => setCountry(e.target.value.toUpperCase())}
                leftIcon={<Globe className="w-4 h-4" />}
                helperText="e.g. USA, GBR, CAN, DEU"
              />
            </div>
          </div>
        </Card>

        {/* Linked Stellar Account */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <CardTitle className="text-sm">Stellar Royalty Wallet</CardTitle>
              <Badge variant={isConnected ? 'success' : 'default'} size="sm">
                {isConnected ? 'Active Freighter Link' : 'Not Connected'}
              </Badge>
            </div>
          </CardHeader>

          <div className="text-xs space-y-3">
            <p className="text-slate-400">
              Your connected Stellar address is used as the default recipient account for automated
              smart contract distributions.
            </p>

            {isConnected ? (
              <div className="p-3 rounded-lg bg-surface-elevated border border-border-subtle font-mono text-xs text-brand-stellar truncate flex items-center justify-between">
                <span className="truncate pr-2">{publicKey}</span>
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              </div>
            ) : (
              <Button
                type="button"
                variant="stellar"
                size="sm"
                onClick={connectWallet}
                leftIcon={<Wallet className="w-3.5 h-3.5" />}
              >
                Connect Freighter Wallet
              </Button>
            )}
          </div>
        </Card>

        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            variant="primary"
            isLoading={isSaving}
            leftIcon={<Save className="w-4 h-4" />}
          >
            Save Profile Changes
          </Button>
        </div>
      </form>
    </div>
  );
};
