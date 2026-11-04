import React, { useState } from 'react';
import { apiFetch } from '../../../services/api.js';
import LanguageSelector from '../../../components/LanguageSelector.jsx';
import './AdminAuthPages.css';

const supportCategories = new Set(['sign_in', 'inactive_account', 'password_reset', 'setup_link', 'admin_invitation', 'other']);
const availableAdminRoles = [['portfolio_owner', 'Portfolio workspace'], ['content_manager', 'Content manager'], ['document_manager', 'Documents'], ['download_manager', 'Downloads'], ['profile_manager', 'Profile manager']];
const supportGuidance = {
  admin_invitation: {
    title: 'Request an admin invitation',
    description: 'New to the admin workspace? Select the roles you need and tell us why you need access.',
    nameLabel: 'Your name',
    emailLabel: 'Email address for the new account',
    messageLabel: 'Why do you need an admin account?'
  },
  setup_link: {
    title: 'Help with an invitation or setup link',
    description: 'Already invited but unable to set up your account? Use the email address that received the invitation so the owner can find it.',
    nameLabel: 'Your name',
    emailLabel: 'Email address on the invitation',
    messageLabel: 'What happened when you opened the setup link?'
  }
};

export default function AdminSupportPage() {
  const requestedCategory = new URLSearchParams(window.location.search).get('category');
  const [form, setForm] = useState({ name: '', email: '', category: supportCategories.has(requestedCategory) ? requestedCategory : 'sign_in', message: '', roles: [] });
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const guidance = supportGuidance[form.category] || {
    title: 'Support for an existing admin account',
    description: 'Already have an admin account? Choose the issue below so the platform owner can route your request correctly.',
    nameLabel: 'Administrator name',
    emailLabel: 'Administrator email',
    messageLabel: 'Describe the issue'
  };

  async function submit(event) {
    event.preventDefault(); setBusy(true); setFeedback(null);
    try {
      const response = await apiFetch('/support-requests', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, name: form.name.trim(), email: form.email.trim() })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Could not send the support request.');
      setFeedback({ text: result.message || 'Your ticket was raised successfully.', error: false });
      setForm(current => ({ ...current, name: '', email: '', message: '', roles: [] }));
    } catch (error) { setFeedback({ text: error.message || 'Could not reach support. Try again later.', error: true }); }
    finally { setBusy(false); }
  }

  return <main className="auth-page"><div className="auth-layout">
    <LanguageSelector />
    <a className="auth-back-link" href="/admin/login"><i className="fas fa-arrow-left" aria-hidden="true" /> Back to sign in</a>
    <section className="auth-card admin-support-card" aria-labelledby="support-title">
      <div className="auth-heading"><span className="auth-icon"><i className="fas fa-life-ring" aria-hidden="true" /></span><p className="auth-eyebrow">ADMINISTRATOR HELP</p><h1 id="support-title">{guidance.title}</h1><p>Choose the path that matches your administrator account.</p></div>
      <form className="auth-form" onSubmit={submit}>
        <label htmlFor="support-category">Which situation describes you?</label><select id="support-category" value={form.category} onChange={event => setForm({ ...form, category: event.target.value, roles: [] })}>
          <optgroup label="New administrator or invitee"><option value="admin_invitation">I need a new admin account</option><option value="setup_link">I was invited but need help with my setup link</option></optgroup>
          <optgroup label="Existing administrator"><option value="sign_in">I cannot sign in</option><option value="inactive_account">My admin account is inactive</option><option value="password_reset">I need to reset my password</option><option value="other">Another account issue</option></optgroup>
        </select>
        <p className="admin-support-category-hint">{guidance.description}</p>
        {form.category === 'admin_invitation' && <fieldset className="support-role-options"><legend>Choose the roles you need</legend><p>Choose one or more roles. Super-admin access is not available here.</p>{availableAdminRoles.map(([value, label]) => <label key={value}><input type="checkbox" checked={form.roles.includes(value)} onChange={event => { const checked = event.currentTarget.checked; setForm(current => ({ ...current, roles: checked ? [...new Set([...current.roles, value])] : current.roles.filter(role => role !== value) })); }} />{label}</label>)}</fieldset>}
        <label htmlFor="support-name">{guidance.nameLabel}</label><input id="support-name" autoComplete="name" maxLength="120" placeholder="e.g. Alex Morgan" required value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} />
        <label htmlFor="support-email">{guidance.emailLabel}</label><input id="support-email" type="email" autoComplete="email" maxLength="254" placeholder="e.g. alex@example.com" required value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} />
        <label htmlFor="support-message">{guidance.messageLabel}</label><textarea id="support-message" rows="5" minLength="10" maxLength="3000" placeholder={form.category === 'admin_invitation' ? 'e.g. I need to manage portfolio content and documents.' : 'e.g. Briefly describe what happened and what help you need.'} required value={form.message} onChange={event => setForm({ ...form, message: event.target.value })} />
        {feedback && <p className={`auth-feedback${feedback.error ? ' error' : ''}`} role="status" aria-live="polite">{feedback.text}</p>}
        <button className="auth-submit" type="submit" disabled={busy || (form.category === 'admin_invitation' && !form.roles.length)}><span>{busy ? 'Raising ticket…' : 'Raise Your Ticket'}</span><i className={`fas ${busy ? 'fa-spinner fa-spin' : 'fa-arrow-right'}`} aria-hidden="true" /></button>
      </form>
    </section>
  </div></main>;
}
