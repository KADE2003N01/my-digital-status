import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../services/api.js';
import PlatformFooter from '../../components/PlatformFooter.jsx';
import WebsiteLogo from '../../components/WebsiteLogo.jsx';
import WhatsAppContact from '../../components/WhatsAppContact.jsx';
import { formatSpacePrice, getSpacePlan, readSpaceOnboarding, saveSpaceOnboarding, shouldBypassSubscriptionGate } from '../../services/spacePlans.js';
import './PlatformAuthPages.css';

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

function PlatformAuthLayout({ title, description, children, links, variant }) {
  return <main className={`platform-auth-page${variant ? ` is-${variant}` : ''}`}>
    <header className="platform-auth-header">
      <WebsiteLogo className="platform-auth-brand" />
    </header>
    <div className="platform-auth-shell">
      {variant === 'login' && <aside className="platform-auth-welcome" aria-label="About FolioSpace">
        <p className="platform-auth-welcome-kicker">YOUR WORK. YOUR SPACE.</p>
        <h2>Your next chapter starts here.</h2>
        <p>Sign in to shape your portfolio, share your progress, and keep your professional story moving.</p>
        <ul>
          <li><i className="fa-solid fa-circle-check" aria-hidden="true" /> Your work, all in one place</li>
          <li><i className="fa-solid fa-circle-check" aria-hidden="true" /> A portfolio that grows with you</li>
          <li><i className="fa-solid fa-circle-check" aria-hidden="true" /> Simple tools to share your story</li>
        </ul>
        <div className="platform-auth-welcome-note"><i className="fa-solid fa-lock" aria-hidden="true" /> Your account stays private and secure</div>
      </aside>}
      <section className="platform-auth-card" aria-labelledby="platform-auth-title">
        <p className="platform-auth-eyebrow">YOUR CAREER, IN ONE PLACE</p>
        <h1 id="platform-auth-title">{title}</h1>
        <p className="platform-auth-description">{description}</p>
        {children}
        {links && <nav className="platform-auth-links" aria-label="Account links">{links}</nav>}
      </section>
      <a className="platform-auth-back" href="/">Return to FolioSpace</a>
    </div>
    {(variant === 'login' || variant === 'signup') && <><PlatformFooter /><WhatsAppContact /></>}
  </main>;
}

function StatusMessage({ message, error = false }) {
  if (!message) return null;
  return <p className={`platform-auth-status${error ? ' is-error' : ''}`} role="status" aria-live="polite">{message}</p>;
}

function PlatformAuthForm({ type }) {
  const navigate = useNavigate();
  const isSignup = type === 'signup';
  const isLogin = type === 'login';
  const isForgot = type === 'forgot';
  const isReset = type === 'reset';
  const config = {
    signup: ['Create your account', 'Build your portfolio profile and choose the space that fits your next step.'],
    login: ['Sign in', 'Welcome back. Continue building your public portfolio and manage your work.'],
    forgot: ['Reset your password', 'Enter the email linked to your account and we will send a secure reset link.'],
    reset: ['Choose a new password', 'Create a strong password and confirm your account details before continuing.']
  }[type];
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [isError, setIsError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [complete, setComplete] = useState(false);
  const token = new URLSearchParams(window.location.search).get('token') || '';
  const signupParams = new URLSearchParams(window.location.search);
  const selectedTemplateId = signupParams.get('template') || 'free';
  const selectedCurrency = signupParams.get('currency') === 'USD' ? 'USD' : 'RWF';
  const selectedPlan = getSpacePlan(selectedTemplateId);

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    setFeedback('');
    setIsError(false);
    try {
      if ((isSignup || isReset) && password !== confirmPassword) {
        throw new Error('Passwords do not match. Please retype them to continue.');
      }

      if (isSignup) {
        const result = await postAccountRequest('signup', {
          email, displayName, password, templateId: selectedPlan.id, currency: selectedCurrency
        });
        const skipPayment = shouldBypassSubscriptionGate();
        saveSpaceOnboarding({
          templateId: selectedPlan.id,
          stage: skipPayment || selectedPlan.priceRwf === 0 ? 'space-setup' : 'payment',
          displayName: displayName.trim(),
          email: email.trim().toLowerCase(),
          currency: selectedCurrency,
          paymentStatus: selectedPlan.priceRwf === 0 ? 'not-required' : 'paid'
        });
        setFeedback(result.message || 'Account created. Continue setting up your space.');
        setComplete(true);
        // The real API requires email verification and a later sign-in before
        // the user can create a portfolio. Keep the signup screen visible
        // until that flow is complete; the local demo has no verification step.
        if (result.onboarding) return;
        navigate(skipPayment || selectedPlan.priceRwf === 0 ? '/platform/space-setup' : '/platform/subscribe');
      } else if (isLogin) {
        const result = await postAccountRequest('login', { email, password });
        const localOnboarding = readSpaceOnboarding();
        const isSameAccount = localOnboarding?.email === email.trim().toLowerCase();
        const onboarding = isSameAccount ? localOnboarding : result.onboarding;
        const skipPayment = shouldBypassSubscriptionGate();
        const isComplete = onboarding?.stage === 'complete';
        const destination = skipPayment && !isComplete
          ? '/platform/space-setup'
          : onboarding?.stage === 'subscription' || (isSameAccount && onboarding?.stage === 'payment')
            ? '/platform/subscribe'
            : onboarding?.stage === 'space_setup' || (isSameAccount && onboarding?.stage === 'space-setup')
              ? '/platform/space-setup'
              : '/platform/dashboard';
        navigate(destination);
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
    ? null
    : isLogin
      ? null
      : isForgot
        ? <>Remembered it? <a href="/platform/login">Sign in</a></>
        : <>Password updated? <a href="/platform/login">Sign in</a></>;

  return <PlatformAuthLayout title={config[0]} description={config[1]} links={links} variant={isLogin ? 'login' : isSignup ? 'signup' : undefined}>
    {isSignup && <div className="platform-signup-plan">
      <span>Selected template</span>
      <strong>{selectedPlan.name}</strong>
      <span>{formatSpacePrice(selectedPlan, selectedCurrency)}{selectedPlan.priceRwf ? ' every 6 months' : ' · 1 month trial'}</span>
      <small>Your account and selected template are saved securely in our database.</small>
    </div>}
    {isReset && !token
      ? <StatusMessage message="This password reset link is invalid or expired. Request a new one." error />
      : <form className="platform-auth-form" onSubmit={submit}>
            {isSignup && <>
          <label htmlFor="platform-name">Full name</label>
              <input id="platform-name" name="name" autoComplete="name" maxLength={100} required placeholder="Jane Doe" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
        </>}
        {!isReset && <>
          <label htmlFor="platform-email">Email address</label>
          <div className="platform-auth-input-wrap">
            <span className="platform-auth-input-icon" aria-hidden="true"><i className="fa-solid fa-envelope" /></span>
            <input id="platform-email" name="email" type="email" autoComplete="email" maxLength={254} required placeholder="name@example.com" value={email} onChange={(event) => setEmail(event.target.value)} />
          </div>
        </>}
        {!isForgot && <>
          <div className="platform-auth-field-row">
            <label htmlFor="platform-password">{isReset ? 'New password' : 'Password'}</label>
          </div>
          <div className="platform-auth-password-wrap">
            <span className="platform-auth-input-icon" aria-hidden="true"><i className="fa-solid fa-lock" /></span>
            <input
              id="platform-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              minLength={isLogin ? 1 : 12}
              maxLength={isLogin ? 1024 : 64}
              required
              placeholder={isLogin ? 'Enter your password' : 'Create a strong password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            {!isForgot && (
              <button type="button" className="platform-auth-eye-button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((value) => !value)}>
                <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} aria-hidden="true" />
              </button>
            )}
          </div>
          {isLogin && (
            <div className="platform-auth-inline-row">
              <a href="/platform/forgot-password" className="platform-auth-forgot-link">Forgot password?</a>
            </div>
          )}
          {!isLogin && <small className="platform-auth-hint">Use at least 12 characters. Passwords are never stored as plain text.</small>}
        </>}
        {!isForgot && !isLogin && <>
          <div className="platform-auth-field-row">
            <label htmlFor="platform-confirm-password">Confirm password</label>
          </div>
          <div className="platform-auth-password-wrap">
            <span className="platform-auth-input-icon" aria-hidden="true"><i className="fa-solid fa-lock" /></span>
            <input
              id="platform-confirm-password"
              name="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              minLength={12}
              maxLength={64}
              required
              placeholder="Re-type your password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
            <button type="button" className="platform-auth-eye-button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((value) => !value)}>
              <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} aria-hidden="true" />
            </button>
          </div>
        </>}
        <StatusMessage message={feedback} error={isError} />
        <button type="submit" className="platform-auth-submit" disabled={submitting || complete}>
          {submitting ? 'Please wait…' : isSignup ? 'Create account' : isLogin ? 'Sign in' : isForgot ? 'Send reset link' : 'Update password'}
        </button>
        {isSignup && (
          <p className="platform-auth-account-prompt">
            Already registered? <a href={`/platform/login${window.location.search}`}>Sign in</a>
          </p>
        )}
        {isLogin && (
          <p className="platform-auth-account-prompt">
            Don&apos;t have an account? <a href="/platform/templates">Create account</a>
          </p>
        )}
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
    links={<>Ready to continue? <a href="/platform/login">Sign in</a></>}
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
          window.location.replace('/platform/login?next=/platform/account');
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
      window.location.replace('/platform/login');
    } catch (error) {
      setFeedback(error.message || 'Could not sign out.');
      setIsError(true);
    }
  }

  return <PlatformAuthLayout
    title={user ? `Welcome, ${user.displayName}` : 'Your account'}
    description="Manage your account and build your FolioSpace portfolio."
    links={<><a href="/platform/dashboard">Open portfolio dashboard</a><a href="/">View the existing portfolio</a></>}
  >
    {user && <p className="platform-auth-user-email">{user.email}</p>}
    <StatusMessage message={feedback} error={isError} />
    {user && <button className="platform-auth-secondary" type="button" onClick={logout}>Sign out</button>}
  </PlatformAuthLayout>;
}

export function PlatformAuthPage() {
  const pageName = window.location.pathname;
  if (pageName === '/platform/verify-email') return <VerifyEmailPage />;
  const pageTypes = {
    '/platform/signup': 'signup',
    '/platform/login': 'login',
    '/platform/forgot-password': 'forgot',
    '/platform/reset-password': 'reset'
  };
  return <PlatformAuthForm type={pageTypes[pageName] || 'login'} />;
}
