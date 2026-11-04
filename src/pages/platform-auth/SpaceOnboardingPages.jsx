import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import WhatsAppContact from '../../components/WhatsAppContact.jsx';
import WebsiteLogo from '../../components/WebsiteLogo.jsx';
import { apiFetch } from '../../services/api.js';
import {
  formatSpacePrice,
  getSpacePlan,
  readSpaceOnboarding,
  saveSpaceOnboarding,
  setSkipSubscriptionGate,
  shouldBypassSubscriptionGate,
  USD_RWF_ESTIMATE
} from '../../services/spacePlans.js';

function CheckoutHeader({ step }) {
  return <>
    <header className="space-checkout-header">
      <WebsiteLogo className="space-checkout-brand" />
      <a href="/platform/login">Save and continue later</a>
    </header>
    <ol className="space-checkout-steps" aria-label="Space setup progress">
      <li>1. Choose template</li>
      <li>2. Create account</li>
      <li aria-current={step === 'payment' ? 'step' : undefined}>3. Subscription</li>
      <li aria-current={step === 'setup' ? 'step' : undefined}>4. Your space</li>
    </ol>
  </>;
}

function CheckoutMessage({ children, error = false }) {
  return children ? <p className={`space-payment-note${error ? ' is-error' : ''}`} role="status" aria-live="polite">{children}</p> : null;
}

export function PlatformSubscribePage() {
  const navigate = useNavigate();
  const [onboarding] = useState(() => readSpaceOnboarding());
  const plan = getSpacePlan(onboarding?.templateId);
  const [currency, setCurrency] = useState(onboarding?.currency || 'RWF');
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const skipPayment = shouldBypassSubscriptionGate();

  useEffect(() => {
    if (onboarding?.stage === 'complete') {
      navigate('/platform/dashboard', { replace: true });
    } else if (!onboarding?.email) {
      navigate('/platform/signup?template=standard', { replace: true });
    } else if (skipPayment || plan.priceRwf === 0 || onboarding.stage === 'space-setup') {
      navigate('/platform/space-setup', { replace: true });
    }
  }, [navigate, onboarding, plan.priceRwf, skipPayment]);

  function saveProgress() {
    try {
      saveSpaceOnboarding({ currency, stage: 'payment', paymentStatus: 'pending' });
      setIsError(false);
      setMessage('Your selected plan is saved. Sign in later and you will return to this subscription step.');
      return true;
    } catch (error) {
      setIsError(true);
      setMessage(error.message);
      return false;
    }
  }

  function savePlan() {
    if (saveProgress()) setMessage('Your plan and currency are saved. Payment will be available when the payment provider is connected.');
  }

  function continueWithoutPayment() {
    setSkipSubscriptionGate(true);
    saveSpaceOnboarding({ stage: 'space-setup', paymentStatus: 'bypassed' });
    navigate('/platform/space-setup', { replace: true });
  }

  if (!onboarding?.email || plan.priceRwf === 0 || onboarding.stage === 'complete') return null;

  return <main className="space-checkout-page">
    <div className="space-checkout-shell">
      <CheckoutHeader step="payment" />
      <section className="space-checkout-card" aria-labelledby="subscription-title">
        <p className="platform-auth-eyebrow">YOUR SPACE SETUP</p>
        <h1 id="subscription-title">Review your subscription plan</h1>
        <p>Your selected plan is saved here. Payment is not connected yet, so paid subscriptions cannot be activated until a payment provider is added.</p>
        <div className="space-order-summary">
          <div>
            <strong>{plan.name} · {plan.id === 'standard' ? 'Studio' : 'Executive'} template</strong>
            <span>Subscription period: every 6 months</span>
          </div>
          <strong className="space-order-price">{formatSpacePrice(plan, currency)}<small> / 6 months</small></strong>
        </div>
        <ul className="pl-template-features">
          {plan.features.map((feature) => <li key={feature}><span aria-hidden="true">✓</span>{feature}</li>)}
        </ul>
        <label className="space-currency-label" htmlFor="space-currency">Pay in</label>
        <select id="space-currency" value={currency} onChange={(event) => {
          setCurrency(event.target.value);
          setMessage('');
          try { saveSpaceOnboarding({ currency: event.target.value }); } catch (error) { setIsError(true); setMessage(error.message); }
        }}>
          <option value="RWF">Rwandan francs (RWF)</option>
          <option value="USD">US dollars (USD)</option>
        </select>
        {currency === 'USD' && <p className="space-currency-disclaimer">Estimated at {USD_RWF_ESTIMATE.toLocaleString('en-US')} RWF per USD. The payment provider will confirm the exchange rate and final amount.</p>}
        <CheckoutMessage error={isError}>{message || 'Online payment is not connected yet. Your account and plan stay saved in this browser; no payment will be taken.'}</CheckoutMessage>
        <div className="space-checkout-actions">
          <button type="button" className="primary" onClick={savePlan}>Save plan</button>
          <button type="button" onClick={continueWithoutPayment}>Skip payment for now</button>
          <button type="button" onClick={() => navigate('/platform/login?resume=1')}>Save and continue later</button>
          <a href="/platform/templates">Change template</a>
        </div>
      </section>
    </div>
  </main>;
}

export function PlatformSpaceSetupPage() {
  const navigate = useNavigate();
  const createRequestActive = useRef(false);
  const [onboarding] = useState(() => readSpaceOnboarding());
  const plan = getSpacePlan(onboarding?.templateId);
  const [title, setTitle] = useState(onboarding?.displayName ? `${onboarding.displayName}'s Portfolio` : '');
  const [slug, setSlug] = useState((onboarding?.displayName || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const publicUrl = useMemo(() => slug.trim() ? `${window.location.origin}/u/${slug.trim()}` : '', [slug]);

  const skipPayment = shouldBypassSubscriptionGate();

  useEffect(() => {
    if (onboarding?.stage === 'complete') {
      navigate('/platform/dashboard', { replace: true });
    } else if (!onboarding?.email) {
      navigate('/platform/signup?template=free', { replace: true });
    } else if (plan.priceRwf > 0 && onboarding.stage !== 'space-setup' && !skipPayment) {
      navigate('/platform/subscribe', { replace: true });
    }
  }, [navigate, onboarding, plan.priceRwf, skipPayment]);

  async function createSpace(event) {
    event.preventDefault();
    if (createRequestActive.current) return;
    createRequestActive.current = true;
    setSaving(true);
    setMessage('');
    setIsError(false);
    try {
      const response = await apiFetch('/portfolios', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, title, templateId: plan.id })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Could not create your portfolio space.');
      saveSpaceOnboarding({
        stage: 'complete',
        paymentStatus: plan.priceRwf === 0 ? 'not-required' : 'paid',
        portfolioId: result.portfolio.id,
        slug: result.portfolio.slug,
        title
      });
      navigate(`/platform/portfolio?id=${result.portfolio.id}`);
    } catch (error) {
      setIsError(true);
      setMessage(error.message || 'Could not create your portfolio space.');
    } finally {
      createRequestActive.current = false;
      setSaving(false);
    }
  }

  if (!onboarding?.email || (plan.priceRwf > 0 && onboarding.stage !== 'space-setup') || onboarding.stage === 'complete') return null;

  return <>
  <main className="space-checkout-page" aria-busy={saving}>
    <div className="space-checkout-shell">
      <CheckoutHeader step="setup" />
      <section className="space-checkout-card" aria-labelledby="space-setup-title">
        <p className="platform-auth-eyebrow">YOUR SPACE SETUP</p>
        <h1 id="space-setup-title">Claim your FolioSpace address</h1>
        <p>Your {plan.name} plan is selected. Choose the title and public address people will use to find your portfolio.</p>
        <form onSubmit={createSpace}>
          <label htmlFor="space-title">Portfolio title</label>
          <input id="space-title" maxLength={120} required value={title} onChange={(event) => setTitle(event.target.value)} />
          <label htmlFor="space-slug">Your FolioSpace address</label>
          <input id="space-slug" minLength={3} maxLength={48} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required value={slug} onChange={(event) => setSlug(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} />
          <p className="space-url-preview">Your public address: <strong>{publicUrl || 'Choose a name above'}</strong></p>
          <CheckoutMessage error={isError}>{message}</CheckoutMessage>
          <button className="primary" type="submit" disabled={saving}>{saving ? 'Creating your space…' : 'Create my space'}</button>
        </form>
      </section>
    </div>
  </main>
  <WhatsAppContact />
  </>;
}
