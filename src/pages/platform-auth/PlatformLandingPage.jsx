import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import WebsiteLogo from '../../components/WebsiteLogo.jsx';
import WhatsAppContact from '../../components/WhatsAppContact.jsx';
import { formatSpacePrice, saveSpaceOnboarding, spacePlans, USD_RWF_ESTIMATE } from '../../services/spacePlans.js';
import './PlatformLandingPage.css';

const features = [
  {
    icon: 'fa-globe',
    title: 'Web Design & Strategy',
    body: 'Modern, conversion-focused websites for businesses, founders, and personal brands that need a professional online presence.'
  },
  {
    icon: 'fa-code',
    title: 'Custom Development',
    body: 'Responsive, scalable front-end and full-stack builds tailored to your product, service, or portfolio goals.'
  },
  {
    icon: 'fa-pen-ruler',
    title: 'UI/UX Thinking',
    body: 'Thoughtful browsing experiences shaped around clarity, accessibility, clear user journeys, and the actions you need visitors to take.'
  },
  {
    icon: 'fa-chart-line',
    title: 'Business Growth Support',
    body: 'Online experiences that help explain your offer, build trust, and make it easier for customers to contact or buy from you.'
  },
  {
    icon: 'fa-shield-halved',
    title: 'Professional Reliability',
    body: 'Clean, maintainable builds and layered project thinking that keep your digital work dependable and easy to evolve.'
  },
  {
    icon: 'fa-headset',
    title: 'Friendly Support',
    body: 'Ongoing guidance, communication, and support so your online presence stays useful as your goals grow.'
  }
];

const templateNames = {
  free: 'Classic',
  standard: 'Studio',
  professional: 'Executive'
};

export function PlatformTemplatesPage() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  function handlePlanSelect(planId) {
    saveSpaceOnboarding({ templateId: planId, stage: 'signup' });
    navigate(`/platform/signup?template=${encodeURIComponent(planId)}`);
  }

  return (
    <div className="platform-templates-page">
      <nav className="pl-nav">
        <WebsiteLogo className="pl-nav-brand" />
        <div className={`pl-nav-actions ${menuOpen ? 'is-open' : ''}`}>
          <a className="pl-nav-link pl-nav-link-desktop" href="/platform/login">Sign in</a>
          <a className="pl-btn pl-btn-primary pl-nav-cta pl-nav-cta-desktop" href="/platform/signup?template=standard">
            Get Started
          </a>
          <button
            type="button"
            className="pl-nav-toggle"
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((value) => !value)}
          >
            <span />
            <span />
            <span />
          </button>
          <div className={`pl-nav-mobile ${menuOpen ? 'is-open' : ''}`}>
            <a href="/platform/login" onClick={() => setMenuOpen(false)}>Sign in</a>
            <a href="/platform/signup?template=standard" onClick={() => setMenuOpen(false)}>Get Started</a>
          </div>
        </div>
      </nav>

      <main className="pl-template-main">
        <section className="pl-template-hero">
          <p className="pl-hero-kicker"><span aria-hidden="true" /> Choose your next move</p>
          <h1>Pick the template that matches your story.</h1>
          <p>
            Start simple, grow into a richer portfolio, or choose the plan that makes your professional brand feel premium from the first impression.
          </p>
        </section>

        <section className="pl-template-grid" aria-label="Available portfolio templates">
          {spacePlans.map((plan) => (
            <article key={plan.id} className={`pl-template-card ${plan.id === 'standard' ? 'is-featured' : ''}`}>
              {plan.id === 'standard' && <span className="pl-template-badge">Most popular</span>}
              <div className="pl-template-head">
                <div>
                  <p className="pl-template-label">{plan.name}</p>
                  <h2>{plan.id === 'free' ? 'Classic' : plan.id === 'standard' ? 'Studio' : 'Executive'}</h2>
                </div>
                <div className="pl-template-price">
                  <strong>{plan.priceRwf === 0 ? 'Free' : formatSpacePrice(plan, 'RWF')}</strong>
                  <span>{plan.priceRwf === 0 ? '1 month trial' : 'every 6 months'}</span>
                </div>
              </div>

              <p className="pl-template-description">{plan.description}</p>

              <ul className="pl-template-features-list">
                {plan.features.map((feature) => (
                  <li key={feature}><span aria-hidden="true">✓</span>{feature}</li>
                ))}
              </ul>

              <button type="button" className="pl-btn pl-btn-primary pl-template-button" onClick={() => handlePlanSelect(plan.id)}>
                {plan.priceRwf === 0 ? 'Start free' : 'Choose plan'}
              </button>
            </article>
          ))}
        </section>

        <section className="pl-template-steps" id="how-it-works">
          <span className="pl-section-label">How it works</span>
          <h2 className="pl-section-title">A simple path from idea to public portfolio</h2>
          <div className="pl-steps">
            {[
              { num: '1', title: 'Choose a template', body: 'Pick a structure that fits your personal brand today.' },
              { num: '2', title: 'Create your account', body: 'Save your details and continue at your own pace.' },
              { num: '3', title: 'Set your space', body: 'Add your title, public address, and portfolio details.' },
              { num: '4', title: 'Share your work', body: 'Publish your profile and send one clean link to clients or employers.' }
            ].map((step) => (
              <div className="pl-step" key={step.num}>
                <div className="pl-step-num">{step.num}</div>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="pl-footer">
        <div className="pl-footer-inner">
          <div className="pl-footer-grid">
            <div className="pl-footer-column pl-footer-column-side">
              <h3>Services</h3>
              <ul className="pl-footer-links">
                <li><a href="/platform/templates">Portfolio setup</a></li>
                <li><a href="/platform/login">Account access</a></li>
                <li><a href="/platform/signup?template=standard">Business portfolio</a></li>
              </ul>
            </div>

            <div className="pl-footer-column pl-footer-column-center">
              <h3>Connect</h3>
              <div className="pl-footer-connect">
                <div className="pl-socials">
                  <a className="pl-social" href="https://wa.me/250788950833" target="_blank" rel="noreferrer" aria-label="WhatsApp"><i className="fa-brands fa-whatsapp" /></a>
                  <a className="pl-social" href="https://x.com" target="_blank" rel="noreferrer" aria-label="Twitter"><i className="fa-brands fa-x-twitter" /></a>
                  <a className="pl-social" href="https://linkedin.com" target="_blank" rel="noreferrer" aria-label="LinkedIn"><i className="fa-brands fa-linkedin-in" /></a>
                  <a className="pl-social" href="https://www.facebook.com" target="_blank" rel="noreferrer" aria-label="Facebook"><i className="fa-brands fa-facebook-f" /></a>
                  <a className="pl-social" href="https://www.instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram"><i className="fa-brands fa-instagram" /></a>
                </div>
                <ul className="pl-contact-list">
                  <li><a href="mailto:kadecomputerscience@gmail.com"><span className="mail-icon"><i className="fa-solid fa-envelope" /></span>kadecomputerscience@gmail.com</a></li>
                  <li><a href="tel:+250788950833"><span className="phone-icon"><i className="fa-solid fa-phone" /></span>+250 788 950 833</a></li>
                </ul>
              </div>
            </div>

            <div className="pl-footer-column pl-footer-column-side">
              <h3>Support</h3>
              <ul className="pl-footer-links">
                <li><a href="/platform/templates">Get started</a></li>
                <li><a href="/platform/help">FAQs &amp; Documentation</a></li>
                <li><a href="/platform/system-issues">System Based Issues</a></li>
                <li><a href="/admin/login">Administrator sign in</a></li>
              </ul>
            </div>
          </div>

          <div className="pl-footer-bottom">
            <span>© {new Date().getFullYear()} FolioSpace. All rights reserved.</span>
          </div>
        </div>
      </footer>
      <WhatsAppContact />
    </div>
  );
}

export default function PlatformLandingPage() {
  const [currency, setCurrency] = useState('RWF');
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="platform-landing">
      <nav className="pl-nav">
        <WebsiteLogo className="pl-nav-brand" />
        <div className={`pl-nav-actions ${menuOpen ? 'is-open' : ''}`}>
          <a className="pl-nav-link pl-nav-link-desktop" href="/platform/login">Sign in</a>
          <a className="pl-btn pl-btn-primary pl-nav-cta pl-nav-cta-desktop" href="/platform/templates">
            Get Started
          </a>
          <button
            type="button"
            className="pl-nav-toggle"
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((value) => !value)}
          >
            <span />
            <span />
            <span />
          </button>
          <div className={`pl-nav-mobile ${menuOpen ? 'is-open' : ''}`}>
            <a href="/platform/login" onClick={() => setMenuOpen(false)}>Sign in</a>
            <a href="/platform/templates" onClick={() => setMenuOpen(false)}>Get Started</a>
          </div>
        </div>
      </nav>

      <section className="pl-hero">
        <p className="pl-hero-kicker"><span aria-hidden="true" /> Your work. Your space. Your future.</p>
        <h1>Your own professional space,<br />ready to make yours.</h1>
        <p className="pl-hero-sub">
          Choose a portfolio template, add your story, and share one clear link to your work.
          Start free, or choose a paid template with more room to present yourself.
        </p>
        <div className="pl-hero-actions">
          <a className="pl-btn pl-btn-primary" href="/platform/templates">Get Started</a>
          <a className="pl-btn pl-btn-outline" href="#how-it-works">How it works</a>
        </div>
      </section>

      <section className="pl-section" id="how-it-works">
        <span className="pl-section-label">How it works</span>
        <h2 className="pl-section-title">From template to your own space</h2>
        <p className="pl-section-intro">
          Your setup is saved as you go, so you can come back and continue where you stopped.
        </p>
        <div className="pl-steps">
          {[
            { num: '1', title: 'Choose a template', body: 'Compare the included features and select the free or paid space that fits you.' },
            { num: '2', title: 'Create your account', body: 'Your account and selected template are saved before you continue to checkout.' },
            { num: '3', title: 'Complete your plan', body: 'Continue to payment for paid templates, or move straight ahead with the free template.' },
            { num: '4', title: 'Build and share', body: 'Choose your public address, add your content, and share your portfolio space.' }
          ].map((step) => (
            <div className="pl-step" key={step.num}>
              <div className="pl-step-num">{step.num}</div>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="pl-features">
        <div className="pl-section">
          <span className="pl-section-label">What you get</span>
          <h2 className="pl-section-title">Everything a modern portfolio needs</h2>
          <p className="pl-section-intro">
            Built for professionals who want to stand out without spending hours on a personal website.
          </p>
          <div className="pl-features-grid">
            {features.map((f) => (
              <div className="pl-feature" key={f.title}>
                <span className="pl-feature-icon"><i className={`fas ${f.icon}`} aria-hidden="true" /></span>
                <div>
                  <h3>{f.title}</h3>
                  <p>{f.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="pl-section">
        <div className="pl-cta-banner">
          <h2>Ready to claim your folio space?</h2>
          <p>
            Create your account, pick your unique address, and publish
            a portfolio that works for you around the clock.
          </p>
          <div className="pl-cta-actions">
            <a className="pl-btn pl-btn-primary" href="/platform/templates">Choose your template</a>
            <a className="pl-btn pl-btn-outline" href="/platform/login">Continue setup</a>
          </div>
        </div>
      </div>

      <footer className="pl-footer">
        <div className="pl-footer-inner">
          <div className="pl-footer-grid">
            <div className="pl-footer-column pl-footer-column-side">
              <h3>Services</h3>
              <ul className="pl-footer-links">
                <li><a href="/platform/templates">Portfolio setup</a></li>
                <li><a href="/platform/login">Account access</a></li>
                <li><a href="/platform/signup?template=standard">Business portfolio</a></li>
              </ul>
            </div>

            <div className="pl-footer-column pl-footer-column-center">
              <h3>Connect</h3>
              <div className="pl-footer-connect">
                <div className="pl-socials">
                  <a className="pl-social" href="https://wa.me/250788950833" target="_blank" rel="noreferrer" aria-label="WhatsApp"><i className="fa-brands fa-whatsapp" /></a>
                  <a className="pl-social" href="https://x.com" target="_blank" rel="noreferrer" aria-label="Twitter"><i className="fa-brands fa-x-twitter" /></a>
                  <a className="pl-social" href="https://linkedin.com" target="_blank" rel="noreferrer" aria-label="LinkedIn"><i className="fa-brands fa-linkedin-in" /></a>
                  <a className="pl-social" href="https://www.facebook.com" target="_blank" rel="noreferrer" aria-label="Facebook"><i className="fa-brands fa-facebook-f" /></a>
                  <a className="pl-social" href="https://www.instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram"><i className="fa-brands fa-instagram" /></a>
                </div>
                <ul className="pl-contact-list">
                  <li><a href="mailto:kadecomputerscience@gmail.com"><span className="mail-icon"><i className="fa-solid fa-envelope" /></span>kadecomputerscience@gmail.com</a></li>
                  <li><a href="tel:+250788950833"><span className="phone-icon"><i className="fa-solid fa-phone" /></span>+250 788 950 833</a></li>
                </ul>
              </div>
            </div>

            <div className="pl-footer-column pl-footer-column-side">
              <h3>Support</h3>
              <ul className="pl-footer-links">
                <li><a href="/platform/templates">Get started</a></li>
                <li><a href="/platform/help">FAQs &amp; Documentation</a></li>
                <li><a href="/platform/system-issues">System Based Issues</a></li>
                <li><a href="/admin/login">Administrator sign in</a></li>
              </ul>
            </div>
          </div>

          <div className="pl-footer-bottom">
            <span>© {new Date().getFullYear()} FolioSpace. All rights reserved.</span>
          </div>
        </div>
      </footer>
      <WhatsAppContact />
    </div>
  );
}
