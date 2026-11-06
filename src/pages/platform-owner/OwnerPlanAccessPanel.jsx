import React, { useEffect, useState } from 'react';
import { ACCOUNT_PAGE_OPTIONS, DEFAULT_ACCOUNT_PAGE_ACCESS } from '../../services/accountPageAccess.js';
import { platformOwnerRequest } from './platformOwnerApi.js';

const plans = [
  ['free', 'Free'],
  ['standard', 'Standard'],
  ['professional', 'Professional']
];

export default function OwnerPlanAccessPanel() {
  const [pageAccess, setPageAccess] = useState(DEFAULT_ACCOUNT_PAGE_ACCESS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    platformOwnerRequest('/account-page-access')
      .then((result) => {
        if (active) setPageAccess(result.plans || DEFAULT_ACCOUNT_PAGE_ACCESS);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || 'Could not load subscription page access.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  function togglePage(planId, pageId) {
    setPageAccess((current) => {
      const currentPages = current[planId] || [];
      const enabled = currentPages.includes(pageId);
      let nextPages = enabled ? currentPages.filter((id) => id !== pageId) : [...currentPages, pageId];
      if (pageId === 'support' && enabled) nextPages = nextPages.filter((id) => id !== 'support-chat');
      if (pageId === 'support-chat' && !enabled && !currentPages.includes('support')) nextPages = [...nextPages, 'support'];
      return { ...current, [planId]: nextPages };
    });
  }

  async function saveAccess(event) {
    event.preventDefault();
    setSaving(true);
    setNotice('');
    setError('');
    try {
      const result = await platformOwnerRequest('/account-page-access', {
        method: 'PUT',
        body: JSON.stringify({ plans: pageAccess })
      });
      setPageAccess(result.plans || pageAccess);
      setNotice(result.message || 'Subscription page access saved.');
    } catch (requestError) {
      setError(requestError.message || 'Could not save subscription page access.');
    } finally {
      setSaving(false);
    }
  }

  return <section className="owner-card owner-plan-access">
    <header className="owner-section-heading">
      <div>
        <p className="owner-eyebrow">SUBSCRIPTION PAGE ACCESS</p>
        <h2>Choose pages for each plan</h2>
      </div>
      <button className="owner-button owner-button-primary" type="submit" form="owner-plan-access-form" disabled={saving || loading}>
        {saving ? 'Saving…' : 'Save access'}
      </button>
    </header>
    <p className="owner-plan-access-intro">Customers see only the account pages enabled for their active plan. These settings are enforced by the account and workspace APIs as well as the sidebar.</p>
    {notice && <p className="owner-form-hint" role="status">{notice}</p>}
    {error && <p className="owner-form-hint is-error" role="alert">{error}</p>}
    {loading ? <p>Loading plan access…</p> : <form id="owner-plan-access-form" onSubmit={saveAccess}>
      <div className="owner-plan-access-grid">
        {plans.map(([planId, label]) => <fieldset className="owner-plan-access-card" key={planId}>
          <legend>{label}</legend>
          {ACCOUNT_PAGE_OPTIONS.map((page) => {
            const checked = (pageAccess[planId] || []).includes(page.id);
            const required = page.id === 'overview';
            const disabled = required || (page.id === 'support-chat' && !(pageAccess[planId] || []).includes('support'));
            return <label key={page.id}>
              <input
                type="checkbox"
                checked={checked}
                disabled={disabled || saving}
                onChange={() => togglePage(planId, page.id)}
              />
              <span>{page.label}{required ? ' (required)' : ''}</span>
            </label>;
          })}
        </fieldset>)}
      </div>
    </form>}
  </section>;
}
