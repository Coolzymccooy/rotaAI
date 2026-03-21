import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Stethoscope, Loader2, Eye, EyeOff, Building2, Mail } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';

export function Register() {
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('invite');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [orgName, setOrgName] = useState('');
  const [mode, setMode] = useState<'create-org' | 'invite'>(inviteToken ? 'invite' : 'create-org');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [inviteInfo, setInviteInfo] = useState<any>(null);
  const [isValidatingInvite, setIsValidatingInvite] = useState(!!inviteToken);
  const { register } = useAuth();
  const navigate = useNavigate();

  // Validate invite token on mount
  useEffect(() => {
    if (!inviteToken) return;
    setIsValidatingInvite(true);
    fetch(`/api/auth/invite/${inviteToken}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setInviteInfo(data.data);
          setEmail(data.data.email);
          setMode('invite');
        } else {
          setError(data.message || 'Invalid or expired invite link');
          setMode('create-org');
        }
      })
      .catch(() => setError('Failed to validate invite'))
      .finally(() => setIsValidatingInvite(false));
  }, [inviteToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'create-org' && !orgName.trim()) {
      setError('Organization name is required');
      return;
    }

    setIsLoading(true);
    try {
      const body: any = { email, password, name };
      if (mode === 'invite' && inviteToken) {
        body.inviteToken = inviteToken;
      } else {
        body.organizationName = orgName;
        body.role = 'admin';
      }

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Registration failed');

      // Auto-login
      localStorage.setItem('rotaai_token', data.data.token);
      window.location.href = '/app';
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isValidatingInvite) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-primary font-bold text-2xl mb-2">
            <Stethoscope className="w-7 h-7" />RotaAI
          </Link>
          <p className="text-muted-foreground">
            {inviteInfo
              ? `You've been invited to join ${inviteInfo.organizationName}`
              : 'Create your organization'}
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl p-8 shadow-sm">
          {/* Mode toggle (only if no invite) */}
          {!inviteToken && (
            <div className="flex items-center bg-secondary rounded-lg p-1 mb-6 gap-1">
              <button onClick={() => setMode('create-org')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${mode === 'create-org' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}>
                <Building2 className="w-4 h-4" />New Organization
              </button>
              <button onClick={() => setMode('invite')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${mode === 'invite' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}>
                <Mail className="w-4 h-4" />Have an Invite
              </button>
            </div>
          )}

          {/* Invite badge */}
          {inviteInfo && (
            <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg mb-6 text-center">
              <p className="text-sm font-medium text-primary">{inviteInfo.organizationName}</p>
              <p className="text-xs text-muted-foreground mt-1">You'll join as <strong>{inviteInfo.role}</strong></p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">{error}</div>
            )}

            {mode === 'create-org' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Organization / Trust Name</label>
                <input type="text" required value={orgName} onChange={(e) => setOrgName(e.target.value)}
                  className="w-full h-10 px-3 rounded-md bg-secondary text-foreground border border-border focus:border-primary outline-none text-sm"
                  placeholder="e.g. Manchester Foundation Trust" />
                <p className="text-xs text-muted-foreground">You'll be the admin of this organization.</p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Full Name</label>
              <input type="text" required value={name} onChange={(e) => setName(e.target.value)}
                className="w-full h-10 px-3 rounded-md bg-secondary text-foreground border border-border focus:border-primary outline-none text-sm"
                placeholder="Dr. John Doe" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                disabled={!!inviteInfo}
                className="w-full h-10 px-3 rounded-md bg-secondary text-foreground border border-border focus:border-primary outline-none text-sm disabled:opacity-60"
                placeholder="you@nhs.net" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-10 px-3 pr-10 rounded-md bg-secondary text-foreground border border-border focus:border-primary outline-none text-sm"
                  placeholder="Min 6 characters" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {mode === 'invite' && !inviteToken && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Invite Code</label>
                <input type="text" placeholder="Paste your invite token"
                  className="w-full h-10 px-3 rounded-md bg-secondary text-foreground border border-border focus:border-primary outline-none text-sm font-mono text-xs" />
                <p className="text-xs text-muted-foreground">Ask your organization admin for an invite link.</p>
              </div>
            )}

            <button type="submit" disabled={isLoading}
              className="w-full h-10 bg-primary text-primary-foreground rounded-md font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === 'create-org' ? 'Create Organization & Account' : 'Join Organization'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="text-primary hover:underline font-medium">Sign in</Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
