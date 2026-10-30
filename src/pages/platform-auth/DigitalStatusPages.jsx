import React, { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../services/api.js';
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
      <a href="index.html" className="digital-status-brand">Digital Status</a>
      <nav aria-label="Account navigation">
        <a href="platform-dashboard.html">Dashboard</a>
        <a href="platform-account.html">Account</a>
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

export function PlatformDashboardPage() {
  const [user, setUser] = useState(null);
  const [portfolios, setPortfolios] = useState([]);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      requestJson('/platform-auth/me'),
      requestJson('/portfolios')
    ]).then(([account, result]) => {
      if (active) {
        setUser(account.user);
        setPortfolios(result.portfolios);
      }
    }).catch((error) => {
      if (active) {
        if (error.message.includes('Authentication required')) {
          window.location.replace('platform-login.html?next=platform-dashboard.html');
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
    setSaving(true);
    setMessage('');
    setIsError(false);
    try {
      const result = await requestJson('/portfolios', {
        method: 'POST',
        body: JSON.stringify({ slug, title })
      });
      window.location.assign(`platform-portfolio.html?id=${result.portfolio.id}`);
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
            <a href={`platform-portfolio.html?id=${portfolio.id}`}>Edit</a>
          </li>)}</ul>}
        <a className="digital-status-back-link" href="platform-account.html">Manage account</a>
      </section>
    </div>
  </PageFrame>;
}

export function PlatformPortfolioEditorPage() {
  const portfolioId = new URLSearchParams(window.location.search).get('id');
  const [portfolio, setPortfolio] = useState(null);
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
    let active = true;
    if (!portfolioId || !/^\d+$/.test(portfolioId)) {
      setMessage('Choose a valid portfolio to edit.');
      setIsError(true);
      return () => { active = false; };
    }
    requestJson(`/portfolios/${portfolioId}`).then((result) => {
      if (!active) return;
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
      <label className="digital-status-checkbox"><input type="checkbox" checked={privateAbout} onChange={(event) => setPrivateAbout(event.target.checked)} /> Show About only after recruiter email verification</label>
      <label className="digital-status-checkbox"><input type="checkbox" checked={privateSkills} onChange={(event) => setPrivateSkills(event.target.checked)} /> Show Skills only after recruiter email verification</label>
      <div className="digital-status-actions">
        <button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
        <button type="button" className="digital-status-secondary" disabled={!portfolio} onClick={() => setPublished(portfolio?.status !== 'published')}>
          {portfolio?.status === 'published' ? 'Unpublish' : 'Publish'}
        </button>
      </div>
    </form>
    {portfolio?.status === 'published' && <p className="digital-status-public-link">Public page: <a href={publicUrl} target="_blank" rel="noreferrer">{window.location.origin}{publicUrl}</a></p>}
    <a className="digital-status-back-link" href="platform-dashboard.html">Back to dashboard</a>
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

  if (message && !portfolio) return <main className="digital-status-page"><Status message={message} error /><a className="digital-status-back-link" href="index.html">Digital Status</a></main>;
  if (!portfolio) return <main className="digital-status-page"><p role="status">Loading portfolio…</p></main>;

  const sections = privatePortfolio?.sections || portfolio.sections;
  const section = (type) => sections.find((item) => item.type === type)?.data;
  const hero = section('hero');
  const about = section('about');
  const skills = section('skills');
  return <main className="public-portfolio-page">
    <header className="public-portfolio-header"><a href="index.html">Digital Status</a></header>
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
      <footer>Digital Status · Your career, in one place</footer>
    </article>
  </main>;
}
