import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { apiFetch } from '../../services/api.js';
import PlatformFooter from '../../components/PlatformFooter.jsx';
import WebsiteLogo from '../../components/WebsiteLogo.jsx';
import WhatsAppContact from '../../components/WhatsAppContact.jsx';
import { formatSpacePrice, getSpacePlan, planPrivileges, readSpaceOnboarding, saveSpaceOnboarding, shouldBypassSubscriptionGate } from '../../services/spacePlans.js';
import { ACCOUNT_PAGE_OPTIONS, DEFAULT_ACCOUNT_PAGE_ACCESS } from '../../services/accountPageAccess.js';
import { getStoredSessionToken, storeSessionToken } from '../../services/adminSession.js';
import UpgradeModal from '../../components/UpgradeModal.jsx';
import ExpandableCell from '../../components/ExpandableCell.jsx';
import CustomerSupportChat from './CustomerSupportChat.jsx';
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

async function workspaceRequest(path, options = {}) {
  const response = await apiFetch(`/customer-workspace${path}`, {
    ...options,
    credentials: 'include',
    headers: { ...(options.body && !(options.body instanceof ArrayBuffer) ? { 'Content-Type': 'application/json' } : {}), ...options.headers }
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'The request could not be completed.');
  return result;
}

async function updateAccountProfile(payload) {
  const response = await apiFetch('/platform-auth/profile', { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Your profile could not be saved.');
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
    login: ['Sign in', 'One sign-in for your portfolio account or administrator workspace.'],
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
        const adminResponse = await apiFetch('/auth/login', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), password })
        });
        const adminResult = await adminResponse.json().catch(() => ({}));

        if (adminResponse.ok) {
          storeSessionToken(adminResult.sessionToken || '');
          const sessionToken = getStoredSessionToken();
          const verificationResponse = await apiFetch('/auth/me', {
            credentials: 'include',
            headers: sessionToken ? { Authorization: `Bearer ${sessionToken}` } : undefined
          });
          const verification = await verificationResponse.json().catch(() => ({}));
          if (!verificationResponse.ok || !verification.success
            || verification.user?.email?.toLowerCase() !== email.trim().toLowerCase()) {
            storeSessionToken('');
            throw new Error('Your administrator session could not be verified. Allow cookies for this site and try again.');
          }

          const roles = Array.isArray(verification.user.roles) ? verification.user.roles : [];
          const role = verification.user.role;
          window.location.replace(roles.includes('platform_owner') || role === 'platform_owner' ? '/platform/owner' : '/admin');
          return;
        }

        storeSessionToken('');
        if (adminResult.code !== 'ADMIN_NOT_FOUND' && adminResult.code !== 'ADMIN_SETUP_REQUIRED') {
          throw new Error(adminResult.error || 'Could not sign in. Check your details and try again.');
        }

        await postAccountRequest('login', { email, password });
        navigate('/platform/account/overview');
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

function getAccountGreeting(name = 'there') {
  const hour = new Date().getHours();
  const prefix = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  return { prefix, name };
}

function getSubscriptionSummary(planId, subscriptionEndsAt) {
  const baseDays = { free: 30, standard: 182, professional: 182 };
  const totalDays = baseDays[planId] ?? 182;
  if (planId === 'free' || !subscriptionEndsAt) {
    return { totalDays, daysLeft: totalDays, percent: 0, isWarning: false };
  }

  const endDate = new Date(subscriptionEndsAt);
  if (Number.isNaN(endDate.getTime())) {
    return { totalDays, daysLeft: totalDays, percent: 0, isWarning: false };
  }

  const now = Date.now();
  const msLeft = Math.max(0, endDate.getTime() - now);
  const daysLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
  const elapsed = Math.min(100, Math.max(0, ((totalDays - daysLeft) / totalDays) * 100));
  return {
    totalDays,
    daysLeft,
    percent: Math.round(elapsed),
    isWarning: elapsed >= 90
  };
}

export function PlatformAccountPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [isError, setIsError] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('free');
  const accountSection = location.pathname.match(/^\/platform\/account\/([^/]+)\/?$/)?.[1];
  const querySection = new URLSearchParams(location.search).get('section');
  const requestedSection = querySection === 'request' ? 'support-chat' : querySection;
  const activeTab = accountSection
    || (ACCOUNT_PAGE_OPTIONS.some(({ id }) => id === requestedSection) ? requestedSection : 'overview');
  const setActiveTab = (section) => navigate(`/platform/account/${section}`);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [themeMode, setThemeMode] = useState('light');
  const [brightness, setBrightness] = useState(100);
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [galleryFiles, setGalleryFiles] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatDraft, setChatDraft] = useState('');
  const [loadingWorkspace, setLoadingWorkspace] = useState(false);
  const [sendingChat, setSendingChat] = useState(false);
  const [portfolioSummary, setPortfolioSummary] = useState([]);
  const [supportRequests, setSupportRequests] = useState([]);
  const [loadingSupportRequests, setLoadingSupportRequests] = useState(false);
  const [profileForm, setProfileForm] = useState({
    displayName: '',
    email: '',
    phone: '',
    location: '',
    role: '',
    streetAddress: '',
    city: '',
    region: '',
    postalCode: '',
    country: '',
    website: '',
    bio: ''
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const allowedTabs = user?.id
    ? user.accountPages || DEFAULT_ACCOUNT_PAGE_ACCESS[selectedPlan] || DEFAULT_ACCOUNT_PAGE_ACCESS.professional
    : DEFAULT_ACCOUNT_PAGE_ACCESS[selectedPlan] || DEFAULT_ACCOUNT_PAGE_ACCESS.professional;

  useEffect(() => {
    if (accountSection) return;
    const search = new URLSearchParams(location.search);
    search.delete('section');
    const query = search.toString();
    navigate({
      pathname: `/platform/account/${activeTab}`,
      search: query ? `?${query}` : '',
      hash: location.hash
    }, { replace: true });
  }, [accountSection, activeTab, location.hash, location.search, navigate]);

  useEffect(() => {
    let active = true;
    const onboarding = readSpaceOnboarding();
    const fallbackUser = {
      displayName: onboarding?.displayName || 'Demo User',
      email: onboarding?.email || 'demo@foliospace.com',
      phone: '',
      location: '',
      role: 'Portfolio creator',
      streetAddress: '', city: '', region: '', postalCode: '', country: '',
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
              streetAddress: '', city: '', region: '', postalCode: '', country: '',
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
            role: nextUser.professionalRole || '',
            streetAddress: nextUser.streetAddress || '',
            city: nextUser.city || '',
            region: nextUser.region || '',
            postalCode: nextUser.postalCode || '',
            country: nextUser.country || '',
            website: nextUser.website || '',
            bio: nextUser.bio || ''
          });
          setSelectedPlan(nextUser.subscriptionPlan || onboarding?.templateId || 'professional');
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
            streetAddress: '', city: '', region: '', postalCode: '', country: '',
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
  const subscriptionSummary = getSubscriptionSummary(selectedPlan, user?.subscriptionEndsAt);
  const publishedPortfolios = portfolioSummary.filter((portfolio) => portfolio.status === 'published');
  const draftPortfolios = portfolioSummary.filter((portfolio) => portfolio.status !== 'published');
  const publicPortfolioUrl = portfolioSummary.find((portfolio) => portfolio.slug)
    ? `/u/${encodeURIComponent(portfolioSummary.find((portfolio) => portfolio.slug)?.slug)}`
    : '/platform/portfolio';
  const nextStep = portfolioSummary.length === 0
    ? {
      title: 'Create your first portfolio',
      description: 'Add your professional story, choose what to show, and prepare a public page you can share.',
      action: 'Start building',
      href: '/platform/portfolio'
    }
    : draftPortfolios.length > 0
      ? {
        title: `Finish ${draftPortfolios.length === 1 ? 'your draft' : `${draftPortfolios.length} drafts`}`,
        description: 'Review your portfolio details and publish when you are ready for people to see your work.',
        action: 'Continue editing',
        href: '/platform/portfolio'
      }
      : {
        title: 'Your portfolio is live',
        description: 'Your published work is ready to share. Review your public page and keep your profile up to date.',
        action: 'View public portfolio',
        href: publishedPortfolios[0]?.slug ? `/u/${encodeURIComponent(publishedPortfolios[0].slug)}` : '/platform/portfolio'
      };
  const greeting = getAccountGreeting(user?.displayName || 'there');
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
      const result = await updateAccountProfile({
        displayName: profileForm.displayName.trim(), phone: profileForm.phone.trim(),
        professionalRole: profileForm.role.trim(), location: profileForm.location.trim(),
        streetAddress: profileForm.streetAddress.trim(), city: profileForm.city.trim(), region: profileForm.region.trim(),
        postalCode: profileForm.postalCode.trim(), country: profileForm.country.trim(),
        website: profileForm.website.trim(), bio: profileForm.bio.trim()
      });
      setUser(result.user);
      saveSpaceOnboarding({ displayName: result.user.displayName, email: result.user.email, stage: 'space-setup' });
      setFeedback('Your profile has been saved to your FolioSpace account.');
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
      if (!passwordForm.currentPassword.trim()) {
        throw new Error('Your current password is required.');
      }
      if (passwordForm.newPassword.length < 12) {
        throw new Error('New passwords must be at least 12 characters long.');
      }
      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        throw new Error('The new password and confirmation do not match.');
      }
      const result = await postAccountRequest('change-password', { currentPassword: passwordForm.currentPassword, password: passwordForm.newPassword });
      setFeedback(result.message || 'Password updated. Sign in again.');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      window.setTimeout(() => window.location.replace('/platform/login'), 1200);
    } catch (error) {
      setFeedback(error.message || 'Your password could not be updated.');
      setIsError(true);
    } finally {
      setSavingPassword(false);
    }
  }

  function handlePlanSelection(planId) {
    const nextPlan = getSpacePlan(planId);
    setSelectedPlan(planId);
    setUser((current) => (current ? { ...current, subscriptionPlan: planId } : current));
    saveSpaceOnboarding({ templateId: planId, stage: 'space-setup' });
    setUpgradePrompt(null);
    setFeedback(`${nextPlan.name} is now active for this account session. Live plan assignments are controlled by the FolioSpace owner portal.`);
    setIsError(false);
  }

  useEffect(() => {
    let active = true;
    if (activeTab === 'overview' || activeTab === 'settings') {
      apiFetch('/portfolios', { credentials: 'include' }).then(async (response) => {
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'Could not load your portfolio spaces.');
        if (active) setPortfolioSummary(result.portfolios || []);
      }).catch(() => { if (active) setPortfolioSummary([]); });
    }
    if ((activeTab === 'gallery' || activeTab === 'chat') && user?.id) {
      setLoadingWorkspace(true);
      const request = activeTab === 'gallery' ? workspaceRequest('/gallery') : workspaceRequest('/chat');
      request.then((result) => {
        if (!active) return;
        if (activeTab === 'gallery') setGalleryFiles(result.files || []);
        else setChatMessages(result.messages || []);
      }).catch((error) => { if (active) { setFeedback(error.message); setIsError(true); } })
        .finally(() => { if (active) setLoadingWorkspace(false); });
    } else {
      setLoadingWorkspace(false);
    }
    return () => { active = false; };
  }, [activeTab, user?.id]);

  useEffect(() => {
    let active = true;
    if (activeTab !== 'support' || !user?.id) {
      setSupportRequests([]);
      setLoadingSupportRequests(false);
      return () => { active = false; };
    }

    setLoadingSupportRequests(true);
    apiFetch('/support-requests', { credentials: 'include' })
      .then(async (response) => {
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'Could not load your support request history.');
        if (active) setSupportRequests(result.requests || []);
      })
      .catch((error) => { if (active) { setFeedback(error.message); setIsError(true); } })
      .finally(() => { if (active) setLoadingSupportRequests(false); });
    return () => { active = false; };
  }, [activeTab, user?.id]);

  async function sendCustomerChat(event) {
    event.preventDefault();
    const body = chatDraft.trim();
    if (!body || sendingChat) return;
    setSendingChat(true);
    try {
      const result = await workspaceRequest(activeTab === 'support-chat' ? '/support-chat' : '/chat', {
        method: 'POST',
        body: JSON.stringify({ body })
      });
      setChatMessages((current) => [...current, result.message]);
      setChatDraft('');
    } catch (error) { setFeedback(error.message); setIsError(true); }
    finally { setSendingChat(false); }
  }

  async function uploadGalleryFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const response = await apiFetch(`/customer-workspace/gallery?name=${encodeURIComponent(file.name)}`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': file.type }, body: await file.arrayBuffer()
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Could not upload this file.');
      setGalleryFiles((current) => [result.file, ...current]);
      setFeedback('File uploaded to your private FolioSpace gallery.');
      setIsError(false);
    } catch (error) { setFeedback(error.message); setIsError(true); }
    finally { event.target.value = ''; }
  }

  async function deleteGalleryFile(fileId) {
    try {
      await workspaceRequest(`/gallery/${encodeURIComponent(fileId)}`, { method: 'DELETE' });
      setGalleryFiles((current) => current.filter((file) => file.id !== fileId));
      setFeedback('File removed from your gallery.');
      setIsError(false);
    } catch (error) { setFeedback(error.message); setIsError(true); }
  }

  const navItems = [
    { id: 'overview', label: 'Overview', icon: 'fa-house' },
    { id: 'profile', label: 'Profile', icon: 'fa-user' },
    { id: 'security', label: 'Security', icon: 'fa-shield-halved' },
    { id: 'subscription', label: 'Subscriptions', icon: 'fa-crown' },
    { id: 'benefits', label: 'Privileges', icon: 'fa-list-check' },
    { id: 'chat', label: 'Chat', icon: 'fa-comments' },
    { id: 'settings', label: 'Settings', icon: 'fa-gear' },
    { id: 'support', label: 'Support', icon: 'fa-circle-question' },
    { id: 'support-chat', label: 'Request', icon: 'fa-headset' },
    { id: 'gallery', label: 'Gallery', icon: 'fa-images' }
  ];

  const visibleNavItems = navItems.filter((item) => allowedTabs.includes(item.id));
  const supportRequestCounts = {
    total: supportRequests.length,
    open: supportRequests.filter((request) => request.status === 'open').length,
    resolved: supportRequests.filter((request) => request.status === 'resolved').length
  };

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
    if (!allowedTabs.includes(activeTab)) {
      return <section id={activeTab} className="platform-account-panel">
        <div className="platform-account-panel-header">
          <div>
            <p className="platform-account-section-label">{activeTab === 'support-chat' ? 'Request' : 'Locked'}</p>
            <h2>{activeTab === 'support-chat' ? 'Request access' : `${activePlan.name} plan access`}</h2>
          </div>
        </div>
        <p className="platform-account-intro">{activeTab === 'support-chat'
          ? 'The Request chat room is not enabled for this account. Access depends on your subscription and the platform owner’s page-access settings.'
          : 'This section is not available on your current plan. Upgrade to unlock more FolioSpace tools and controls.'}</p>
        <div className="platform-account-overview-actions">
          {allowedTabs.includes('subscription') && <button type="button" className="platform-account-inline-action" onClick={() => setActiveTab('subscription')}>View plans</button>}
          {activeTab === 'support-chat' && allowedTabs.includes('support') && <button type="button" className="platform-account-inline-action" onClick={() => setActiveTab('support')}>View support options</button>}
        </div>
      </section>;
    }
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
                <input type="email" value={profileForm.email} readOnly />
              </label>
              <label>
                <span>Phone number</span>
                <input type="tel" value={profileForm.phone} onChange={(event) => setProfileForm((current) => ({ ...current, phone: event.target.value }))} placeholder="+250 7xx xxx xxx" />
              </label>
              <label>
                <span>Location</span>
                <input type="text" value={profileForm.location} onChange={(event) => setProfileForm((current) => ({ ...current, location: event.target.value }))} placeholder="Kigali, Rwanda" />
              </label>
              <label className="platform-account-field-wide">
                <span>Street address</span>
                <input type="text" value={profileForm.streetAddress} onChange={(event) => setProfileForm((current) => ({ ...current, streetAddress: event.target.value }))} placeholder="Street, house or building" />
              </label>
              <label>
                <span>City</span>
                <input type="text" value={profileForm.city} onChange={(event) => setProfileForm((current) => ({ ...current, city: event.target.value }))} placeholder="City or town" />
              </label>
              <label>
                <span>State / Province</span>
                <input type="text" value={profileForm.region} onChange={(event) => setProfileForm((current) => ({ ...current, region: event.target.value }))} placeholder="Region" />
              </label>
              <label>
                <span>Postal code</span>
                <input type="text" value={profileForm.postalCode} onChange={(event) => setProfileForm((current) => ({ ...current, postalCode: event.target.value }))} placeholder="Postal code" />
              </label>
              <label>
                <span>Country</span>
                <input type="text" value={profileForm.country} onChange={(event) => setProfileForm((current) => ({ ...current, country: event.target.value }))} placeholder="Country" />
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
          <p className="platform-account-intro">Change your password using your current password. For other sensitive account changes, FolioSpace verifies ownership through your registered email.</p>
          <form className="platform-account-form" onSubmit={handlePasswordSubmit}>
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
          </form>
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
              <button type="button" disabled={selectedPlan === plan.id} onClick={() => handlePlanSelection(plan.id)}>{selectedPlan === plan.id ? 'Current plan' : 'Contact support to change'}</button>
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
          <div className="platform-account-publish-settings">
            <div><p className="platform-account-section-label">Published portfolio</p><h3>Manage public content and links</h3><p>Use the portfolio editor to update the content, links, and sections visitors see on your public page.</p></div>
            <a className="platform-account-inline-action" href="/platform/portfolio">Open portfolio editor</a>
            {portfolioSummary.length > 0 && <ul>{portfolioSummary.map((portfolio) => <li key={portfolio.id}><span>{portfolio.title || portfolio.slug}</span><a href={`/u/${encodeURIComponent(portfolio.slug)}`} target="_blank" rel="noreferrer">View public page</a></li>)}</ul>}
            {!portfolioSummary.length && <small>You have not created a portfolio space yet.</small>}
          </div>
        </section>;
      case 'chat':
        return <section id="chat" className="platform-account-panel">
          <div className="platform-account-panel-header"><div><p className="platform-account-section-label">General FolioSpace chat</p><h2>FolioSpace chat</h2></div></div>
          <p className="platform-account-intro">Send a message to the platform team. Replies will appear here in your account.</p>
          <div className="platform-customer-chat-history" aria-live="polite">
            {loadingWorkspace && <p>Loading conversation…</p>}
            {!loadingWorkspace && chatMessages.length === 0 && <p>No messages yet. Send a note to start the conversation.</p>}
            {chatMessages.map((message) => <article key={message.id} className={`platform-customer-chat-message is-${message.senderRole}`}><strong>{message.senderRole === 'customer' ? 'You' : 'FolioSpace support'}</strong><p>{message.body}</p><time>{new Date(message.createdAt).toLocaleString()}</time></article>)}
          </div>
          <form className="platform-customer-chat-compose" onSubmit={sendCustomerChat}><label className="sr-only" htmlFor="customer-chat-message">Message</label><textarea id="customer-chat-message" maxLength={3000} required value={chatDraft} onChange={(event) => setChatDraft(event.target.value)} placeholder="Write a message to the FolioSpace team" /><button className="primary" disabled={sendingChat || !chatDraft.trim()}>{sendingChat ? 'Sending…' : 'Send message'}</button></form>
        </section>;
      case 'support-chat':
        return <CustomerSupportChat user={user} />;
      case 'gallery':
        return <section id="gallery" className="platform-account-panel">
          <div className="platform-account-panel-header"><div><p className="platform-account-section-label">Private files</p><h2>Your gallery</h2></div></div>
          <p className="platform-account-intro">Upload images and PDFs here for your portfolio work. Files stay private until you add them to a published portfolio.</p>
          <label className="platform-gallery-upload"><i className="fa-solid fa-cloud-arrow-up" aria-hidden="true" /><span>Choose an image or PDF (up to 20 MB)</span><input type="file" accept="image/jpeg,image/png,image/gif,image/webp,application/pdf" onChange={uploadGalleryFile} /></label>
          {loadingWorkspace && <p>Loading your files…</p>}
          <div className="platform-gallery-grid">{galleryFiles.map((file) => <article key={file.id} className="platform-gallery-card">
            {file.mimeType.startsWith('image/') ? <a href={`/api/customer-workspace/gallery/${encodeURIComponent(file.id)}`} target="_blank" rel="noreferrer"><img src={`/api/customer-workspace/gallery/${encodeURIComponent(file.id)}`} alt={file.name} /></a> : <a className="platform-gallery-pdf" href={`/api/customer-workspace/gallery/${encodeURIComponent(file.id)}`} target="_blank" rel="noreferrer"><i className="fa-solid fa-file-pdf" /> PDF</a>}
            <div><strong title={file.name}>{file.name}</strong><small>{(file.size / 1024 / 1024).toFixed(2)} MB</small><button type="button" onClick={() => deleteGalleryFile(file.id)}>Remove</button></div>
          </article>)}</div>
          {!loadingWorkspace && galleryFiles.length === 0 && <p>Your gallery is empty.</p>}
        </section>;
      case 'support':
        return <section id="support" className="platform-account-panel">
          <div className="platform-account-panel-header">
            <div>
              <p className="platform-account-section-label">Support</p>
              <h2>Need help?</h2>
            </div>
          </div>
          <p className="platform-account-intro">Review your support request activity and continue an enabled support conversation. Only requests actually submitted to support are included here.</p>
          <section className="platform-account-support-history" aria-label="Support requests and activity">
            <div className="platform-account-support-stats" aria-label="Support request totals">
              <article><span>Total requests</span><strong>{supportRequestCounts.total}</strong></article>
              <article><span>Open</span><strong>{supportRequestCounts.open}</strong></article>
              <article><span>Resolved</span><strong>{supportRequestCounts.resolved}</strong></article>
            </div>
            <div className="platform-account-support-history-heading">
              <h3>Your support requests</h3>
              <span>{loadingSupportRequests ? 'Refreshing…' : `${supportRequests.length} ${supportRequests.length === 1 ? 'request' : 'requests'}`}</span>
            </div>
            <div className="platform-account-support-table-scroll" role="region" aria-label="Scrollable support request history" tabIndex="0">
              <table className="platform-account-support-table">
                <thead><tr><th>Request</th><th>Type</th><th>Description</th><th>Status</th><th>Submitted</th><th>Latest response</th></tr></thead>
                <tbody>
                  {supportRequests.map((request) => {
                    const latestResponse = request.responses?.[request.responses.length - 1];
                    return <tr key={request.id}>
                      <td><strong>#{request.id}</strong></td>
                      <td className="platform-account-support-category">{String(request.category || '').replace(/^platform_/, '').replaceAll('_', ' ')}</td>
                      <td><ExpandableCell className="platform-account-support-description">{request.message}</ExpandableCell></td>
                      <td><span className={`platform-account-support-status is-${request.status}`}>{request.status === 'resolved' ? 'Resolved' : 'Open'}</span></td>
                      <td><time dateTime={request.createdAt}>{new Date(request.createdAt).toLocaleDateString()}</time></td>
                      <td>{latestResponse ? <div className="platform-account-support-reply"><ExpandableCell className="platform-account-support-description">{latestResponse.body}</ExpandableCell><small>{latestResponse.responderName} · {new Date(latestResponse.sentAt).toLocaleDateString()}</small></div> : <span className="platform-account-support-awaiting">Awaiting a reply</span>}</td>
                    </tr>;
                  })}
                  {!loadingSupportRequests && supportRequests.length === 0 && <tr><td className="platform-account-support-empty" colSpan="6">You have not submitted any support requests yet.</td></tr>}
                  {loadingSupportRequests && supportRequests.length === 0 && <tr><td className="platform-account-support-empty" colSpan="6">Loading your requests…</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
          <div className="platform-account-support-actions">
            <div className="platform-account-support-card">
              <i className="fa-solid fa-message" aria-hidden="true" />
              <strong>Ask support</strong>
              <span>{allowedTabs.includes('support-chat') ? 'Open a dedicated Request room and chat with the FolioSpace support team.' : 'Request chat is not currently included in your subscription plan.'}</span>
              {allowedTabs.includes('support-chat')
                ? <a className="platform-account-inline-action is-secondary" href="/platform/account/support-chat">Open Request</a>
                : <span className="platform-account-support-locked">Ask the platform owner about Request chat access.</span>}
            </div>
            <div className="platform-account-support-card">
              <i className="fa-solid fa-circle-question" aria-hidden="true" />
              <strong>Knowledge base</strong>
              <span>Browse setup guides and account help topics.</span>
              <a className="platform-account-inline-action is-secondary" href="/platform/help">Open help centre</a>
            </div>
          </div>
        </section>;
      case 'overview':
      default:
        return <section id="overview" className="platform-account-panel">
          <div className="platform-account-panel-header">
            <div>
              <p className="platform-account-section-label">Overview</p>
              <h2>
                <span className="platform-account-greeting-prefix">{greeting.prefix}</span>
                <span className="platform-account-greeting-name">{greeting.name}</span>
              </h2>
            </div>
            <span className="platform-account-plan-badge">{activePlan.name} plan</span>
          </div>
          <p className="platform-account-intro">Welcome back, {user?.displayName || 'there'}. Here is a clear snapshot of your account, portfolio activity, and the next step for building your professional presence.</p>
          <div className="platform-account-overview-layout">
            <div className="platform-account-overview-main">
              <div className="platform-account-summary-grid">
                <div className="platform-account-stat-card">
                  <span>Current plan</span>
                  <strong>{activePlan.name}</strong>
                  <small>{activePlan.price}</small>
                </div>
                <div className="platform-account-stat-card">
                  <span>Portfolio status</span>
                  <strong>{publishedPortfolios.length} published · {draftPortfolios.length} draft{draftPortfolios.length === 1 ? '' : 's'}</strong>
                  <small>{portfolioSummary.length ? `${portfolioSummary.length} portfolio space${portfolioSummary.length === 1 ? '' : 's'} in your account` : 'Your first portfolio is ready to be created'}</small>
                </div>
                <div className="platform-account-stat-card">
                  <span>Professional profile</span>
                  <strong>{profileForm.role || 'Add your role'}</strong>
                  <small>{profileForm.location || 'Add a location to complete your profile'}</small>
                </div>
              </div>
              <section className="platform-account-next-step" aria-labelledby="account-next-step-title">
                <div className="platform-account-next-step-icon" aria-hidden="true"><i className="fa-solid fa-arrow-trend-up" /></div>
                <div className="platform-account-next-step-copy">
                  <p className="platform-account-section-label">Your next step</p>
                  <h3 id="account-next-step-title">{nextStep.title}</h3>
                  <p>{nextStep.description}</p>
                </div>
                <a className="platform-account-inline-action" href={nextStep.href}>{nextStep.action}</a>
              </section>
              <section className="platform-account-journey" aria-labelledby="account-journey-title">
                <div className="platform-account-overview-subheading">
                  <div>
                    <p className="platform-account-section-label">Make the most of your account</p>
                    <h3 id="account-journey-title">How your FolioSpace works</h3>
                  </div>
                </div>
                <p className="platform-account-journey-intro">Once your plan is active, use this account to build your professional presence, manage what visitors see, and keep track of your subscription.</p>
                <ol className="platform-account-journey-steps">
                  <li>
                    <span className="platform-account-journey-number">01</span>
                    <div>
                      <h4>Complete your profile</h4>
                      <p>Add your role, location, contact details, and a short bio. Save your changes so your portfolio presents an accurate, up-to-date introduction.</p>
                    </div>
                  </li>
                  <li>
                    <span className="platform-account-journey-number">02</span>
                    <div>
                      <h4>Build your portfolio</h4>
                      <p>Open the portfolio editor to add your work and organize your content. Review and save your changes before publishing.</p>
                    </div>
                  </li>
                  <li>
                    <span className="platform-account-journey-number">03</span>
                    <div>
                      <h4>Publish and share</h4>
                      <p>When your page is ready, publish it and use Public view to check what visitors will see. Share your public portfolio link with clients, employers, and collaborators.</p>
                    </div>
                  </li>
                  <li>
                    <span className="platform-account-journey-number">04</span>
                    <div>
                      <h4>Manage your plan and tools</h4>
                      <p>Check Subscriptions for your plan and renewal information, and open Privileges to see what it includes. Your available tools, such as Gallery or support chat, depend on your plan.</p>
                    </div>
                  </li>
                </ol>
              </section>
              {portfolioSummary.length > 0 && (
                <section className="platform-account-overview-portfolios" aria-labelledby="account-portfolios-title">
                  <div className="platform-account-overview-subheading">
                    <div>
                      <p className="platform-account-section-label">Your work</p>
                      <h3 id="account-portfolios-title">Portfolio spaces</h3>
                    </div>
                    <a href="/platform/portfolio">Manage all</a>
                  </div>
                  <ul>
                    {portfolioSummary.slice(0, 3).map((portfolio) => {
                      const hero = portfolio.sections?.find((section) => section.type === 'hero');
                      const title = portfolio.title || hero?.data?.title || portfolio.slug || 'Untitled portfolio';
                      const isPublished = portfolio.status === 'published';
                      return <li key={portfolio.id}>
                        <span className="platform-account-overview-portfolio-icon" aria-hidden="true"><i className={`fa-solid ${isPublished ? 'fa-arrow-up-right-from-square' : 'fa-briefcase'}`} /></span>
                        <span className="platform-account-overview-portfolio-name">{title}</span>
                        <span className={`platform-account-overview-portfolio-status${isPublished ? ' is-published' : ''}`}>{isPublished ? 'Published' : 'Draft'}</span>
                        {isPublished && portfolio.slug && <a href={`/u/${encodeURIComponent(portfolio.slug)}`} target="_blank" rel="noreferrer">View</a>}
                      </li>;
                    })}
                  </ul>
                  {portfolioSummary.length > 3 && <p className="platform-account-overview-more">And {portfolioSummary.length - 3} more portfolio space{portfolioSummary.length - 3 === 1 ? '' : 's'}.</p>}
                </section>
              )}
              <div className="platform-account-overview-actions">
                <a className="platform-account-inline-action" href="/platform/dashboard">Open dashboard</a>
                <a className="platform-account-inline-action is-secondary" href="/platform/portfolio">Continue building your portfolio</a>
              </div>
            </div>
            <aside className="platform-account-overview-side">
              <div className={`platform-account-progress-card${subscriptionSummary.isWarning ? ' is-warning' : ''}`}>
                <div
                  className="platform-account-progress-ring"
                  style={{
                    background: `conic-gradient(${subscriptionSummary.isWarning ? '#ef4444' : '#5ea9f7'} ${Math.min(subscriptionSummary.percent, 100)}%, #e3edf7 0)`
                  }}
                >
                  <div className="platform-account-progress-ring-inner">
                    <strong className={subscriptionSummary.isWarning ? 'is-warning' : ''}>{subscriptionSummary.daysLeft}</strong>
                    <span>days left</span>
                  </div>
                </div>
                <div className="platform-account-progress-copy">
                  <span>Subscription status</span>
                  <strong>{selectedPlan === 'free' ? 'Free access' : `${activePlan.name} active`}</strong>
                  <small>{selectedPlan === 'free' ? 'Stay on the free plan and upgrade when ready.' : `Renewal window: ${subscriptionSummary.daysLeft} day${subscriptionSummary.daysLeft === 1 ? '' : 's'} remaining`}</small>
                </div>
                <button type="button" className="platform-account-renew-button" onClick={() => setActiveTab('subscription')}>Subscription Renewal</button>
              </div>
              <div className="platform-account-mini-summary">
                <div>
                  <span>Published page</span>
                  <strong>{publishedPortfolios.length ? `${publishedPortfolios.length} live` : portfolioSummary.length ? 'Not published' : 'Not created'}</strong>
                </div>
                <div>
                  <span>Portfolio spaces</span>
                  <strong>{portfolioSummary.length}</strong>
                </div>
                <div>
                  <span>Plan tools</span>
                  <strong>{activePlan.privileges.length} included</strong>
                </div>
              </div>
            </aside>
          </div>
        </section>;
    }
  };

  const topbarTitle = visibleNavItems.find((item) => item.id === activeTab)?.label || 'Overview';

  return <main className={`platform-account-page${sidebarCollapsed ? ' is-sidebar-collapsed' : ''} is-${themeMode}`} style={brightness !== 100 ? { '--page-brightness': brightness / 100 } : undefined}>
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
        <a className="platform-account-dashboard-link" href={publicPortfolioUrl} target="_blank" rel="noreferrer">Public view</a>
      </div>
    </header>
    <div className="platform-account-body">
    <aside className={`platform-account-sidebar${sidebarCollapsed ? ' is-collapsed' : ''}`} aria-label="Account navigation">
      <button
        type="button"
        className="platform-account-sidebar-toggle"
        onClick={() => setSidebarCollapsed((current) => !current)}
        aria-label={sidebarCollapsed ? 'Expand navigation' : 'Collapse navigation'}
        title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <i className={`fa-solid ${sidebarCollapsed ? 'fa-angle-double-right' : 'fa-angle-double-left'}`} aria-hidden="true" />
      </button>
      <div className="platform-account-nav-scroll">
        <nav className="platform-account-nav">
          {visibleNavItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={activeTab === item.id ? 'is-active' : ''}
              onClick={() => setActiveTab(item.id)}
              aria-label={item.label}
              aria-pressed={activeTab === item.id}
              title={item.label}
            >
              <i className={`fa-solid ${item.icon}`} aria-hidden="true" />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </button>
          ))}
        </nav>
        <nav className="platform-account-nav platform-account-nav-links" aria-label="More pages">
          {sidebarLinks.map((item) => (
            <a key={item.label} className="platform-account-nav-link" href={item.href} title={item.label} aria-label={item.label}>
              <i className={`fa-solid ${item.icon}`} aria-hidden="true" />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </a>
          ))}
        </nav>
      </div>
      <div className="platform-account-logout-wrap">
        <div className="platform-account-user-card" title={`${user?.displayName || 'Your account'} · ${user?.email || 'demo@foliospace.com'}`}>
          <div className="platform-account-avatar" aria-hidden="true">
            {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
          </div>
          {!sidebarCollapsed && (
            <div className="platform-account-user-meta">
              <strong>{user?.displayName || 'Your account'}</strong>
              <span>{user?.email || 'demo@foliospace.com'}</span>
            </div>
          )}
        </div>
        <button
          type="button"
          className="platform-account-logout-trigger"
          onClick={() => setShowLogoutDialog((current) => !current)}
          aria-label="Logout"
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
      </div>
      <footer className="platform-account-page-footer">
        <div className="platform-account-page-footer-copy">
          <span>© 2026 FolioSpace. All rights reserved.</span>
        </div>
      </footer>
    </div>
    </div>
    <button type="button" className="platform-account-footer-link-button" onClick={() => window.open('https://my-digital-status.onrender.com/', '_blank', 'noopener,noreferrer')}>
      Powered By <span>KadeTech</span>
    </button>
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
