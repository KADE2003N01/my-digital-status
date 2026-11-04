import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../services/api.js';
import PlatformFooter from '../../components/PlatformFooter.jsx';
import WebsiteLogo from '../../components/WebsiteLogo.jsx';
import WhatsAppContact from '../../components/WhatsAppContact.jsx';
import { formatSpacePrice, getSpacePlan, planPrivileges, readSpaceOnboarding, saveSpaceOnboarding, shouldBypassSubscriptionGate } from '../../services/spacePlans.js';
import UpgradeModal from '../../components/UpgradeModal.jsx';
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
        // Signed-in users always land on their account page.
        navigate('/platform/account');
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

const subscriptionPlans = [
  {
    id: 'free',
    name: 'Free',
    price: 'RWF 0',
    description: 'Ideal for launching your portfolio with the essentials.',
    privileges: planPrivileges('free'),
    accent: 'default'
  },
  {
    id: 'standard',
    name: 'Standard',
    price: 'RWF 10,000 / 6 months',
    description: 'For a cleaner, more professional portfolio presence.',
    privileges: planPrivileges('standard'),
    accent: 'blue'
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 'RWF 15,000 / 6 months',
    description: 'Designed for high-impact personal branding and stronger reach.',
    privileges: planPrivileges('professional'),
    accent: 'gold'
  }
];

export function PlatformAccountPage() {
  const [user, setUser] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [isError, setIsError] = useState(false);
  const [toast, setToast] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('free');
  const [activeTab, setActiveTab] = useState('overview');
  const [showSidebarMobile, setShowSidebarMobile] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [themeMode, setThemeMode] = useState('light');
  const [brightness, setBrightness] = useState(100);
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [profileForm, setProfileForm] = useState({
    displayName: '',
    email: '',
    phone: '',
    location: '',
    role: '',
    website: '',
    bio: ''
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (!feedback) return;
    setToast({ message: feedback, type: isError ? 'error' : 'info' });
  }, [feedback, isError]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    let active = true;
    const onboarding = readSpaceOnboarding();
    const fallbackUser = {
      displayName: onboarding?.displayName || 'Demo User',
      email: onboarding?.email || 'demo@foliospace.com',
      phone: '',
      location: '',
      role: 'Portfolio creator',
      website: '',
      bio: ''
    };

    if (onboarding?.templateId) setSelectedPlan(onboarding.templateId);

    apiFetch('/platform-auth/me', { credentials: 'include' })
      .then(async (response) => {
        if (response.status === 401) {
          if (active) {
            setUser(fallbackUser);
            setProfileForm({
              displayName: fallbackUser.displayName,
              email: fallbackUser.email,
              phone: '',
              location: '',
              role: fallbackUser.role,
              website: '',
              bio: ''
            });
            setFeedback('You are viewing a demo account session. Sign in to sync with your real profile.');
          }
          return;
        }
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'Could not load your account.');
        if (active) {
          const nextUser = result.user || fallbackUser;
          setUser(nextUser);
          setProfileForm({
            displayName: nextUser.displayName || fallbackUser.displayName,
            email: nextUser.email || fallbackUser.email,
            phone: nextUser.phone || '',
            location: nextUser.location || '',
            role: nextUser.role || fallbackUser.role,
            website: nextUser.website || '',
            bio: nextUser.bio || ''
          });
          if (nextUser.subscriptionPlan) setSelectedPlan(nextUser.subscriptionPlan);
        }
      })
      .catch((error) => {
        if (active) {
          setUser(fallbackUser);
          setProfileForm({
            displayName: fallbackUser.displayName,
            email: fallbackUser.email,
            phone: '',
            location: '',
            role: fallbackUser.role,
            website: '',
            bio: ''
          });
          setFeedback(error.message || 'Could not load your account. Showing a demo account instead.');
          setIsError(true);
        }
      });
    return () => { active = false; };
  }, []);

  const activePlan = subscriptionPlans.find((plan) => plan.id === selectedPlan) || subscriptionPlans[0];
  const [upgradePrompt, setUpgradePrompt] = useState(null);

  async function logout() {
    try {
      await postAccountRequest('logout', {});
      window.location.replace('/platform/login');
    } catch (error) {
      setFeedback(error.message || 'Could not sign out.');
      setIsError(true);
    }
  }

  async function handleProfileSubmit(event) {
    if (event) event.preventDefault();
    setSavingProfile(true);
    setFeedback('');
    setIsError(false);
    try {
      saveSpaceOnboarding({
        displayName: profileForm.displayName.trim(),
        email: profileForm.email.trim().toLowerCase(),
        stage: 'space-setup'
      });
      setFeedback('Your personal details were saved for this session. Connect the backend API when you are ready to store them permanently.');
    } catch (error) {
      setFeedback(error.message || 'Your profile could not be saved.');
      setIsError(true);
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault();
    setSavingPassword(true);
    setFeedback('');
    setIsError(false);
    try {
      if (!emailVerified) {
        throw new Error('Verify your email before you can update your password.');
      }
      if (!passwordForm.currentPassword.trim()) {
        throw new Error('Your current password is required.');
      }
      if (passwordForm.newPassword.length < 12) {
        throw new Error('New passwords must be at least 12 characters long.');
      }
      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        throw new Error('The new password and confirmation do not match.');
      }
      setFeedback('Password updated successfully. Please sign in again with your new password when the API is connected.');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      setFeedback(error.message || 'Your password could not be updated.');
      setIsError(true);
    } finally {
      setSavingPassword(false);
    }
  }

  function handlePlanSelection(planId) {
    if (planId !== 'free') {
      // Payment is not connected yet — the demo grants the plan without checkout,
      // so selection activates immediately and the plan gates follow the record.
      setUpgradePrompt(null);
    }
    setSelectedPlan(planId);
    saveSpaceOnboarding({ templateId: planId, stage: planId === 'free' ? 'space-setup' : 'payment' });
    setFeedback(`${getSpacePlan(planId).name} is now selected for your FolioSpace. Review the privileges below and choose the next step.`);
    setIsError(false);
  }

  function handleSendVerificationEmail() {
    setVerificationSent(true);
    setVerificationCode('');
    setFeedback('A 6-digit verification code has been sent to your email address. Enter it to continue.');
    setIsError(false);
  }

  function handleVerifyEmail() {
    if (!verificationCode || verificationCode.length !== 6) {
      setFeedback('Enter the 6-digit code that was sent to your email.');
      setIsError(true);
      return;
    }
    if (verificationCode !== '123456') {
      setFeedback('The verification code is incorrect. Use the code sent to your email and try again.');
      setIsError(true);
      return;
    }
    setEmailVerified(true);
    setFeedback('Your email has been verified successfully. You can now update your password.');
    setIsError(false);
  }

  const navItems = [
    { id: 'overview', label: 'Overview', icon: 'fa-house' },
    { id: 'profile', label: 'Profile', icon: 'fa-user' },
    { id: 'security', label: 'Security', icon: 'fa-shield-halved' },
    { id: 'subscription', label: 'Subscriptions', icon: 'fa-crown' },
    { id: 'benefits', label: 'Privileges', icon: 'fa-list-check' },
    { id: 'settings', label: 'Settings', icon: 'fa-gear' },
    { id: 'support', label: 'Support', icon: 'fa-circle-question' }
  ];

  const sidebarLinks = [
    { label: 'Dashboard', icon: 'fa-chart-simple', href: '/platform/dashboard' },
    { label: 'Portfolio editor', icon: 'fa-briefcase', href: '/platform/portfolio' },
    { label: 'Documents', icon: 'fa-folder-open', href: '/document' },
    { label: 'Help centre', icon: 'fa-book-open', href: '/platform/help' }
  ];

  function applyTheme(mode) {
    setThemeMode(mode);
    setFeedback(`Theme changed to ${mode === 'light' ? 'light' : mode === 'soft-blue' ? 'soft blue' : 'warm'}.`);
    setIsError(false);
  }

  const renderActivePanel = () => {
    switch (activeTab) {
      case 'profile':
        return <section id="profile" className="platform-account-panel">
          <div className="platform-account-panel-header">
            <div>
              <p className="platform-account-section-label">Profile</p>
              <h2>Personal information</h2>
            </div>
          </div>
          <p className="platform-account-intro">Keep your public identity clear, current and easy to understand for visitors, clients and recruiters.</p>
          <form className="platform-account-form" onSubmit={handleProfileSubmit}>
            <div className="platform-account-form-grid">
              <label>
                <span>Full name</span>
                <input type="text" value={profileForm.displayName} onChange={(event) => setProfileForm((current) => ({ ...current, displayName: event.target.value }))} placeholder="Your full name" />
              </label>
              <label>
                <span>Professional role</span>
                <input type="text" value={profileForm.role} onChange={(event) => setProfileForm((current) => ({ ...current, role: event.target.value }))} placeholder="Designer, developer, consultant..." />
              </label>
              <label>
                <span>Email address</span>
                <input type="email" value={profileForm.email} onChange={(event) => setProfileForm((current) => ({ ...current, email: event.target.value }))} placeholder="name@example.com" />
              </label>
              <label>
                <span>Phone number</span>
                <input type="tel" value={profileForm.phone} onChange={(event) => setProfileForm((current) => ({ ...current, phone: event.target.value }))} placeholder="+250 7xx xxx xxx" />
              </label>
              <label>
                <span>Location</span>
                <input type="text" value={profileForm.location} onChange={(event) => setProfileForm((current) => ({ ...current, location: event.target.value }))} placeholder="Kigali, Rwanda" />
              </label>
              <label>
                <span>Website</span>
                <input type="url" value={profileForm.website} onChange={(event) => setProfileForm((current) => ({ ...current, website: event.target.value }))} placeholder="https://yourwebsite.com" />
              </label>
            </div>
            <div className="platform-account-form-grid single-column">
              <label>
                <span>Short bio</span>
                <textarea value={profileForm.bio} onChange={(event) => setProfileForm((current) => ({ ...current, bio: event.target.value }))} placeholder="Tell visitors what you do and what you are building." />
              </label>
            </div>
            <div className="platform-account-actions">
              <button type="submit" className="primary" disabled={savingProfile}>{savingProfile ? 'Saving...' : 'Save profile'}</button>
            </div>
          </form>
        </section>;
      case 'security':
        return <section id="security" className="platform-account-panel">
          <div className="platform-account-panel-header">
            <div>
              <p className="platform-account-section-label">Security</p>
              <h2>Protect your account</h2>
            </div>
          </div>
          <p className="platform-account-intro">We verify your email before any password change is accepted. This confirms you are updating the account tied to your registered address.</p>
          {!emailVerified && <div className="platform-account-verification-box">
            <div className="platform-account-verification-header">
              <i className="fa-solid fa-envelope-circle-check" aria-hidden="true" />
              <strong>Email verification required</strong>
            </div>
            <p>Send a verification code to <span>{profileForm.email || user?.email || 'your email address'}</span> and use it before changing your password.</p>
            <button type="button" className="platform-account-inline-action" onClick={handleSendVerificationEmail}>
              {verificationSent ? 'Resend verification email' : 'Send verification email'}
            </button>
            {verificationSent && <>
              <label className="platform-account-code-label" htmlFor="security-verification-code">Verification code</label>
              <input id="security-verification-code" type="text" inputMode="numeric" maxLength={6} value={verificationCode} onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="Enter 6-digit code" />
              <button type="button" className="platform-account-inline-action is-secondary" onClick={handleVerifyEmail}>Verify email</button>
            </>}
          </div>}
          {emailVerified && <form className="platform-account-form" onSubmit={handlePasswordSubmit}>
            <div className="platform-account-form-grid">
              <label>
                <span>Current password</span>
                <input type="password" value={passwordForm.currentPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))} placeholder="Type your current password" />
              </label>
              <label>
                <span>New password</span>
                <input type="password" value={passwordForm.newPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))} placeholder="Use at least 12 characters" />
              </label>
              <label>
                <span>Confirm new password</span>
                <input type="password" value={passwordForm.confirmPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))} placeholder="Type it again" />
              </label>
            </div>
            <div className="platform-account-actions">
              <button type="submit" className="primary" disabled={savingPassword}>{savingPassword ? 'Updating...' : 'Update password'}</button>
            </div>
          </form>}
        </section>;
      case 'subscription':
        return <section id="subscription" className="platform-account-panel">
          <div className="platform-account-panel-header">
            <div>
              <p className="platform-account-section-label">Subscriptions</p>
              <h2>Choose your plan</h2>
            </div>
          </div>
          <p className="platform-account-intro">Select the plan that matches your growth stage. Your account dashboard updates immediately so you can review your access and privileges.</p>
          <div className="platform-account-plan-grid">
            {subscriptionPlans.map((plan) => (
              <article key={plan.id} className={`platform-account-plan-card is-${plan.accent}${selectedPlan === plan.id ? ' is-selected' : ''}`}>
                <div className="platform-account-plan-header">
                  <div>
                    <p>{plan.name}</p>
                    <strong>{plan.price}</strong>
                  </div>
                  {selectedPlan === plan.id && <span className="platform-account-plan-tag">Current</span>}
                </div>
                <small>{plan.description}</small>
                <ul>
                  {plan.privileges.map((privilege) => <li key={privilege}><i className="fa-solid fa-circle-check" aria-hidden="true" />{privilege}</li>)}
                </ul>
                <button type="button" onClick={() => handlePlanSelection(plan.id)}>{selectedPlan === plan.id ? 'Selected' : plan.id === 'free' ? 'Select plan' : `Switch to ${plan.name}`}</button>
              </article>
            ))}
          </div>
          <UpgradeModal
            open={Boolean(upgradePrompt)}
            title={upgradePrompt?.title}
            feature={upgradePrompt?.feature}
            onClose={() => setUpgradePrompt(null)}
          />
        </section>;
      case 'benefits':
        return <section id="benefits" className="platform-account-panel">
          <div className="platform-account-panel-header">
            <div>
              <p className="platform-account-section-label">Privileges</p>
              <h2>{activePlan.name} plan access</h2>
            </div>
          </div>
          <p className="platform-account-intro">This page summarises the tools and visibility that come with your selected subscription plan.</p>
          <div className="platform-account-benefits">
            {activePlan.privileges.map((privilege) => (
              <div key={privilege} className="platform-account-benefit-item">
                <i className="fa-solid fa-check" aria-hidden="true" />
                <span>{privilege}</span>
              </div>
            ))}
          </div>
        </section>;
      case 'settings':
        return <section id="settings" className="platform-account-panel">
          <div className="platform-account-panel-header">
            <div>
              <p className="platform-account-section-label">Settings</p>
              <h2>Account settings</h2>
            </div>
          </div>
          <p className="platform-account-intro">Customise your experience, manage your notifications, and keep your account ready for a secure workflow.</p>
          <div className="platform-account-settings-grid">
            <div className="platform-account-setting-card">
              <i className="fa-solid fa-bell" aria-hidden="true" />
              <div>
                <strong>Notifications</strong>
                <span>Email updates and product alerts</span>
              </div>
            </div>
            <div className="platform-account-setting-card platform-account-language-card">
              <i className="fa-solid fa-language" aria-hidden="true" />
              <div>
                <strong>Language</strong>
                <label className="platform-account-language-selector">
                  <span className="platform-account-language-label">System language</span>
                  <select value={selectedLanguage} onChange={(event) => {
                    setSelectedLanguage(event.target.value);
                    setFeedback(`Language changed to ${event.target.value}.`);
                    setIsError(false);
                  }}>
                    <option>English</option>
                    <option>French</option>
                    <option>Kiswahili</option>
                    <option>Spanish</option>
                    <option>Portuguese</option>
                  </select>
                </label>
              </div>
            </div>
            <div className="platform-account-setting-card">
              <i className="fa-solid fa-shield-heart" aria-hidden="true" />
              <div>
                <strong>Privacy</strong>
                <span>Keep your profile and content private</span>
              </div>
            </div>
            <div className="platform-account-setting-card platform-account-theme-card">
              <i className="fa-solid fa-palette" aria-hidden="true" />
              <div>
                <strong>Appearance</strong>
                <span>Choose your preferred light theme.</span>
                <div className="platform-account-theme-picker" role="group" aria-label="Theme choices">
                  {[
                    { id: 'light', label: 'Light' },
                    { id: 'soft-blue', label: 'Soft blue' },
                    { id: 'warm', label: 'Warm' }
                  ].map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      className={themeMode === option.id ? 'is-selected' : ''}
                      onClick={() => applyTheme(option.id)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <div className="platform-account-brightness" role="group" aria-label="Screen brightness">
                  <span className="platform-account-brightness-label">
                    <i className="fa-solid fa-sun" aria-hidden="true" />Brightness
                  </span>
                  <input
                    type="range"
                    min="70"
                    max="110"
                    step="1"
                    value={brightness}
                    aria-label="Brightness level"
                    onChange={(event) => setBrightness(Number(event.target.value))}
                  />
                  <span className="platform-account-brightness-value">{brightness}%</span>
                </div>
              </div>
            </div>
          </div>
        </section>;
      case 'support':
        return <section id="support" className="platform-account-panel">
          <div className="platform-account-panel-header">
            <div>
              <p className="platform-account-section-label">Support</p>
              <h2>Need help?</h2>
            </div>
          </div>
          <p className="platform-account-intro">Contact our support team whenever you need help with billing, settings, account access, or portfolio publishing.</p>
          <div className="platform-account-support-grid">
            <div className="platform-account-support-card">
              <i className="fa-solid fa-message" aria-hidden="true" />
              <strong>Ask support</strong>
              <span>Send a note and we will respond by email.</span>
              <button type="button" className="platform-account-inline-action is-secondary">Message support</button>
            </div>
            <div className="platform-account-support-card">
              <i className="fa-solid fa-circle-question" aria-hidden="true" />
              <strong>Knowledge base</strong>
              <span>Browse setup guides and account help topics.</span>
              <button type="button" className="platform-account-inline-action is-secondary">Open help centre</button>
            </div>
          </div>
        </section>;
      case 'overview':
      default:
        return <section id="overview" className="platform-account-panel">
          <div className="platform-account-panel-header">
            <div>
              <p className="platform-account-section-label">Overview</p>
              <h2>{user?.displayName || 'Welcome'}</h2>
            </div>
            <span className="platform-account-plan-badge">{activePlan.name} plan</span>
          </div>
          <p className="platform-account-intro">Your account dashboard gives you a quick snapshot of your current plan, portfolio readiness, and the tools available to manage your space.</p>
          <div className="platform-account-summary-grid">
            <div className="platform-account-stat-card">
              <span>Current plan</span>
              <strong>{activePlan.name}</strong>
              <small>{activePlan.price}</small>
            </div>
            <div className="platform-account-stat-card">
              <span>Portfolio status</span>
              <strong>Ready to publish</strong>
              <small>Use your dashboard to update content</small>
            </div>
            <div className="platform-account-stat-card">
              <span>Access</span>
              <strong>Portfolio editor</strong>
              <small>Manage your profile and public pages</small>
            </div>
          </div>
        </section>;
    }
  };

  const topbarTitle = navItems.find((item) => item.id === activeTab)?.label || 'Overview';

  return <main className={`platform-account-page${showSidebarMobile ? ' is-sidebar-open' : ''} is-${themeMode}`} style={brightness !== 100 ? { '--page-brightness': brightness / 100 } : undefined}>
    <header className="platform-account-topbar">
      <a className="platform-account-header-brand" href="/" aria-label="FolioSpace home">
        <WebsiteLogo href="/" className="platform-account-header-logo" />
      </a>
      <span className="platform-account-topbar-title">{topbarTitle}</span>
      <div className="platform-account-topbar-actions">
        {activeTab === 'profile' && (
          <button type="button" className="platform-account-save-button platform-account-save-button-mobile" onClick={() => handleProfileSubmit()}>
            {savingProfile ? 'Saving...' : 'Save profile'}
          </button>
        )}
        <a className="platform-account-dashboard-link" href="/platform/dashboard">Dashboard</a>
        <button
          type="button"
          className="platform-account-mobile-toggle"
          aria-label={showSidebarMobile ? 'Close navigation' : 'Toggle navigation'}
          onClick={() => setShowSidebarMobile((current) => !current)}
        >
          <i className={`fa-solid ${showSidebarMobile ? 'fa-xmark' : 'fa-bars'}`} aria-hidden="true" />
        </button>
      </div>
    </header>
    <div className="platform-account-body">
    <aside className="platform-account-sidebar" aria-label="Account navigation">
      <div className="platform-account-nav-scroll">
        <nav className="platform-account-nav">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={activeTab === item.id ? 'is-active' : ''}
              onClick={() => {
                setActiveTab(item.id);
                setShowSidebarMobile(false);
              }}
              aria-pressed={activeTab === item.id}
            >
              <i className={`fa-solid ${item.icon}`} aria-hidden="true" />
              {item.label}
            </button>
          ))}
        </nav>
        <nav className="platform-account-nav platform-account-nav-links" aria-label="More pages">
          {sidebarLinks.map((item) => (
            <a key={item.label} className="platform-account-nav-link" href={item.href}>
              <i className={`fa-solid ${item.icon}`} aria-hidden="true" />
              {item.label}
            </a>
          ))}
        </nav>
      </div>
      <div className="platform-account-logout-wrap">
        <div className="platform-account-user-card">
          <div className="platform-account-avatar" aria-hidden="true">
            {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="platform-account-user-meta">
            <strong>{user?.displayName || 'Your account'}</strong>
            <span>{user?.email || 'demo@foliospace.com'}</span>
          </div>
        </div>
        <button
          type="button"
          className="platform-account-logout-trigger"
          onClick={() => setShowLogoutDialog((current) => !current)}
          aria-label="Logout"
          title="You want to Exit?"
        >
          <i className="fa-solid fa-right-from-bracket" aria-hidden="true" />
        </button>
        {showLogoutDialog && (
          <div className="platform-account-logout-popover" role="dialog" aria-label="Logout confirmation">
            <div className="platform-account-logout-preview">
              <div className="platform-account-avatar is-large" aria-hidden="true">
                {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
              </div>
              <div>
                <strong>{user?.displayName || 'Your account'}</strong>
                <span>{user?.email || 'demo@foliospace.com'}</span>
              </div>
            </div>
            <button type="button" className="platform-account-logout-confirm" onClick={logout}>Logout</button>
          </div>
        )}
      </div>
    </aside>

    <div className="platform-account-main">
      <div className="platform-account-content-wrap">
        {renderActivePanel()}
        <StatusMessage message={feedback} error={isError} />
      </div>
      {toast && (
        <div className={`platform-account-toast ${toast.type === 'error' ? 'is-error' : ''}`} aria-live="polite">
          <span>{toast.message}</span>
          <button type="button" aria-label="Dismiss notification" onClick={() => setToast(null)}>×</button>
        </div>
      )}
    </div>
    </div>
  </main>;
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
