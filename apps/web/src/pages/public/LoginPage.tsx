import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../design-system/Input';
import { Button } from '../../design-system/Button';
import { Alert } from '../../design-system/Alert';
import { ArrowRight, Mail, Lock } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both your email address and password.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await login({ email, password });
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid email or password.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-xl font-bold tracking-tight text-slate-100">Welcome back</h1>
        <p className="text-xs text-slate-400">
          Sign in to access your contracts, royalty splits, and Stellar payouts.
        </p>
      </div>

      {error && (
        <Alert variant="danger" title="Authentication failed">
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          type="email"
          label="Email address"
          placeholder="artist@example.com"
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
          autoComplete="current-password"
          required
        />

        <Button
          type="submit"
          variant="primary"
          className="w-full"
          isLoading={isLoading}
          rightIcon={<ArrowRight className="w-4 h-4" />}
        >
          Sign in
        </Button>
      </form>

      <div className="text-center pt-2 border-t border-border-subtle">
        <p className="text-xs text-slate-400">
          Don't have an account?{' '}
          <Link to="/register" className="font-semibold text-brand-gold hover:underline">
            Create an artist account
          </Link>
        </p>
      </div>
    </div>
  );
};
