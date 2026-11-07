import React from 'react';
import { getSpacePlan, minimumPlanFor, planPrivileges } from '../services/spacePlans.js';
import './UpgradeModal.css';

/**
 * Reusable upgrade prompt. Used everywhere a plan limit blocks the user
 * (space creation, locked template, locked section, ...) — Pattern B in
 * SUBSCRIPTION_PLAN.md.
 *
 * props:
 *  - open: boolean — render nothing when false
 *  - title: string — the headline shown at the top of the dialog
 *  - feature: string — a limits key (e.g. 'visitorStats'); the modal works out
 *    which plan is the minimum that includes it and lists that plan's privileges
 *  - onClose: function
 */
export default function UpgradeModal({ open, title, feature, onClose }) {
  if (!open) return null;
  const neededPlanId = minimumPlanFor(feature) || 'standard';
  const plan = getSpacePlan(neededPlanId);

  return <div className="upgrade-modal-backdrop" role="presentation" onClick={onClose}>
    <section
      className="upgrade-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrade-modal-title"
      onClick={(event) => event.stopPropagation()}
    >
      <header className="upgrade-modal-header">
        <i className="fa-solid fa-lock" aria-hidden="true" />
        <h2 id="upgrade-modal-title">{title || 'This feature needs a plan upgrade'}</h2>
        <button type="button" className="upgrade-modal-close" aria-label="Close" onClick={onClose}>×</button>
      </header>
      <p className="upgrade-modal-plan-name">
        Upgrade to the <strong>{plan.name}</strong> plan to unlock it.
      </p>
      <ul className="upgrade-modal-benefits">
        {planPrivileges(plan.id).map((privilege) => (
          <li key={privilege}><i className="fa-solid fa-circle-check" aria-hidden="true" />{privilege}</li>
        ))}
      </ul>
      <footer className="upgrade-modal-actions">
        <a className="upgrade-modal-cta" href="/platform/account/subscription">Upgrade to {plan.name}</a>
        <button type="button" className="upgrade-modal-dismiss" onClick={onClose}>Not now</button>
      </footer>
    </section>
  </div>;
}
