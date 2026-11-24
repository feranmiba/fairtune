import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../design-system/Input';
import { Button } from '../../design-system/Button';
import { Alert } from '../../design-system/Alert';
import { ArrowRight, Mail, Lock, User, Sparkles } from 'lucide-react';
import { UserRole } from '@fairtune/shared';

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [stageName, setStageName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !email || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    // Basic password validation pre-check
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await register({
        firstName,
        lastName,
        stageName: stageName.trim() ? stageName.trim() : undefined,
        email,
        password,
        role: UserRole.ARTIST,
      });
      navigate('/onboarding');
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Registration failed. Please check your inputs.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-xl font-bold tracking-tight text-slate-100">
          Create your artist account
        </h1>
        <p className="text-xs text-slate-400">
          Join FairTune to analyze contracts and manage on-chain royalty splits.
        </p>
      </div>

      {error && (
        <Alert variant="danger" title="Registration failed">
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="First name"
            placeholder="Sarah"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
          <Input
            label="Last name"
            placeholder="Jenkins"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />
        </div>

        <Input
          label="Stage name or handle"
          placeholder="e.g. Luna Beats"
          value={stageName}
          onChange={(e) => setStageName(e.target.value)}
          leftIcon={<Sparkles className="w-4 h-4 text-brand-gold" />}
          helperText="How collaborators know you"
        />

        <Input
          type="email"
          label="Email address"
          placeholder="sarah@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          leftIcon={<Mail className="w-4 h-4" />}
          autoComplete="email"
          required
        />

        <Input
          type="password"
          label="Password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          leftIcon={<Lock className="w-4 h-4" />}
          helperText="At least 8 chars with uppercase, lowercase, number and symbol"
          autoComplete="new-password"
          required
        />

        <Button
          type="submit"
          variant="primary"
          className="w-full mt-2"
          isLoading={isLoading}
          rightIcon={<ArrowRight className="w-4 h-4" />}
        >
          Create account
        </Button>
      </form>

      <div className="text-center pt-2 border-t border-border-subtle">
        <p className="text-xs text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-brand-gold hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};
