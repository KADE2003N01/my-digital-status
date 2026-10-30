import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../services/api.js';
import './PlatformAuthPages.css';

const pageName = window.location.pathname.split('/').pop();

async function postAccountRequest(endpoint, payload) {
  const response = await apiFetch(`/platform-auth/${endpoint}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'The request could not be completed.');
  return result;
}

function PlatformAuthLayout({ title, description, children, links }) {
  return <main className="platform-auth-page">
    <div className="platform-auth-shell">
      <a className="platform-auth-brand" href="index.html">Digital Status</a>
      <section className="platform-auth-card" aria-labelledby="platform-auth-title">
        <p className="platform-auth-eyebrow">YOUR CAREER, IN ONE PLACE</p>
        <h1 id="platform-auth-title">{title}</h1>
        <p className="platform-auth-description">{description}</p>
        {children}
        <nav className="platform-auth-links" aria-label="Account links">{links}</nav>
      </section>
      <a className="platform-auth-back" href="index.html">Return to the portfolio</a>
    </div>
  </main>;
}

function StatusMessage({ message, error = false }) {
  if (!message) return null;
  return <p className={`platform-auth-status${error ? ' is-error' : ''}`} role="status" aria-live="polite">{message}</p>;
}

function PlatformAuthForm({ type }) {
  const isSignup = type === 'signup';
  const isLogin = type === 'login';
  const isForgot = type === 'forgot';
  const isReset = type === 'reset';
  const config = {
    signup: ['Create your account', 'Set up an account to build and share your professional portfolio.'],
    login: ['Sign in', 'Continue to your Digital Status account.'],
    forgot: ['Reset your password', 'We will email a secure reset link if an active account matches.'],
    reset: ['Choose a new password', 'Reset links expire after one hour and can only be used once.']
  }[type];
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isError, setIsError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [complete, setComplete] = useState(false);
  const token = new URLSearchParams(window.location.search).get('token') || '';

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    setFeedback('');
    setIsError(false);
    try {
      if (isSignup) {
        const result = await postAccountRequest('signup', { email, displayName, password });
        setFeedback(result.message);
        setComplete(true);
      } else if (isLogin) {
        await postAccountRequest('login', { email, password });
        const requestedNext = new URLSearchParams(window.location.search).get('next');
        window.location.replace(requestedNext === 'platform-dashboard.html' ? requestedNext : 'platform-dashboard.html');
      } else if (isForgot) {
        const result = await postAccountRequest('forgot-password', { email });
        setFeedback(result.message);
        setComplete(true);
      } else if (isReset) {
        const result = await postAccountRequest('reset-password', { token, password });
        setFeedback(result.message);
        setComplete(true);
      }
    } catch (error) {
      setFeedback(error.message || 'The request could not be completed.');
      setIsError(true);
    } finally {
      setSubmitting(false);
    }
  }

  const links = isSignup
    ? <>Already registered? <a href="platform-login.html">Sign in</a></>
    : isLogin
      ? <>New to Digital Status? <a href="platform-signup.html">Create an account</a><a href="platform-forgot-password.html">Forgot password?</a></>
      : isForgot
        ? <>Remembered it? <a href="platform-login.html">Sign in</a></>
        : <>Password updated? <a href="platform-login.html">Sign in</a></>;

  return <PlatformAuthLayout title={config[0]} description={config[1]} links={links}>
    {isReset && !token
      ? <StatusMessage message="This password reset link is invalid or expired. Request a new one." error />
      : <form className="platform-auth-form" onSubmit={submit}>
        {isSignup && <>
          <label htmlFor="platform-name">Full name</label>
          <input id="platform-name" name="name" autoComplete="name" maxLength={100} required value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
        </>}
        {!isReset && <>
          <label htmlFor="platform-email">Email address</label>
          <input id="platform-email" name="email" type="email" autoComplete="email" maxLength={254} required value={email} onChange={(event) => setEmail(event.target.value)} />
        </>}
        {!isForgot && <>
          <label htmlFor="platform-password">{isReset ? 'New password' : 'Password'}</label>
          <input id="platform-password" name="password" type="password" autoComplete={isLogin ? 'current-password' : 'new-password'} minLength={isLogin ? 1 : 12} maxLength={isLogin ? 1024 : 64} required value={password} onChange={(event) => setPassword(event.target.value)} />
          {!isLogin && <small className="platform-auth-hint">Use at least 12 characters. Passwords are never stored as plain text.</small>}
        </>}
        <StatusMessage message={feedback} error={isError} />
        <button type="submit" disabled={submitting || complete}>
          {submitting ? 'Please wait…' : isSignup ? 'Create account' : isLogin ? 'Sign in' : isForgot ? 'Send reset link' : 'Update password'}
        </button>
      </form>}
  </PlatformAuthLayout>;
}

function VerifyEmailPage() {
  const token = new URLSearchParams(window.location.search).get('token') || '';
  const [feedback, setFeedback] = useState('Verifying your email address…');
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    let active = true;
    if (!token) {
      setFeedback('This verification link is invalid or expired.');
      setIsError(true);
      return () => { active = false; };
    }
    postAccountRequest('verify-email', { token })
      .then((result) => { if (active) setFeedback(result.message); })
      .catch((error) => {
        if (active) {
          setFeedback(error.message || 'Email verification failed.');
          setIsError(true);
        }
      });
    return () => { active = false; };
  }, [token]);

  return <PlatformAuthLayout
    title="Verify your email"
    description="We are confirming the email address for your account."
    links={<>Ready to continue? <a href="platform-login.html">Sign in</a></>}
  >
    <StatusMessage message={feedback} error={isError} />
  </PlatformAuthLayout>;
}

export function PlatformAccountPage() {
  const [user, setUser] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    let active = true;
    apiFetch('/platform-auth/me', { credentials: 'include' })
      .then(async (response) => {
        if (response.status === 401) {
          window.location.replace('platform-login.html?next=platform-account.html');
          return;
        }
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'Could not load your account.');
        if (active) setUser(result.user);
      })
      .catch((error) => {
        if (active) {
          setFeedback(error.message || 'Could not load your account.');
          setIsError(true);
        }
      });
    return () => { active = false; };
  }, []);

  async function logout() {
    try {
      await postAccountRequest('logout', {});
      window.location.replace('platform-login.html');
    } catch (error) {
      setFeedback(error.message || 'Could not sign out.');
      setIsError(true);
    }
  }

  return <PlatformAuthLayout
    title={user ? `Welcome, ${user.displayName}` : 'Your account'}
    description="Manage your account and build a separate Digital Status portfolio."
    links={<><a href="platform-dashboard.html">Open portfolio dashboard</a><a href="index.html">View the existing portfolio</a></>}
  >
    {user && <p className="platform-auth-user-email">{user.email}</p>}
    <StatusMessage message={feedback} error={isError} />
    {user && <button className="platform-auth-secondary" type="button" onClick={logout}>Sign out</button>}
  </PlatformAuthLayout>;
}

export function PlatformAuthPage() {
  if (pageName === 'platform-verify-email.html') return <VerifyEmailPage />;
  const pageTypes = {
    'platform-signup.html': 'signup',
    'platform-login.html': 'login',
    'platform-forgot-password.html': 'forgot',
    'platform-reset-password.html': 'reset'
  };
  return <PlatformAuthForm type={pageTypes[pageName] || 'login'} />;
}
