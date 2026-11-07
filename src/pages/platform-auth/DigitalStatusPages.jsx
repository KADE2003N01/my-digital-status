import React, { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../services/api.js';
import WebsiteLogo from '../../components/WebsiteLogo.jsx';
import { readSpaceOnboarding, shouldBypassSubscriptionGate, getSpacePlan, planAllows } from '../../services/spacePlans.js';
import UpgradeModal from '../../components/UpgradeModal.jsx';
import './DigitalStatusPages.css';

async function requestJson(path, options = {}) {
  const response = await apiFetch(path, {
    credentials: 'include',
    ...options,
    headers: {
      ...(typeof options.body === 'string' ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers
    }
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'The request could not be completed.');
  return result;
}

function PageFrame({ title, children }) {
  return <main className="digital-status-page">
    <header className="digital-status-header">
      <WebsiteLogo className="digital-status-brand" />
      <nav aria-label="Account navigation">
        <a href="/platform/dashboard">Dashboard</a>
        <a href="/platform/account/overview">Account</a>
      </nav>
    </header>
    <section className="digital-status-content">
      <p className="digital-status-eyebrow">YOUR CAREER, IN ONE PLACE</p>
      <h1>{title}</h1>
      {children}
    </section>
  </main>;
}

function Status({ message, error = false }) {
  return message ? <p className={`digital-status-message${error ? ' is-error' : ''}`} role="status">{message}</p> : null;
}

export function PlatformHelpPage() {
  return <PageFrame title="FAQs & Documentation">
    <p className="digital-status-intro">Quick answers and simple steps for setting up and managing your FolioSpace.</p>
    <div className="digital-status-grid platform-help-grid">
      <section className="digital-status-card platform-help-card" aria-labelledby="platform-faq-title">
        <h2 id="platform-faq-title">Frequently asked questions</h2>
        <details><summary>How do I create my portfolio?</summary><p>Choose a template, create your account, then follow the steps to set up your public portfolio address and profile.</p></details>
        <details><summary>Can I choose a different template?</summary><p>Compare the available options on the <a href="/platform/templates">templates page</a> before creating your account.</p></details>
        <details><summary>Where can I edit or publish my portfolio?</summary><p>Sign in and open your dashboard. Choose a portfolio to edit, save your changes, and publish it when you are ready.</p></details>
        <details><summary>How do I share my portfolio?</summary><p>After publishing, use its public address from your dashboard to share it with employers, clients, or collaborators.</p></details>
        <details><summary>What if I forget my password?</summary><p>Use <a href="/platform/forgot-password">Forgot password</a> on the sign-in page and follow the secure link sent to your email.</p></details>
        <details><summary>What does a private section do?</summary><p>Private sections are shown only after a visitor verifies their email address for access.</p></details>
      </section>
      <section className="digital-status-card platform-help-card" aria-labelledby="platform-docs-title">
        <h2 id="platform-docs-title">Getting started guide</h2>
        <ol>
          <li><a href="/platform/templates">Choose a portfolio template</a> that suits your needs.</li>
          <li><a href="/platform/signup?template=standard">Create your account</a> with an email address you can access.</li>
          <li>Set your portfolio title, public address, and profile details.</li>
          <li>Review your content, save it, then publish when you are ready to share.</li>
        </ol>
        <p>Already have an account? <a href="/platform/login">Sign in to manage your space</a>.</p>
        <p>Need a hand? <a href="https://wa.me/250788950833" target="_blank" rel="noreferrer">Chat with me on WhatsApp</a>.</p>
      </section>
    </div>
  </PageFrame>;
}

export function PlatformSystemIssuesPage() {
  const [form, setForm] = useState({ name: '', email: '', category: 'platform_sign_in', message: '' });
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    let active = true;
    requestJson('/platform-auth/me')
      .then(({ user }) => {
        if (active && user) {
          setForm((current) => ({
            ...current,
            name: current.name || user.displayName || '',
            email: current.email || user.email || ''
          }));
        }
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  async function submit(event) {
    event.preventDefault();
    setSending(true);
    setFeedback('');
    setIsError(false);
    try {
      const result = await requestJson('/support-requests', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          name: form.name.trim(),
          email: form.email.trim(),
          message: form.message.trim()
        })
      });
      setFeedback(`${result.message}${result.requestId ? ` Reference #${result.requestId}.` : ''}`);
      setForm((current) => ({ ...current, message: '' }));
    } catch (error) {
      setFeedback(error.message || 'Your report could not be sent. Please try again.');
      setIsError(true);
    } finally {
      setSending(false);
    }
  }

  return <PageFrame title="System Based Issues">
    <p className="digital-status-intro">Tell us what went wrong while using FolioSpace. Your report will be sent to the support team, who can follow up using your email.</p>
    <section className="digital-status-card platform-issue-card" aria-labelledby="platform-issue-title">
      <h2 id="platform-issue-title">Describe the issue</h2>
      <form className="digital-status-form platform-issue-form" onSubmit={submit}>
        <label htmlFor="platform-issue-category">What do you need help with?</label>
        <select id="platform-issue-category" required value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}>
          <option value="platform_sign_in">I cannot sign in</option>
          <option value="platform_signup">I cannot create an account</option>
          <option value="platform_account_access">I lost access to my account</option>
          <option value="platform_inactive_account">My account or space is inactive</option>
          <option value="platform_subscription">Payment or subscription issue</option>
          <option value="platform_space_setup">I cannot set up my space</option>
          <option value="platform_other">Another system issue</option>
        </select>
        <label htmlFor="platform-issue-name">Your name</label>
        <input id="platform-issue-name" autoComplete="name" maxLength={120} required value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
        <label htmlFor="platform-issue-email">Email address</label>
        <input id="platform-issue-email" type="email" autoComplete="email" maxLength={254} required value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
        <label htmlFor="platform-issue-description">What happened?</label>
        <textarea id="platform-issue-description" rows="6" minLength={10} maxLength={3000} required placeholder="Describe what you were doing, what happened, and any message you saw." value={form.message} onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))} />
        <small>Include the steps that led to the issue. Please do not include your password or payment card details.</small>
        {feedback && <Status message={feedback} error={isError} />}
        <button type="submit" disabled={sending}>{sending ? 'Sending report…' : 'Send issue report'}</button>
      </form>
    </section>
    <p className="platform-issue-back"><a href="/platform/help">Read FAQs &amp; Documentation</a></p>
  </PageFrame>;
}

export function PlatformDashboardPage() {
  const [user, setUser] = useState(null);
  const [portfolios, setPortfolios] = useState([]);
  const [planId, setPlanId] = useState('free');
  const [upgradePrompt, setUpgradePrompt] = useState(null);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const localOnboarding = readSpaceOnboarding();
    const skipPayment = shouldBypassSubscriptionGate();
    let active = true;
    Promise.all([
      requestJson('/platform-auth/me'),
      requestJson('/portfolios')
    ]).then(([account, result]) => {
      if (active) {
        const onboarding = account.onboarding || (localOnboarding?.email === account.user.email ? localOnboarding : null);
        if (onboarding?.stage !== 'complete') {
          if (onboarding?.stage === 'subscription' || (onboarding?.stage === 'payment' && !skipPayment)) {
            window.location.replace('/platform/subscribe');
            return;
          }
          if (onboarding?.stage === 'space_setup' || onboarding?.stage === 'space-setup' || (skipPayment && onboarding)) {
            window.location.replace('/platform/space-setup');
            return;
          }
        }
        setUser(account.user);
        setPlanId(account.user.subscriptionPlan || 'free');
        setPortfolios(result.portfolios);
      }
    }).catch((error) => {
      if (active) {
        if (error.message.includes('Authentication required')) {
          window.location.replace('/platform/login?next=/platform/dashboard');
          return;
        }
        setMessage(error.message);
        setIsError(true);
      }
    });
    return () => { active = false; };
  }, []);

  async function createPortfolio(event) {
    event.preventDefault();
    // Pattern B: stop the action and explain before the request is sent.
    const limits = getSpacePlan(planId).limits;
    if (portfolios.length >= limits.maxSpaces) {
      setUpgradePrompt({
        title: `You've reached the ${limits.maxSpaces}-space limit on the ${getSpacePlan(planId).name} plan`,
        feature: planId === 'free' ? 'maxSpaces' : 'priorityPlacement'
      });
      return;
    }
    setSaving(true);
    setMessage('');
    setIsError(false);
    try {
      const result = await requestJson('/portfolios', {
        method: 'POST',
        body: JSON.stringify({ slug, title })
      });
      window.location.assign(`/platform/portfolio?id=${result.portfolio.id}`);
    } catch (error) {
      setMessage(error.message);
      setIsError(true);
    } finally {
      setSaving(false);
    }
  }

  return <PageFrame title={user ? `Welcome, ${user.displayName}` : 'Your portfolio dashboard'}>
    <p className="digital-status-intro">Create and manage your professional portfolio. Your existing portfolio website remains unchanged.</p>
    <Status message={message} error={isError} />
    <div className="digital-status-grid">
      <section className="digital-status-card">
        <h2>Create a portfolio</h2>
        <form className="digital-status-form" onSubmit={createPortfolio}>
          <label htmlFor="portfolio-title">Portfolio title</label>
          <input id="portfolio-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} required />
          <label htmlFor="portfolio-slug">Shareable address</label>
          <div className="digital-status-slug-field">
            <span>/u/</span>
            <input id="portfolio-slug" value={slug} onChange={(event) => setSlug(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} minLength={3} maxLength={48} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required />
          </div>
          <small>Use 3–48 lowercase letters, numbers, and single hyphens.</small>
          <button type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create portfolio'}</button>
          <small>{getSpacePlan(planId).limits.maxSpaces === Infinity
            ? 'Unlimited portfolio spaces on your plan.'
            : `${Math.max(0, getSpacePlan(planId).limits.maxSpaces - portfolios.length)} of ${getSpacePlan(planId).limits.maxSpaces} spaces left on your plan.`}</small>
          <UpgradeModal
            open={Boolean(upgradePrompt)}
            title={upgradePrompt?.title}
            feature={upgradePrompt?.feature}
            onClose={() => setUpgradePrompt(null)}
          />
        </form>
      </section>
      <section className="digital-status-card">
        <h2>Your portfolios</h2>
        {portfolios.length === 0
          ? <p className="digital-status-empty">Your portfolio list will appear here after you create one.</p>
          : <ul className="digital-status-portfolio-list">{portfolios.map((portfolio) => <li key={portfolio.id}>
            <div>
              <strong>{portfolio.sections.find((section) => section.type === 'hero')?.data.title || portfolio.slug}</strong>
              <span>{portfolio.status === 'published' ? 'Published' : 'Draft'} · /u/{portfolio.slug}</span>
            </div>
            <a href={`/platform/portfolio?id=${portfolio.id}`}>Edit</a>
          </li>)}</ul>}
        <a className="digital-status-back-link" href="/platform/account/overview">Manage account</a>
      </section>
    </div>
  </PageFrame>;
}

export function PlatformPortfolioEditorPage() {
  const portfolioId = new URLSearchParams(window.location.search).get('id');
  const [portfolio, setPortfolio] = useState(null);
  const [planId, setPlanId] = useState('free');
  const [upgradePrompt, setUpgradePrompt] = useState(null);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [about, setAbout] = useState('');
  const [skills, setSkills] = useState('');
  const [privateAbout, setPrivateAbout] = useState(false);
  const [privateSkills, setPrivateSkills] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const localOnboarding = readSpaceOnboarding();
    const skipPayment = shouldBypassSubscriptionGate();
    let active = true;
    if (!portfolioId || !/^\d+$/.test(portfolioId)) {
      setMessage('Choose a valid portfolio to edit.');
      setIsError(true);
      return () => { active = false; };
    }
    Promise.all([
      requestJson('/platform-auth/me'),
      requestJson(`/portfolios/${portfolioId}`)
    ]).then(([account, result]) => {
      if (!active) return;
      const onboarding = account.onboarding || (localOnboarding?.email === account.user.email ? localOnboarding : null);
      if (onboarding?.stage !== 'complete') {
        if (onboarding?.stage === 'subscription' || (onboarding?.stage === 'payment' && !skipPayment)) {
          window.location.replace('/platform/subscribe');
          return;
        }
        if (onboarding?.stage === 'space_setup' || onboarding?.stage === 'space-setup' || (skipPayment && onboarding)) {
          window.location.replace('/platform/space-setup');
          return;
        }
      }
      setUser(account.user);
      setPlanId(account.user.subscriptionPlan || 'free');
      const { portfolio: loaded } = result;
      setPortfolio(loaded);
      setSlug(loaded.slug);
      setTitle(loaded.sections.find((section) => section.type === 'hero')?.data.title || '');
      const aboutSection = loaded.sections.find((section) => section.type === 'about');
      setAbout(aboutSection?.data.description || '');
      setPrivateAbout(Boolean(aboutSection?.isPrivate));
      const skillsSection = loaded.sections.find((section) => section.type === 'skills');
      setSkills(Array.isArray(skillsSection?.data.items) ? skillsSection.data.items.join(', ') : '');
      setPrivateSkills(Boolean(skillsSection?.isPrivate));
    }).catch((error) => {
      if (active) {
        setMessage(error.message);
        setIsError(true);
      }
    });
    return () => { active = false; };
  }, [portfolioId]);

  async function savePortfolio(event) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setIsError(false);
    try {
      await requestJson(`/portfolios/${portfolioId}`, {
        method: 'PUT',
        body: JSON.stringify({ slug, title })
      });
      const result = await requestJson(`/portfolios/${portfolioId}/sections`, {
        method: 'PUT',
        body: JSON.stringify({
          sections: [
            { type: 'hero', sortOrder: 0, data: { title } },
            { type: 'about', sortOrder: 1, isPrivate: privateAbout, data: { description: about } },
            { type: 'skills', sortOrder: 2, isPrivate: privateSkills, data: { items: skills.split(',').map((skill) => skill.trim()).filter(Boolean) } }
          ]
        })
      });
      setPortfolio(result.portfolio);
      setMessage('Your changes are saved.');
    } catch (error) {
      setMessage(error.message);
      setIsError(true);
    } finally {
      setSaving(false);
    }
  }

  async function setPublished(published) {
    setMessage('');
    setIsError(false);
    try {
      const result = await requestJson(`/portfolios/${portfolioId}/${published ? 'publish' : 'unpublish'}`, { method: 'PUT', body: '{}' });
      setPortfolio(result.portfolio);
      setMessage(published ? 'Your portfolio is published.' : 'Your portfolio is now a draft.');
    } catch (error) {
      setMessage(error.message);
      setIsError(true);
    }
  }

  const publicUrl = useMemo(() => portfolio ? `/u/${portfolio.slug}` : '', [portfolio]);

  return <PageFrame title="Portfolio editor">
    <p className="digital-status-intro">Save a draft first, then publish when your public sections are ready. Private sections are not returned to public visitors.</p>
    <Status message={message} error={isError} />
    <form className="digital-status-card digital-status-editor" onSubmit={savePortfolio}>
      <label htmlFor="editor-title">Portfolio title</label>
      <input id="editor-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} required />
      <label htmlFor="editor-slug">Shareable address</label>
      <div className="digital-status-slug-field">
        <span>/u/</span>
        <input id="editor-slug" value={slug} onChange={(event) => setSlug(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} minLength={3} maxLength={48} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required />
      </div>
      <label htmlFor="editor-about">About</label>
      <textarea id="editor-about" rows="5" maxLength={4000} value={about} onChange={(event) => setAbout(event.target.value)} />
      <label htmlFor="editor-skills">Skills (separated by commas)</label>
      <input id="editor-skills" value={skills} onChange={(event) => setSkills(event.target.value)} />
      {planAllows(planId, 'privateSections') ? <>
        <label className="digital-status-checkbox"><input type="checkbox" checked={privateAbout} onChange={(event) => setPrivateAbout(event.target.checked)} /> Show About only after recruiter email verification</label>
        <label className="digital-status-checkbox"><input type="checkbox" checked={privateSkills} onChange={(event) => setPrivateSkills(event.target.checked)} /> Show Skills only after recruiter email verification</label>
      </> : <button type="button" className="digital-status-secondary" onClick={() => setUpgradePrompt({
        title: 'Private sections need the Standard plan',
        feature: 'privateSections'
      })}>
        <i className="fa-solid fa-lock" aria-hidden="true" /> Private sections — upgrade to unlock
      </button>}
      <div className="digital-status-actions">
        <button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
        <button type="button" className="digital-status-secondary" disabled={!portfolio} onClick={() => setPublished(portfolio?.status !== 'published')}>
          {portfolio?.status === 'published' ? 'Unpublish' : 'Publish'}
        </button>
      </div>
    </form>
    {portfolio?.status === 'published' && <p className="digital-status-public-link">Public page: <a href={publicUrl} target="_blank" rel="noreferrer">{window.location.origin}{publicUrl}</a></p>}
    <a className="digital-status-back-link" href="/platform/dashboard">Back to dashboard</a>
    <UpgradeModal
      open={Boolean(upgradePrompt)}
      title={upgradePrompt?.title}
      feature={upgradePrompt?.feature}
      onClose={() => setUpgradePrompt(null)}
    />
  </PageFrame>;
}

export function PublicPortfolioPage() {
  const slug = window.location.pathname.match(/^\/u\/([^/]+)\/?$/)?.[1] || new URLSearchParams(window.location.search).get('slug') || '';
  const [portfolio, setPortfolio] = useState(null);
  const [privatePortfolio, setPrivatePortfolio] = useState(null);
  const [message, setMessage] = useState('');
  const [messageError, setMessageError] = useState(false);
  const [accessStage, setAccessStage] = useState('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [contact, setContact] = useState({ name: '', position: '', phone: '', reason: '' });
  const [consent, setConsent] = useState(false);

  useEffect(() => {
    let active = true;
    if (!slug) {
      setMessage('Portfolio not found.');
      return () => { active = false; };
    }
    requestJson(`/public/${encodeURIComponent(slug)}`, { credentials: 'omit' })
      .then((result) => { if (active) setPortfolio(result.portfolio); })
      .catch((error) => {
        if (active) {
          setMessage(error.message);
          setMessageError(true);
        }
      });
    return () => { active = false; };
  }, [slug]);

  async function requestCode(event) {
    event.preventDefault();
    setMessage('');
    setMessageError(false);
    try {
      const result = await requestJson(`/public/${encodeURIComponent(slug)}/recruiter/request-otp`, {
        method: 'POST',
        body: JSON.stringify({ email })
      });
      setMessage(result.message);
      setAccessStage('code');
    } catch (error) {
      setMessage(error.message);
      setMessageError(true);
    }
  }

  async function verifyCode(event) {
    event.preventDefault();
    setMessage('');
    setMessageError(false);
    try {
      const result = await requestJson(`/public/${encodeURIComponent(slug)}/recruiter/verify-otp`, {
        method: 'POST',
        body: JSON.stringify({ email, code })
      });
      const full = await requestJson(`/public/${encodeURIComponent(slug)}/full`);
      setPrivatePortfolio(full.portfolio);
      setMessage(result.message);
      setAccessStage('verified');
    } catch (error) {
      setMessage(error.message);
      setMessageError(true);
    }
  }

  async function submitContact(event) {
    event.preventDefault();
    setMessage('');
    setMessageError(false);
    try {
      const result = await requestJson(`/public/${encodeURIComponent(slug)}/recruiter/contact`, {
        method: 'POST',
        body: JSON.stringify({ ...contact, email, consent })
      });
      setMessage(`${result.message} A CV download has not been configured for this portfolio yet.`);
      setAccessStage('complete');
    } catch (error) {
      setMessage(error.message);
      setMessageError(true);
    }
  }

  if (message && !portfolio) return <main className="digital-status-page"><Status message={message} error /><a className="digital-status-back-link" href="/">FolioSpace</a></main>;
  if (!portfolio) return <main className="digital-status-page"><p role="status">Loading portfolio…</p></main>;

  const sections = privatePortfolio?.sections || portfolio.sections;
  const section = (type) => sections.find((item) => item.type === type)?.data;
  const hero = section('hero');
  const about = section('about');
  const skills = section('skills');
  return <main className="public-portfolio-page">
    <header className="public-portfolio-header"><WebsiteLogo className="public-portfolio-brand" /></header>
    <article className="public-portfolio-content">
      <section className="public-portfolio-hero"><p>PROFESSIONAL PORTFOLIO</p><h1>{hero?.title || portfolio.slug}</h1></section>
      {about?.description && <section><h2>About</h2><p>{about.description}</p></section>}
      {Array.isArray(skills?.items) && skills.items.length > 0 && <section><h2>Skills</h2><ul className="public-portfolio-skills">{skills.items.map((skill, index) => <li key={`${skill}-${index}`}>{skill}</li>)}</ul></section>}
      {!privatePortfolio && <section className="digital-status-card">
        <h2>Request private portfolio access</h2>
        <p>Verify your email to view sections the owner has marked private.</p>
        {accessStage === 'email' && <form className="digital-status-form" onSubmit={requestCode}>
          <label htmlFor="recruiter-email">Email address</label>
          <input id="recruiter-email" type="email" autoComplete="email" maxLength={254} required value={email} onChange={(event) => setEmail(event.target.value)} />
          <button type="submit">Email me a verification code</button>
        </form>}
        {accessStage === 'code' && <form className="digital-status-form" onSubmit={verifyCode}>
          <label htmlFor="recruiter-code">6-digit verification code</label>
          <input id="recruiter-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} />
          <button type="submit">Verify and continue</button>
        </form>}
      </section>}
      {privatePortfolio && <section className="digital-status-card">
        <h2>Continue to request the CV</h2>
        {accessStage === 'verified' && <button type="button" onClick={() => setAccessStage('contact')}>Share your details</button>}
        {accessStage === 'contact' && <form className="digital-status-form" onSubmit={submitContact}>
          <label htmlFor="recruiter-name">Full name</label>
          <input id="recruiter-name" required maxLength={120} value={contact.name} onChange={(event) => setContact({ ...contact, name: event.target.value })} />
          <label htmlFor="recruiter-position">Position</label>
          <input id="recruiter-position" required maxLength={120} value={contact.position} onChange={(event) => setContact({ ...contact, position: event.target.value })} />
          <label htmlFor="recruiter-phone">Phone</label>
          <input id="recruiter-phone" type="tel" required maxLength={30} value={contact.phone} onChange={(event) => setContact({ ...contact, phone: event.target.value })} />
          <label htmlFor="recruiter-reason">Reason for requesting the CV</label>
          <textarea id="recruiter-reason" required maxLength={2000} value={contact.reason} onChange={(event) => setContact({ ...contact, reason: event.target.value })} />
          <label className="digital-status-checkbox"><input type="checkbox" required checked={consent} onChange={(event) => setConsent(event.target.checked)} /> I consent to sharing these details with the portfolio owner for this request.</label>
          <button type="submit">Send details to portfolio owner</button>
        </form>}
      </section>}
      <Status message={message} error={messageError} />
      {portfolio.watermark && <p className="public-portfolio-watermark">Made with FolioSpace</p>}
      <footer>FolioSpace · Your Work. Your Space. Your Future.</footer>
    </article>
  </main>;
}
