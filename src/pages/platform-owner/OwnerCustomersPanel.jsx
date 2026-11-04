import React, { useCallback, useEffect, useState } from 'react';
import ExpandableCell from '../../components/ExpandableCell.jsx';
import { platformOwnerRequest } from './platformOwnerApi.js';

const planLabels = {
  free: 'Free',
  standard: 'Standard',
  professional: 'Professional'
};

const statusLabels = {
  active: 'Active',
  pending_verification: 'Pending verification',
  suspended: 'Suspended'
};

const emptyCounts = { total: 0, active: 0, pending: 0, suspended: 0 };

export default function OwnerCustomersPanel() {
  const [customers, setCustomers] = useState([]);
  const [counts, setCounts] = useState(emptyCounts);
  const [planCounts, setPlanCounts] = useState({});
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [busyId, setBusyId] = useState(null);
  const [planMenuId, setPlanMenuId] = useState(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (nextPage = page, nextSearch = search, nextStatus = statusFilter) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(nextPage) });
      if (nextSearch) params.set('search', nextSearch);
      if (nextStatus !== 'all') params.set('status', nextStatus);
      const result = await platformOwnerRequest(`/customers?${params}`);
      setCustomers(result.customers || []);
      setCounts(result.counts || emptyCounts);
      setPlanCounts(result.planCounts || {});
      setTotalPages(result.totalPages || 1);
      setPage(result.page || nextPage);
    } catch (requestError) {
      setError(requestError.message || 'Could not load customer accounts.');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!notice && !error) return undefined;
    const timer = window.setTimeout(() => { setNotice(''); setError(''); }, 5000);
    return () => window.clearTimeout(timer);
  }, [notice, error]);

  async function act(customer, action, body, message, confirmPhrase) {
    if (confirmPhrase && !window.confirm(confirmPhrase)) return;
    setBusyId(customer.id);
    setError('');
    try {
      const result = await platformOwnerRequest(`/customers/${customer.id}/${action}`, {
        method: action === 'delete' ? 'DELETE' : 'PATCH',
        ...(body ? { body: JSON.stringify(body) } : {})
      });
      setNotice(result.message || message);
      if (action === 'delete') setPlanMenuId(null);
      await load();
    } catch (requestError) {
      setError(requestError.message || 'That action could not be completed.');
    } finally {
      setBusyId(null);
    }
  }

  return <section className="owner-card owner-customers" id="customers">
    <header className="owner-section-heading">
      <div>
        <p className="owner-eyebrow">CUSTOMER ACCOUNTS</p>
        <h2>FolioSpace customers</h2>
      </div>
      <span>{counts.total} accounts · {planCounts.standard || 0} standard · {planCounts.professional || 0} professional</span>
    </header>

    {notice && <p className="owner-form-hint" role="status">{notice}</p>}
    {error && <p className="owner-form-hint is-error" role="alert">{error}</p>}

    <section className="owner-stat-grid owner-directory-stats" aria-label="Customer account totals">
      <article className="owner-stat"><span className="owner-stat-icon blue"><i className="fas fa-users" /></span><div><small>All customers</small><strong>{counts.total}</strong></div></article>
      <article className="owner-stat"><span className="owner-stat-icon green"><i className="fas fa-circle-check" /></span><div><small>Active</small><strong>{counts.active}</strong></div></article>
      <article className="owner-stat"><span className="owner-stat-icon amber"><i className="fas fa-hourglass-half" /></span><div><small>Pending verification</small><strong>{counts.pending}</strong></div></article>
      <article className="owner-stat"><span className="owner-stat-icon gray"><i className="fas fa-user-slash" /></span><div><small>Suspended</small><strong>{counts.suspended}</strong></div></article>
    </section>

    <div className="owner-filters">
      <form className="owner-search" onSubmit={(event) => { event.preventDefault(); setPage(1); setSearch(searchInput.trim()); }}>
        <i className="fas fa-magnifying-glass" aria-hidden="true" />
        <input type="search" placeholder="Search by name or email" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} aria-label="Search customers" />
      </form>
      <label className="owner-status-filter">
        <span>Status</span>
        <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}>
          <option value="all">All accounts</option>
          <option value="active">Active</option>
          <option value="pending_verification">Pending verification</option>
          <option value="suspended">Suspended</option>
        </select>
      </label>
    </div>

    <div className="owner-table-wrap"><div className="owner-table-scroll">
      <table className="owner-table">
        <thead><tr>
          <th>Name</th><th>Email</th><th>Plan</th><th>Spaces</th><th>Status</th><th className="owner-actions-heading">Actions</th>
        </tr></thead>
        <tbody>
          {customers.map((customer) => <tr key={customer.id}>
            <td className="owner-name-cell"><strong><ExpandableCell>{customer.displayName}</ExpandableCell></strong></td>
            <td className="owner-email-cell"><ExpandableCell>{customer.email}</ExpandableCell></td>
            <td>
              <details className="owner-role-dropdown" open={planMenuId === customer.id} onToggle={(event) => setPlanMenuId(event.target.open ? customer.id : null)}>
                <summary>{planLabels[customer.planId] || customer.planId || 'Free'} <i className="fas fa-chevron-down" aria-hidden="true" /></summary>
                <div className="owner-role-dropdown-panel">
                  <fieldset className="owner-role-checks owner-row-role-checks" aria-label={`Subscription plan for ${customer.displayName}`}>
                    <legend>Set plan (behind the scenes)</legend>
                    {['free', 'standard', 'professional'].map((planId) => (
                      <label key={planId}>
                        <input
                          type="radio"
                          name={`plan-${customer.id}`}
                          checked={(customer.planId || 'free') === planId}
                          disabled={busyId === customer.id}
                          onChange={() => act(customer, 'plan', { planId }, `Plan set to ${planLabels[planId]}.`)}
                        />
                        <span>{planLabels[planId]}</span>
                      </label>
                    ))}
                  </fieldset>
                  <small>Changing the plan applies its limits immediately — no payment is taken.</small>
                </div>
              </details>
            </td>
            <td>{customer.portfolioCount}</td>
            <td className={`owner-status-column ${customer.status === 'active' ? 'is-active' : customer.status === 'suspended' ? 'is-inactive' : 'is-pending'}`}>
              <div className="owner-status-cell">
                {customer.status === 'pending_verification'
                  ? <span className="owner-status-pill pending">Email not verified</span>
                  : <>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={customer.status === 'active'}
                      aria-label={`${customer.status === 'active' ? 'Suspend' : 'Activate'} ${customer.displayName}`}
                      className={`owner-status-toggle ${customer.status === 'active' ? 'is-on' : 'is-off'}`}
                      disabled={busyId === customer.id}
                      onClick={() => act(customer, 'status', { status: customer.status === 'active' ? 'suspended' : 'active' })}
                    >
                      <span className="owner-status-toggle-knob" />
                    </button>
                    <span className={`owner-status-label ${customer.status === 'active' ? 'active' : 'inactive'}`}>
                      {statusLabels[customer.status] || customer.status}
                    </span>
                  </>}
              </div>
            </td>
            <td>
              <div className="owner-row-actions">
                <button
                  type="button"
                  className="owner-action-button delete owner-icon-action"
                  aria-label={`Delete customer ${customer.displayName}`}
                  title="Permanently delete this customer and their portfolios"
                  disabled={busyId === customer.id}
                  onClick={() => act(customer, 'delete', null, 'Customer deleted.', `Permanently delete ${customer.displayName} (${customer.email}) and all their portfolios? This cannot be undone.`)}
                >
                  <i className="fas fa-trash-can" aria-hidden="true" />
                </button>
              </div>
            </td>
          </tr>)}
        </tbody>
      </table>
      {!loading && customers.length === 0 && <div className="owner-empty">
        <i className="fas fa-user-magnifying-glass" />
        <strong>No customers found</strong>
        <span>Try another search or status filter.</span>
      </div>}
      {loading && <div className="owner-empty"><strong>Loading customers…</strong></div>}
    </div></div>

    <footer className="owner-pagination">
      <span>Page {page} of {totalPages}</span>
      <div>
        <button disabled={page <= 1 || loading} onClick={() => load(page - 1)}><i className="fas fa-chevron-left" /> Previous</button>
        <button disabled={page >= totalPages || loading} onClick={() => load(page + 1)}>Next <i className="fas fa-chevron-right" /></button>
      </div>
    </footer>
  </section>;
}
