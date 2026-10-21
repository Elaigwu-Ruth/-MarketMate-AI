'use client';
import { useState } from 'react';
import { ArrowLeft, ArrowRight, ShieldCheck } from 'lucide-react';
import { Brand } from '@/components/brand';
import type { User } from '@/lib/types';

async function request<T>(path: string, data: unknown): Promise<T> {
  const response = await fetch('/api/' + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    cache: 'no-store',
  });
  const raw = await response.text();
  let body: { user?: User; error?: string } = {};
  try {
    body = raw ? JSON.parse(raw) : {};
  } catch {
    throw new Error(response.ok ? 'The server returned an unexpected response.' : `Request failed (${response.status}).`);
  }
  if (!response.ok) throw new Error(body.error || 'Please try again.');
  if (!body.user) throw new Error('The server did not return an account.');
  return body as T;
}

export function AuthScreen({ onAuthenticated }: { onAuthenticated: (user: User) => Promise<void> }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function switchMode(next: 'login' | 'register') {
    setMode(next);
    setError('');
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError('');
    setBusy(true);
    try {
      const data = Object.fromEntries(new FormData(event.currentTarget));
      if (mode === 'register' && data.password !== data.confirm) {
        setError('The passwords you entered do not match.');
        return;
      }
      const result = await request<{ user: User }>(mode === 'login' ? 'auth/login' : 'auth/register', data);
      await onAuthenticated(result.user);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return <main className="prototype-entry">
    <section className="entry-card">
      <Brand/>
      {mode === 'login' ? <>
        <span className="prototype-label">WELCOME BACK</span>
        <h1>Sign in<span>.</span></h1>
        <p>Your chats, marketplace and wallet, together.</p>
        {error && <p className="payment-error" role="alert">{error}</p>}
        <form className="form" onSubmit={submit}>
          <label>Email<input name="email" type="email" autoComplete="email" placeholder="you@example.com" required autoFocus/></label>
          <label>Password<input name="password" type="password" autoComplete="current-password" required/></label>
          <button className="primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'} <ArrowRight size={17}/></button>
        </form>
        <button className="text-button" onClick={() => switchMode('register')}>Create account</button>
        <p className="entry-explanation">Your session stays on this browser until you sign out.</p>
      </> : <>
        <button className="back-link" onClick={() => switchMode('login')}><ArrowLeft size={16}/> Sign in</button>
        <span className="prototype-label">JOIN THE MARKETPLACE</span>
        <h1>Create your account<span>.</span></h1>
        <p>Chat, discover and shop with people nearby.</p>
        {error && <p className="payment-error" role="alert">{error}</p>}
        <form className="form" onSubmit={submit}>
          <label>Your name<input name="name" autoComplete="name" maxLength={80} placeholder="e.g. Ngozi Adeyemi" required/></label>
          <label>Username (optional)<input name="username" autoComplete="username" maxLength={24} pattern="[A-Za-z][A-Za-z0-9_]{2,23}" placeholder="e.g. ngozi_adeyemi"/></label>
          <label>Email<input name="email" type="email" autoComplete="email" required/></label>
          <label>Password<input name="password" type="password" autoComplete="new-password" minLength={8} required/></label>
          <label>Confirm password<input name="confirm" type="password" autoComplete="new-password" minLength={8} required/></label>
          <button className="primary" disabled={busy}>{busy ? 'Creating account…' : 'Create your account'} <ArrowRight size={17}/></button>
        </form>
        <p className="entry-explanation">You can add a profile picture and start selling after your first sign-in.</p>
      </>}
      <div className="entry-footer">
        <ShieldCheck size={15}/> Wallet balances are simulated · No real-money transfers
      </div>
    </section>
  </main>;
}
