import React, { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '../../services/api.js';
import TimedNotification from '../../components/TimedNotification.jsx';
import { platformOwnerRequest } from './platformOwnerApi.js';
import OwnerMessages from './OwnerMessages.jsx';
import LogoutIcon from '../../components/LogoutIcon.jsx';
import ExpandableCell from '../../components/ExpandableCell.jsx';
import './PlatformOwnerPage.css';

const roles = [
  ['platform_owner', 'Super admin · full access'],
  ['portfolio_owner', 'Portfolio owner'],
  ['content_manager', 'Content manager'],
  ['document_manager', 'Document manager'],
  ['download_manager', 'Download manager'],
  ['profile_manager', 'Profile manager']
];
const supportCategoryLabels = {
  admin_invitation: 'New admin account',
  setup_link: 'Invitation / setup link',
  sign_in: 'Sign-in problem',
  inactive_account: 'Inactive account',
  password_reset: 'Password reset',
  other: 'Other account issue',
  platform_sign_in: 'FolioSpace sign-in issue',
  platform_signup: 'FolioSpace signup issue',
  platform_account_access: 'FolioSpace account access',
  platform_inactive_account: 'Inactive FolioSpace account or space',
  platform_subscription: 'FolioSpace payment or subscription',
  platform_space_setup: 'FolioSpace space setup',
  platform_other: 'Other FolioSpace system issue'
};
const standardAdminRoles = roles.filter(([role]) => role !== 'platform_owner');
function updateRoleSelection(current, value, checked) {
  if (value === 'platform_owner') return checked ? roles.map(([role]) => role) : current.filter((role) => role !== 'platform_owner');
  if (current.includes('platform_owner')) return current;
  return checked ? [...new Set([...current, value])] : current.filter((role) => role !== value);
}
function positionRoleViewDropdown(event) {
  const dropdown = event.currentTarget;
  if (!dropdown.open) return;
  const summary = dropdown.querySelector('summary')?.getBoundingClientRect();
  const panel = dropdown.querySelector('.owner-role-dropdown-panel');
  if (!summary || !panel) return;
  const width = Math.min(panel.getBoundingClientRect().width || 235, window.innerWidth - 24);
  const height = panel.getBoundingClientRect().height;
  const left = Math.max(12, Math.min(summary.left, window.innerWidth - width - 12));
  let top = summary.bottom + 5;
  if (top + height > window.innerHeight - 12) top = Math.max(12, summary.top - height - 5);
  dropdown.style.setProperty('--owner-role-menu-top', `${top}px`);
  dropdown.style.setProperty('--owner-role-menu-left', `${left}px`);
}
const bulkActionInfo = {
  delete_all: { title: 'Move all customer admins to deleted accounts', phrase: 'DELETE ALL', detail: 'This disables and moves every customer admin account to the recoverable deleted list. You can restore accounts later. Super-admin accounts are protected.' },
  activate_all: { title: 'Activate all customer admins', phrase: 'ACTIVATE ALL', detail: 'This activates inactive customer admin accounts. Pending invitations and super-admin accounts are unchanged.' },
  deactivate_all: { title: 'Deactivate all customer admins', phrase: 'DEACTIVATE ALL', detail: 'This deactivates active customer admin accounts and ends their current sessions. Pending invitations and super-admin accounts are unchanged.' },
  reset_passwords: { title: 'Send password links to all customer admins', phrase: 'RESET PASSWORDS', detail: 'Active admins receive password-reset links and pending admins receive setup links. Inactive accounts and super-admin accounts are skipped.' },
  assign_roles_all: { title: 'Assign roles to all customer admins', phrase: 'ASSIGN ROLES', detail: 'This replaces the current roles of every customer admin account with the selected role set. Super-admin accounts are not changed.' }
};

function formatActivityName(action = '') {
  return action.replaceAll('_', ' ');
}

function formatActivityTime(value) {
  if (!value) return 'Time unavailable';
  const parsed = new Date(value.includes('T') ? value : `${value.replace(' ', 'T')}Z`);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

function RequestDetails({ message }) {
  return <ExpandableCell className="owner-request-detail" buttonClassName="owner-request-detail-toggle">{message}</ExpandableCell>;
}

function sessionToken() {
  try { return window.sessionStorage.getItem('kade-admin-session-token') || ''; } catch { return ''; }
}

export default function PlatformOwnerPage() {
  const [locationHash, setLocationHash] = useState(() => window.location.hash);
  const [directoryView, setDirectoryView] = useState(() => ['#admin-directory', '#recent-activity'].includes(window.location.hash));
  const [requestsView, setRequestsView] = useState(() => window.location.hash === '#requests');
  const [messagesView, setMessagesView] = useState(() => window.location.hash === '#messages');
  const [owner, setOwner] = useState(null);
  const [admins, setAdmins] = useState([]);
  const [deletedAdmins, setDeletedAdmins] = useState([]);
  const [deletedAdminsOpen, setDeletedAdminsOpen] = useState(false);
  const [selectedDeletedAdminIds, setSelectedDeletedAdminIds] = useState([]);
  const [auditEvents, setAuditEvents] = useState([]);
  const [newAuditCount, setNewAuditCount] = useState(0);
  const [supportRequests, setSupportRequests] = useState([]);
  const [requestStatusView, setRequestStatusView] = useState('open');
  const [requestSearch, setRequestSearch] = useState('');
  const [selectedRequestIds, setSelectedRequestIds] = useState([]);
  const [bulkRequestBusy, setBulkRequestBusy] = useState(false);
  const [responseDialogOpen, setResponseDialogOpen] = useState(false);
  const [responseDraft, setResponseDraft] = useState('');
  const [responseBusy, setResponseBusy] = useState(false);
  const [inboxCounts, setInboxCounts] = useState({ requests: 0, resolvedRequests: 0, deletedRequests: 0, messages: 0, messagesIncoming: 0, messagesOutgoing: 0 });
  const [updatingRequestId, setUpdatingRequestId] = useState(null);
  const [invitationRequest, setInvitationRequest] = useState(null);
  const [invitationRoles, setInvitationRoles] = useState(['portfolio_owner']);
  const [counts, setCounts] = useState({ total: 0, active: 0, pending: 0, inactive: 0 });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [activitySearchInput, setActivitySearchInput] = useState('');
  const [activitySearch, setActivitySearch] = useState('');
  const [deletingAuditId, setDeletingAuditId] = useState(null);
  const [deletingAllAudit, setDeletingAllAudit] = useState(false);
  const [deletedAuditCount, setDeletedAuditCount] = useState(0);
  const [restoreAuditOpen, setRestoreAuditOpen] = useState(false);
  const [restoreAuditFrom, setRestoreAuditFrom] = useState('');
  const [restoreAuditTo, setRestoreAuditTo] = useState('');
  const [restoringAudit, setRestoringAudit] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [form, setForm] = useState({ displayName: '', email: '', phone: '', roles: ['portfolio_owner'] });
  const [busy, setBusy] = useState(false);
  const [editingRolesId, setEditingRolesId] = useState(null);
  const [draftRoles, setDraftRoles] = useState([]);
  const [bulkAction, setBulkAction] = useState('');
  const [bulkPhrase, setBulkPhrase] = useState('');
  const [bulkRoles, setBulkRoles] = useState(['portfolio_owner']);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [navOpen, setNavOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpPage, setHelpPage] = useState('faq');
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [accountMenuPosition, setAccountMenuPosition] = useState({ top: 12, left: 12 });
  const accountMenuRef = useRef(null);
  const [railCollapsed, setRailCollapsed] = useState(() => {
    try {
      // Start collapsed when arriving from the admin workspace (or any page other
      // than the owner console itself), so the console opens wide on first paint.
      const referrer = document.referrer || '';
      const fromAdminWorkspace = (referrer.includes('/admin') || referrer.includes('admin.html')) && !referrer.includes('platform-owner.html');
      if (fromAdminWorkspace) return true;
      return window.localStorage.getItem('kade-owner-rail') === 'collapsed';
    } catch { return false; }
  });

  useEffect(() => {
    try { window.localStorage.setItem('kade-owner-rail', railCollapsed ? 'collapsed' : 'open'); } catch { /* ignore */ }
  }, [railCollapsed]);
  const [theme, setTheme] = useState(() => { try { return window.localStorage.getItem('kade-owner-theme') === 'dark' ? 'dark' : 'light'; } catch { return 'light'; } });
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const dismissNotice = useCallback(() => setNotice(''), []);
  const dismissError = useCallback(() => setError(''), []);

  useEffect(() => {
    const syncView = () => {
      setLocationHash(window.location.hash);
      setDirectoryView(['#admin-directory', '#recent-activity'].includes(window.location.hash));
      setRequestsView(window.location.hash === '#requests');
      setMessagesView(window.location.hash === '#messages');
      setNavOpen(false);
      setToolsOpen(false);
      setHelpOpen(false);
    };
    window.addEventListener('hashchange', syncView);
    window.addEventListener('click', handleOutsideClick);
    return () => { window.removeEventListener('hashchange', syncView); window.removeEventListener('click', handleOutsideClick); };
  }, [toolsOpen, helpOpen]);

  function handleOutsideClick(event) {
    if (!toolsOpen && !helpOpen) return;
    if (event.target.closest?.('.owner-tools-menu')) return;
    setToolsOpen(false);
    setHelpOpen(false);
  }

  function collapseOwnerNavigation() {
    setNavOpen(false);
    setRailCollapsed(true);
    try { window.localStorage.setItem('kade-owner-rail', 'collapsed'); } catch { /* Keep navigation available when storage is disabled. */ }
  }

  const chatTools = [
    { href: '#recent-activity', icon: 'fa-clock-rotate-left', label: 'Recent activity' },
    { href: '#admin-directory', icon: 'fa-users-gear', label: 'Admin directory' },
    { href: '#support-requests', icon: 'fa-life-ring', label: 'Support inbox' },
    { href: '/admin', icon: 'fa-briefcase', label: 'Portfolio workspace' },
    { href: '#messages', icon: 'fa-comment', label: 'Chat room' }
  ];

  const ownerHelpGuide = [
    { title: '1 · Overview dashboard', body: 'The landing page shows live totals of every admin account: all, active, invited, and inactive. Use it as your daily health check before working in any section.' },
    { title: '2 · Inviting an administrator', body: 'Open Admin accounts, click Invite administrator, and fill in the name, email, and access roles. After confirming the customer payment, sending the form emails them a one-time setup link to create their own password.' },
    { title: '3 · Managing access', body: 'Each account row has a status toggle to activate or deactivate access instantly. Deactivated accounts cannot sign in, and their current sessions end immediately.' },
    { title: '4 · Roles and permissions', body: 'Roles control what each admin can reach: Portfolio owner, Content manager, Document manager, Download manager, and Profile manager. Super admin has every permission and is always protected from bulk actions.' },
    { title: '5 · Password and setup links', body: 'Pending accounts receive setup links; active accounts receive password-reset links. Send them from any account row, or use "Reset passwords all" to email every active customer admin at once.' },
    { title: '6 · Bulk actions', body: 'Activate all, Deactivate all, Reset passwords all, Assign roles all, and Delete all target customer admins only — super-admin accounts are always skipped for safety. Destructive actions require typing a confirmation phrase.' },
    { title: '7 · Chat room', body: 'Open Chat to message admins privately or broadcast to all active admins or a whole role. Each message stores its own reply permission, and the muted-admins panel lets you allow or stop replies per admin or role.' },
    { title: '8 · Support requests', body: 'When an admin reports a sign-in or account problem, it lands in Requests. Fix the underlying issue, then click Mark resolved to clear it from the inbox.' },
    { title: '9 · Security history', body: 'Every access change is recorded in Recent access activity below the admins table. Search it by action, admin, or email, and delete individual records or clear all history when needed.' },
    { title: '10 · Data today and next', body: 'Roles currently apply to this shared portfolio. Per-customer data separation arrives with the next multi-tenant phase, so one customer’s admin will only ever see their own content.' }
  ];

  const chatHelpTopics = [
    { title: 'Start a private chat', body: 'Pick an admin from the conversation list on the left, then type your message and press Send.' },
    { title: 'Broadcast a message', body: 'Choose "All active admins" or a role in the Send-to selector so one copy lands in every matching conversation.' },
    { title: 'Control replies', body: 'Use the reply toggles to allow or stop admin replies, or open the muted-admins panel to manage access per admin or role.' },
    { title: 'Attach files, images, or voice notes', body: 'Use the attachment buttons next to the composer to add files, photos, or a recorded voice note before sending.' },
    { title: 'Manage sent messages', body: 'Open Manage to select and clear sent messages, or edit and clear any bubble from its own controls.' }
  ];

  useEffect(() => {
    if (!directoryView) return;
    const targetId = locationHash === '#recent-activity' ? 'recent-activity' : locationHash === '#requests' ? 'support-requests' : locationHash === '#messages' ? 'owner-messages' : 'admin-directory';
    window.requestAnimationFrame(() => document.getElementById(targetId)?.scrollIntoView({ block: 'start' }));
  }, [directoryView, requestsView, locationHash]);

  const loadAdmins = useCallback(async (nextPage = page, nextSearch = search, nextStatus = statusFilter) => {
    const params = new URLSearchParams({ page: String(nextPage) });
    if (nextSearch) params.set('search', nextSearch);
    if (nextStatus !== 'all') params.set('status', nextStatus);
    const result = await platformOwnerRequest(`/admins?${params}`);
    setAdmins(result.admins || []);
    setCounts(result.counts || { total: 0, active: 0, pending: 0, inactive: 0 });
    setTotalPages(result.totalPages || 1);
    setPage(result.page || nextPage);
  }, [page, search, statusFilter]);

  const loadDeletedAdmins = useCallback(async () => {
    const result = await platformOwnerRequest('/admins/deleted');
    setDeletedAdmins(result.admins || []);
    setSelectedDeletedAdminIds(current => current.filter(id => (result.admins || []).some(admin => admin.id === id)));
  }, []);

  const loadAudit = useCallback(async () => {
    const result = await platformOwnerRequest('/audit');
    const events = result.events || [];
    setAuditEvents(events);
    setDeletedAuditCount(result.deletedCount || 0);
    try {
      const key = 'kade-owner-audit-last-seen';
      let lastSeen = Number(window.localStorage.getItem(key));
      if (!Number.isFinite(lastSeen) || lastSeen <= 0) {
        lastSeen = Date.now();
        window.localStorage.setItem(key, String(lastSeen));
      }
      setNewAuditCount(events.filter((event) => {
        const createdAt = new Date(event.createdAt).getTime();
        return Number.isFinite(createdAt) && createdAt > lastSeen;
      }).length);
    } catch { setNewAuditCount(0); }
  }, []);

  const loadOwnerInbox = useCallback(async () => {
    const [countResult, requestResult, deletedRequestResult] = await Promise.all([
      platformOwnerRequest('/inbox-counts'),
      platformOwnerRequest('/support-requests?status=all'),
      platformOwnerRequest('/support-requests?status=deleted')
    ]);
    setInboxCounts({ requests: countResult.requests || 0, resolvedRequests: countResult.resolvedRequests || 0, deletedRequests: countResult.deletedRequests || 0, messages: countResult.messages || 0, messagesIncoming: countResult.messagesIncoming || 0, messagesOutgoing: countResult.messagesOutgoing || 0 });
    setSupportRequests([...(requestResult.requests || []), ...(deletedRequestResult.requests || [])]);
  }, []);

  const refreshInbox = useCallback(() => {
    return platformOwnerRequest('/inbox-counts')
      .then((result) => setInboxCounts({
        requests: result.requests || 0,
        resolvedRequests: result.resolvedRequests || 0,
        deletedRequests: result.deletedRequests || 0,
        messages: result.messages || 0,
        messagesIncoming: result.messagesIncoming || 0,
        messagesOutgoing: result.messagesOutgoing || 0
      }))
      .catch((requestError) => {
        if (!requestError.message?.toLowerCase().includes('too many requests')) setError(requestError.message);
      });
  }, []);

  const visibleSupportRequests = supportRequests
    .filter(request => requestStatusView === 'deleted' ? Boolean(request.deletedAt) : !request.deletedAt && request.status === requestStatusView)
    .filter(request => `${request.name} ${request.email} ${request.category} ${request.message}`.toLowerCase().includes(requestSearch.trim().toLowerCase()));
  const selectedVisibleSupportRequests = visibleSupportRequests.filter(request => selectedRequestIds.includes(request.id));
  const resolvedSupportRequestCount = inboxCounts.resolvedRequests || 0;

  const visibleAuditEvents = auditEvents.filter((event) =>
    `${event.action || ''} ${event.actorEmail || ''} ${event.targetEmail || ''} ${JSON.stringify(event.details || {})} ${event.createdAt || ''}`
      .toLowerCase().includes(activitySearch.toLowerCase())
  );

  async function deleteAuditEvent(event) {
    if (!window.confirm(`Move this ${event.action.replaceAll('_', ' ')} activity record to deleted history? You can restore it later by date range.`)) return;
    setDeletingAuditId(event.id); setError(''); setNotice('');
    try {
      const result = await platformOwnerRequest(`/audit/${event.id}`, { method: 'DELETE' });
      await loadAudit();
      setNotice(result.message || 'Activity record deleted.');
    } catch (requestError) { setError(requestError.message || 'Could not delete activity record.'); }
    finally { setDeletingAuditId(null); }
  }

  async function deleteAllAudit() {
    if (!auditEvents.length || !window.confirm('Move all recent access activity to deleted history? You can restore records later by date range.')) return;
    setDeletingAllAudit(true); setError(''); setNotice('');
    try {
      const result = await platformOwnerRequest('/audit', { method: 'DELETE' });
      await loadAudit();
      setNotice(result.message || 'All activity records deleted.');
    } catch (requestError) { setError(requestError.message || 'Could not delete activity records.'); }
    finally { setDeletingAllAudit(false); }
  }

  async function updateSupportRequest(request, status) {
    setUpdatingRequestId(request.id); setError(''); setNotice('');
    try {
      const result = await platformOwnerRequest(`/support-requests/${request.id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      setNotice(result.message || 'Support request updated.');
      setSelectedRequestIds(current => current.filter(id => id !== request.id));
      await Promise.all([loadOwnerInbox(), loadAudit()]);
    } catch (requestError) { setError(requestError.message || 'Could not update support request.'); }
    finally { setUpdatingRequestId(null); }
  }

  async function deleteSupportRequest(request) {
    if (!window.confirm(`Move the ${request.status} request from ${request.name} to deleted requests? You can restore it later.`)) return;
    setUpdatingRequestId(request.id); setError(''); setNotice('');
    try {
      const result = await platformOwnerRequest(`/support-requests/${request.id}`, { method: 'DELETE' });
      setNotice(result.message || 'Request moved to deleted requests.');
      setSelectedRequestIds(current => current.filter(id => id !== request.id));
      await Promise.all([loadOwnerInbox(), loadAudit()]);
    } catch (requestError) { setError(requestError.message || 'Could not delete the support request.'); }
    finally { setUpdatingRequestId(null); }
  }

  async function restoreSupportRequest(request) {
    setUpdatingRequestId(request.id); setError(''); setNotice('');
    try {
      const result = await platformOwnerRequest('/support-requests/bulk-action', { method: 'POST', body: JSON.stringify({ action: 'restore', ids: [request.id] }) });
      setNotice(result.message || 'Support request restored.');
      await Promise.all([loadOwnerInbox(), loadAudit()]);
    } catch (requestError) { setError(requestError.message || 'Could not restore the support request.'); }
    finally { setUpdatingRequestId(null); }
  }

  async function runSupportRequestBulkAction(action) {
    const ids = visibleSupportRequests.filter(request => selectedRequestIds.includes(request.id)).map(request => request.id);
    if (!ids.length) return;
    if (action === 'delete' && !window.confirm(`Move ${ids.length} selected request${ids.length === 1 ? '' : 's'} to deleted requests? You can restore them later.`)) return;
    setBulkRequestBusy(true); setError(''); setNotice('');
    try {
      const result = await platformOwnerRequest('/support-requests/bulk-action', { method: 'POST', body: JSON.stringify({ action, ids }) });
      setNotice(result.message || (action === 'restore' ? 'Selected requests restored.' : 'Selected requests updated.'));
      setSelectedRequestIds([]);
      await Promise.all([loadOwnerInbox(), loadAudit()]);
    } catch (requestError) { setError(requestError.message || 'Could not update the selected requests.'); }
    finally { setBulkRequestBusy(false); }
  }

  async function sendBulkSupportResponse(event) {
    event.preventDefault();
    const ids = selectedVisibleSupportRequests.filter(request => request.status === 'open').map(request => request.id);
    if (!ids.length || ids.length > 50 || responseDraft.trim().length < 3) return;
    setResponseBusy(true); setError(''); setNotice('');
    try {
      const result = await platformOwnerRequest('/support-requests/respond', { method: 'POST', body: JSON.stringify({ ids, message: responseDraft.trim() }) });
      if (!result.sent) throw new Error(result.message || 'No responses were delivered. Check the contact email settings and retry.');
      const failedRecipients = (result.failures || []).map(item => item.email).join(', ');
      setNotice(`${result.message || `${result.sent} response(s) sent.`}${failedRecipients ? ` Failed recipients: ${failedRecipients}.` : ''}`);
      setResponseDialogOpen(false); setResponseDraft(''); setSelectedRequestIds([]);
      await Promise.all([loadOwnerInbox(), loadAudit()]);
    } catch (requestError) { setError(requestError.message || 'Could not send responses.'); }
    finally { setResponseBusy(false); }
  }

  async function restoreAuditRange(event) {
    event.preventDefault();
    if (!restoreAuditFrom || !restoreAuditTo || restoreAuditFrom > restoreAuditTo) return;
    setRestoringAudit(true); setError(''); setNotice('');
    try {
      const result = await platformOwnerRequest('/audit/restore', { method: 'POST', body: JSON.stringify({ from: restoreAuditFrom, to: restoreAuditTo, timezoneOffset: new Date().getTimezoneOffset() }) });
      setNotice(result.message || `${result.restored} activity records restored.`);
      setRestoreAuditOpen(false);
      await loadAudit();
    } catch (requestError) { setError(requestError.message || 'Could not restore deleted activity.'); }
    finally { setRestoringAudit(false); }
  }

  function openInvitationRolePicker(request) {
    const savedRoles = (request.adminRoles || []).filter((role) => role !== 'platform_owner' && standardAdminRoles.some(([value]) => value === role));
    setInvitationRoles(savedRoles.length ? savedRoles : ['portfolio_owner']);
    setInvitationRequest(request);
  }

  async function inviteFromRequest(request, selectedRoles = null) {
    setUpdatingRequestId(request.id); setError(''); setNotice('');
    try {
      const result = await platformOwnerRequest(`/support-requests/${request.id}/invite`, { method: 'POST', body: JSON.stringify(selectedRoles ? { roles: selectedRoles } : {}) });
      setNotice(result.message || `Setup link sent to ${request.email}.`);
      setInvitationRequest(null);
      await Promise.all([loadOwnerInbox(), loadAdmins(1, search, statusFilter), loadAudit()]);
    } catch (requestError) { setError(requestError.message || 'Could not send the setup invitation.'); }
    finally { setUpdatingRequestId(null); }
  }

  useEffect(() => {
    let current = true;
    (async () => {
      try {
        const response = await apiFetch('/auth/me', { credentials: 'include', headers: sessionToken() ? { Authorization: `Bearer ${sessionToken()}` } : undefined });
        if (response.status === 401) { window.location.replace('/admin/login?next=/platform/owner'); return; }
        const result = await response.json();
        if (!(result.user?.roles || [result.user?.role]).includes('platform_owner')) { setError('This console is available only to the super-admin account.'); setLoading(false); return; }
        if (current) setOwner(result.user);
      } catch (requestError) {
        if (current) setError(requestError.message || 'Could not verify super-admin access.');
      } finally {
        if (current) setLoading(false);
      }
    })();
    return () => { current = false; };
  }, []);

  useEffect(() => {
    try { window.localStorage.setItem('kade-owner-theme', theme); } catch { /* Private browsing can refuse storage. */ }
  }, [theme]);

  useEffect(() => {
    if (!owner) return;
    let current = true;
    Promise.all([loadAudit(), loadOwnerInbox()]).catch((requestError) => { if (current) setError(requestError.message || 'Could not load owner activity.'); });
    return () => { current = false; };
  }, [owner, loadAudit, loadOwnerInbox]);

  useEffect(() => {
    if (!owner) return undefined;
    const refreshWhenVisible = () => {
      if (!document.hidden) refreshInbox().catch(() => {});
    };
    const timer = window.setInterval(refreshWhenVisible, 5000);
    window.addEventListener('focus', refreshWhenVisible);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    window.addEventListener('admin-messages-read', refreshWhenVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refreshWhenVisible);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      window.removeEventListener('admin-messages-read', refreshWhenVisible);
    };
  }, [owner, refreshInbox]);

  useEffect(() => {
    if (!owner) return undefined;
    const timer = window.setInterval(() => {
      if (!document.hidden) loadAudit().catch(() => {});
    }, 30000);
    return () => window.clearInterval(timer);
  }, [owner, loadAudit]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 250);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (!owner) return;
    loadAdmins(page, search, statusFilter).catch((requestError) => setError(requestError.message));
  }, [owner, page, search, statusFilter, loadAdmins]);

  async function submitInvite(event) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      const result = await platformOwnerRequest('/admins', { method: 'POST', body: JSON.stringify(form) });
      setNotice(result.message || 'Invitation sent.');
      setForm({ displayName: '', email: '', phone: '', roles: ['portfolio_owner'] });
      setSearchInput(''); setSearch(''); setStatusFilter('all'); setPage(1);
      await loadAdmins(1, '', 'all');
      await loadAudit();
      document.getElementById('invite-admin')?.removeAttribute('open');
    } catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  }

  async function updateAdmin(id, path, body, success) {
    setBusy(true); setError(''); setNotice('');
    const previousAdmin = admins.find(admin => String(admin.id) === String(id));
    if (path === 'status' && previousAdmin) {
      setAdmins(current => current.map(admin => String(admin.id) === String(id) ? { ...admin, status: body.status } : admin));
      setCounts(current => ({
        ...current,
        [previousAdmin.status]: Math.max(0, current[previousAdmin.status] - 1),
        [body.status]: current[body.status] + 1
      }));
    }
    try {
      const method = path === 'password-reset' ? 'POST' : path === 'delete' ? 'DELETE' : 'PATCH';
      const result = await platformOwnerRequest(`/admins/${id}${path === 'delete' ? '' : `/${path}`}`, { method, ...(body ? { body: JSON.stringify(body) } : {}) });
      setNotice(result.message || success);
      if (path === 'roles') setEditingRolesId(null);
      if (result.admin) {
        setAdmins(current => current.map(admin => String(admin.id) === String(id)
          ? { ...admin, ...result.admin, ...(path === 'status' ? { status: body.status } : {}) }
          : admin));
      }
      if (path === 'delete') {
        setAdmins(current => current.filter(admin => admin.id !== id));
        setCounts(current => ({ ...current, total: Math.max(0, current.total - 1) }));
      }
      try {
        // Keep a status-updated row where it is in the All accounts view. The
        // API sorts active accounts first, so reloading here would move the row
        // away just after the switch changes and make the action look undone.
        if (path !== 'status' || statusFilter !== 'all') await loadAdmins();
        await loadAudit();
      } catch (refreshError) {
        setError(`The change was saved, but the latest account activity could not be refreshed: ${refreshError.message}`);
      }
    } catch (requestError) {
      if (path === 'status' && previousAdmin) {
        setAdmins(current => current.map(admin => String(admin.id) === String(id) ? { ...admin, status: previousAdmin.status } : admin));
        setCounts(current => ({
          ...current,
          [body.status]: Math.max(0, current[body.status] - 1),
          [previousAdmin.status]: current[previousAdmin.status] + 1
        }));
      }
      setError(requestError.message);
    }
    finally { setBusy(false); }
  }

  async function runBulkAction() {
    if (!bulkAction) return;
    if (bulkAction !== 'assign_roles_all' && bulkPhrase !== bulkActionInfo[bulkAction]?.phrase) return;
    if (bulkAction === 'assign_roles_all' && (!bulkRoles.length || bulkRoles.some((role) => !roles.some(([value]) => value === role)))) {
      setError('Choose at least one valid role to assign.');
      return;
    }
    setBulkBusy(true); setError(''); setNotice('');
    try {
      const result = await platformOwnerRequest('/admins/bulk-action', {
        method: 'POST',
        body: JSON.stringify(bulkAction === 'assign_roles_all' ? { action: bulkAction, roles: bulkRoles } : { action: bulkAction })
      });
      setNotice(result.message || 'Bulk action completed.');
      setBulkAction(''); setBulkPhrase(''); setBulkRoles(['portfolio_owner']);
      await Promise.all([loadAdmins(), loadAudit()]);
    } catch (requestError) {
      setError(requestError.message || 'Could not complete the bulk action.');
    } finally {
      setBulkBusy(false);
    }
  }

  async function restoreDeletedAdmins(ids = selectedDeletedAdminIds) {
    if (!ids.length) return;
    setBulkBusy(true); setError(''); setNotice('');
    try {
      const result = await platformOwnerRequest('/admins/restore', { method: 'POST', body: JSON.stringify({ ids }) });
      setNotice(result.message || 'Administrator accounts restored.');
      setSelectedDeletedAdminIds([]);
      await Promise.all([loadAdmins(1, search, statusFilter), loadDeletedAdmins(), loadAudit()]);
    } catch (requestError) { setError(requestError.message || 'Could not restore administrator accounts.'); }
    finally { setBulkBusy(false); }
  }

  async function signOut() {
    try {
      await apiFetch('/auth/logout', { method: 'POST', credentials: 'include', headers: sessionToken() ? { Authorization: `Bearer ${sessionToken()}` } : undefined });
    } finally {
      try { window.sessionStorage.removeItem('kade-admin-session-token'); } catch { /* Continue to the public homepage. */ }
      window.location.replace('/');
    }
  }

  const positionAccountMenu = useCallback(() => {
    const trigger = accountMenuRef.current?.querySelector('.owner-sidebar-signout');
    if (!trigger) return;
    const bounds = trigger.getBoundingClientRect();
    const width = Math.min(280, window.innerWidth - 24);
    const height = 132;
    let left = railCollapsed ? bounds.right + 8 : bounds.left;
    if (left + width > window.innerWidth - 12) left = bounds.left - width - 8;
    left = Math.max(12, Math.min(left, window.innerWidth - width - 12));
    let top = bounds.bottom - height;
    if (top < 12) top = Math.min(bounds.top + 8, window.innerHeight - height - 12);
    top = Math.max(12, Math.min(top, window.innerHeight - height - 12));
    setAccountMenuPosition({ top, left });
  }, [railCollapsed]);

  useEffect(() => { if (accountMenuOpen) positionAccountMenu(); }, [accountMenuOpen, positionAccountMenu]);
  useEffect(() => {
    if (!accountMenuOpen) return undefined;
    const closeOnOutside = (event) => { if (!accountMenuRef.current?.contains(event.target)) setAccountMenuOpen(false); };
    const closeOnEscape = (event) => { if (event.key === 'Escape') { setAccountMenuOpen(false); accountMenuRef.current?.querySelector('.owner-sidebar-signout')?.focus(); } };
    document.addEventListener('pointerdown', closeOnOutside);
    window.addEventListener('keydown', closeOnEscape);
    window.addEventListener('resize', positionAccountMenu);
    window.visualViewport?.addEventListener('resize', positionAccountMenu);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside);
      window.removeEventListener('keydown', closeOnEscape);
      window.removeEventListener('resize', positionAccountMenu);
      window.visualViewport?.removeEventListener('resize', positionAccountMenu);
    };
  }, [accountMenuOpen, positionAccountMenu]);

  if (loading) return <main className="owner-page owner-loading">Checking super-admin access…</main>;
  if (!owner) return <main className="owner-page"><section className="owner-card owner-denied"><h1>Super-admin access required</h1><p>{error || 'Sign in with the super-admin account to continue.'}</p><a className="owner-button owner-button-primary" href="/admin/login?next=/platform/owner&force=1">Go to sign in</a></section></main>;
  return <main className={`owner-page owner-console${messagesView ? ' owner-messages-page' : ''}${railCollapsed ? ' owner-rail-collapsed' : ''}`} data-theme={theme}>
    <aside className={`owner-sidebar${navOpen ? ' is-nav-open' : ''}`} aria-label="Platform owner navigation">
      <div className="owner-sidebar-top">
        <a className="owner-brand" href="/platform/owner"><span className="owner-brand-icon"><i className="fas fa-shield-halved" /></span><span>Platform Owner<small>Owner console</small></span></a>
        <button className="owner-rail-toggle" type="button" aria-pressed={railCollapsed} aria-label={railCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={railCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} onClick={() => setRailCollapsed((collapsed) => !collapsed)}><i className={`fas ${railCollapsed ? 'fa-angles-right' : 'fa-angles-left'}`} /></button>
        <button className="owner-nav-toggle" type="button" aria-expanded={navOpen} aria-controls="owner-sidebar-nav" aria-label={navOpen ? 'Close navigation' : 'Open navigation'} title={navOpen ? 'Close navigation' : 'Open navigation'} onClick={() => { setNavOpen((open) => !open); if (navOpen) { setToolsOpen(false); setHelpOpen(false); } }}><i className={`fas ${navOpen ? 'fa-xmark' : 'fa-bars'}`} /></button>
      </div>
      {navOpen && <button className="owner-nav-backdrop" type="button" aria-label="Close navigation" onClick={() => setNavOpen(false)} />}
      <nav id="owner-sidebar-nav" className="owner-sidebar-nav">
        <div className="owner-mobile-nav-heading"><p className="owner-sidebar-label">WORKSPACE</p></div>
        <a className={`owner-super-overview${!directoryView && !requestsView && !messagesView ? ' is-current' : ''}`} href="/platform/owner" title="Overview" onClick={collapseOwnerNavigation}><i className="fas fa-circle-check" /><span>Overview</span></a>
        <a className={directoryView ? 'is-current' : ''} href={newAuditCount ? '#recent-activity' : '#admin-directory'} title={newAuditCount ? `Recent activity: ${newAuditCount} new changes` : 'Admin accounts'} onClick={() => { try { window.localStorage.setItem('kade-owner-audit-last-seen', String(Date.now())); } catch { /* Keep navigation available without storage. */ } setNewAuditCount(0); collapseOwnerNavigation(); }}><i className="fas fa-users-gear" /><span>Admin accounts</span>{(newAuditCount + (counts.pending || 0)) > 0 && <span className={`owner-sidebar-count owner-sidebar-alert${newAuditCount ? ' has-new' : ''}`} aria-label={`${newAuditCount} new activity changes and ${counts.pending || 0} pending administrators`}>{newAuditCount + (counts.pending || 0)}</span>}</a>
        <a className={requestsView ? 'is-current' : ''} href="#requests" title={`${inboxCounts.requests} open support requests`} onClick={collapseOwnerNavigation}><i className="fas fa-life-ring" /><span>Requests</span>{inboxCounts.requests > 0 && <span className="owner-sidebar-count owner-sidebar-alert" aria-label={`${inboxCounts.requests} open support requests`}>{inboxCounts.requests}</span>}</a>
        <a className={messagesView ? 'is-current' : ''} href="#messages" title={`${inboxCounts.messages} unread messages`} onClick={collapseOwnerNavigation}><i className="fas fa-comment" /><span>Chat</span>{inboxCounts.messages > 0 && <span className="owner-sidebar-unread-badge" aria-label={`${inboxCounts.messages} unread messages`}>{inboxCounts.messages > 99 ? '99+' : inboxCounts.messages}</span>}</a>
        <a href="/admin" title="Portfolio workspace" onClick={collapseOwnerNavigation}><i className="fas fa-briefcase" /><span>Portfolio workspace</span></a>
        <div className={`owner-tools-menu owner-sidebar-tools${toolsOpen ? ' is-open' : ''}`}>
          <button className="owner-tools-button" type="button" aria-expanded={toolsOpen} aria-label={toolsOpen ? 'Close workspace tools' : 'Open workspace tools'} title="Workspace tools" onClick={() => { setToolsOpen((open) => !open); setHelpOpen(false); }}><i className={`fas ${toolsOpen ? 'fa-xmark' : 'fa-sliders'}`} aria-hidden="true" /><span>Tools</span></button>
          {toolsOpen && <div id="owner-tools-panel" className="owner-tools-panel" role="menu" aria-label="Workspace links">
            <div className="owner-tools-heading-row"><p className="owner-tools-heading">MORE PAGES &amp; TOOLS</p><button type="button" className="owner-dropdown-close" aria-label="Close workspace tools" title="Close" onClick={() => setToolsOpen(false)}><i className="fas fa-xmark" aria-hidden="true" /></button></div>
            <button type="button" role="menuitem" disabled title="Coming soon"><i className="fas fa-gear" /> Settings</button>
            <button type="button" role="menuitem" disabled title="Coming soon"><i className="fas fa-credit-card" /> Plans &amp; billing</button>
            <button type="button" role="menuitem" disabled title="Coming soon"><i className="fas fa-building-user" /> Customers</button>
            <button type="button" role="menuitem" disabled title="Coming soon"><i className="fas fa-chart-line" /> Reports</button>
            <button type="button" role="menuitem" onClick={() => { setToolsOpen(false); setHelpOpen(true); setHelpPage('guide'); }}><i className="fas fa-book" /> Documentation</button>
            <button type="button" role="menuitem" onClick={() => { setToolsOpen(false); setHelpOpen(true); setHelpPage('faq'); }}><i className="fas fa-circle-question" /> Help &amp; FAQ</button>
          </div>}
          {helpOpen && <div className="owner-tools-panel owner-help-panel" role="dialog" aria-label="Help and frequently asked questions">
            <div className="owner-help-heading"><strong>{helpPage === 'guide' ? 'Documentation' : 'Help & FAQ'}</strong><button type="button" aria-label="Close help" title="Close" onClick={() => setHelpOpen(false)}><i className="fas fa-xmark" /></button></div>
            <div className="owner-help-tabs" role="tablist">
              <button type="button" role="tab" aria-selected={helpPage === 'guide'} className={helpPage === 'guide' ? 'is-active' : ''} onClick={() => setHelpPage('guide')}>How it works</button>
              <button type="button" role="tab" aria-selected={helpPage === 'faq'} className={helpPage === 'faq' ? 'is-active' : ''} onClick={() => setHelpPage('faq')}>FAQ</button>
            </div>
            {helpPage === 'guide' ? ownerHelpGuide.map((section) => <article key={section.title}><strong>{section.title}</strong><p>{section.body}</p></article>) : chatHelpTopics.map((topic) => <article key={topic.title}><strong>{topic.title}</strong><p>{topic.body}</p></article>)}
          </div>}
        </div>
        <button className="owner-mobile-theme-trigger" type="button" aria-pressed={theme === 'dark'} onClick={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')}><i className={`fas ${theme === 'dark' ? 'fa-sun' : 'fa-moon'}`} aria-hidden="true" /><span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span></button>
        <div className="owner-account-menu" ref={accountMenuRef}>
          <button className="owner-sidebar-signout" type="button" title="Account menu" aria-label="Open account menu" aria-controls="owner-account-menu-panel" aria-haspopup="dialog" aria-expanded={accountMenuOpen} onClick={() => { if (accountMenuOpen) setAccountMenuOpen(false); else { positionAccountMenu(); setAccountMenuOpen(true); } }}><LogoutIcon /><span>Sign out</span></button>
          {accountMenuOpen && <section id="owner-account-menu-panel" className="owner-account-menu-panel" role="dialog" aria-label="Signed-in account and logout" style={{ top: `${accountMenuPosition.top}px`, left: `${accountMenuPosition.left}px` }}>
            <div className="owner-account-menu-profile"><span className="owner-account-avatar" aria-hidden="true">{owner.displayName?.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()}</span><span><strong>{owner.displayName}</strong><small>{owner.email}</small></span></div>
            <button className="owner-account-menu-logout" type="button" onClick={signOut}><LogoutIcon /> Log out</button>
          </section>}
        </div>
      </nav>
    </aside>
    <div className="owner-main">
    <section className="owner-welcome"><div className="owner-welcome-heading"><div><p className="owner-eyebrow">{requestsView ? 'SYSTEM SUPPORT' : messagesView ? 'CHAT ROOM' : directoryView ? 'ADMIN ACCESS' : 'CONTROL CENTER'}</p><h1>{requestsView ? 'Support requests' : messagesView ? 'Chat' : directoryView ? 'Manage administrator access' : `Welcome, ${owner.displayName}`}</h1><p>{requestsView ? 'Review sign-in, account activation, setup-link, and password-recovery issues reported by administrators.' : messagesView ? 'Chat with admins across both admin workspaces, including other super-admins.' : directoryView ? 'Invite administrators, set their roles, manage account access, and review recent security activity.' : 'This is your owner dashboard. Get a quick overview, then open Admin accounts to manage invitations, roles, password links, and activity.'}</p></div><div className="owner-top-corner">
        {directoryView && <details className="owner-invite" id="invite-admin"><summary><i className="fas fa-user-plus" /> Invite administrator</summary><form onSubmit={submitInvite}>
      <div className="owner-invite-heading"><div><strong>Invite an administrator</strong><small>Send a secure setup link after confirming the customer’s payment.</small></div><button className="owner-invite-close" type="button" aria-label="Close invitation form" title="Close" onClick={() => { document.getElementById('invite-admin')?.removeAttribute('open'); }}><i className="fas fa-xmark" /></button></div>
      <label>Full name<input required maxLength="120" value={form.displayName} onChange={e => setForm({ ...form, displayName: e.target.value })} /></label>
      <label>Email address<input required type="email" maxLength="254" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></label>
      <label>Phone <span>(optional)</span><input maxLength="40" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></label>
      <div className="owner-invite-role-field"><span>Access roles</span><details className="owner-role-dropdown owner-invite-role-dropdown"><summary>{form.roles.length ? `${form.roles.length} role${form.roles.length === 1 ? '' : 's'} selected` : 'Choose roles'} <i className="fas fa-chevron-down" aria-hidden="true" /></summary><div className="owner-role-dropdown-panel"><fieldset className="owner-role-checks owner-invite-role-checks" aria-label="Select standard admin roles">{standardAdminRoles.map(([value, label]) => <label key={value}><input type="checkbox" checked={form.roles.includes(value)} onChange={event => setForm(current => ({ ...current, roles: updateRoleSelection(current.roles, value, event.target.checked) }))} /> <span>{label}</span></label>)}</fieldset></div></details></div>
      <p className="owner-form-hint">The invitation is sent by email. The admin sets their own password from the one-time link.</p><button className="owner-button owner-button-primary" disabled={busy}>{busy ? 'Sending…' : 'Send invitation'}</button>
    </form></details>}</div></div></section>

    {notice && <TimedNotification message={notice} tone="success" onClose={dismissNotice} />}
    {error && <TimedNotification message={error} tone="error" onClose={dismissError} />}

    {!directoryView && !requestsView && !messagesView && <section className="owner-stat-grid" aria-label="Admin account totals">
      <article className="owner-stat"><span className="owner-stat-icon blue"><i className="fas fa-users" /></span><div><small>All admins</small><strong>{counts.total}</strong></div></article>
      <article className="owner-stat"><span className="owner-stat-icon green"><i className="fas fa-circle-check" /></span><div><small>Active</small><strong>{counts.active}</strong></div></article>
      <article className="owner-stat"><span className="owner-stat-icon amber"><i className="fas fa-hourglass-half" /></span><div><small>Pending invitations</small><strong>{counts.pending}</strong></div></article>
      <article className="owner-stat"><span className="owner-stat-icon gray"><i className="fas fa-user-slash" /></span><div><small>Inactive</small><strong>{counts.inactive}</strong></div></article>
    </section>}

    {!directoryView && !requestsView && !messagesView && <section className="owner-card owner-guide"><div><p className="owner-eyebrow">HOW IT WORKS</p><h2>Manage rented administrator access</h2><p>Review a new administrator’s ticket and requested roles, then send their one-time setup link. The requester chooses the access they need; you can later manage that access or send account-recovery links.</p><a className="owner-button owner-button-primary" href="#admin-directory"><i className="fas fa-users-gear" /> Open Admin accounts</a></div><div className="owner-guide-steps"><article><span>01</span><div><strong>Review request</strong><small>Check the requester’s details and selected roles.</small></div></article><article><span>02</span><div><strong>Send setup link</strong><small>The new administrator creates their password.</small></div></article><article><span>03</span><div><strong>Manage access</strong><small>Review account status and security activity.</small></div></article></div></section>}

    {requestsView && <section className="owner-card owner-requests" id="support-requests">
      <header className="owner-requests-heading"><div><p className="owner-eyebrow">ADMIN SUPPORT INBOX</p><h2>{requestStatusView === 'open' ? 'Open requests' : 'Resolved request history'}</h2><p>Sending or resending a link leaves the request open. Invitation and setup requests resolve only after setup is complete and the account is active. Password-reset and sign-in requests resolve after the related action succeeds.</p></div><span className="owner-audit-count">{inboxCounts.requests} open</span></header>
      <div className="owner-request-toolbar">
        <div className="owner-request-tabs" role="tablist" aria-label="Support request status">
          <button type="button" role="tab" aria-selected={requestStatusView === 'open'} className={requestStatusView === 'open' ? 'is-current' : ''} onClick={() => { setRequestStatusView('open'); setSelectedRequestIds([]); }}>Open <span>{inboxCounts.requests}</span></button>
          <button type="button" role="tab" aria-selected={requestStatusView === 'resolved'} className={requestStatusView === 'resolved' ? 'is-current' : ''} onClick={() => { setRequestStatusView('resolved'); setSelectedRequestIds([]); }}>Resolved <span>{resolvedSupportRequestCount}</span></button>
          <button type="button" role="tab" aria-selected={requestStatusView === 'deleted'} className={requestStatusView === 'deleted' ? 'is-current' : ''} onClick={() => { setRequestStatusView('deleted'); setSelectedRequestIds([]); }}>Deleted <span>{inboxCounts.deletedRequests || 0}</span></button>
        </div>
        <label className="owner-request-search"><i className="fas fa-magnifying-glass" aria-hidden="true" /><input type="search" placeholder="Search requester, email, or request" value={requestSearch} onChange={event => setRequestSearch(event.target.value)} /></label>
        <div className="owner-request-bulk"><span>{selectedVisibleSupportRequests.length} selected</span>{requestStatusView === 'open' && <><button type="button" disabled={bulkRequestBusy || responseBusy || !selectedVisibleSupportRequests.length || selectedVisibleSupportRequests.length > 50} title={selectedVisibleSupportRequests.length > 50 ? 'Select up to 50 tickets per response.' : 'Send a response to every selected open ticket.'} onClick={() => { setResponseDraft(''); setResponseDialogOpen(true); }}>Send response{selectedVisibleSupportRequests.length ? ` (${selectedVisibleSupportRequests.length})` : ''}</button><button type="button" disabled={bulkRequestBusy || !selectedVisibleSupportRequests.length || selectedVisibleSupportRequests.some(request => request.category === 'admin_invitation' || (request.category === 'setup_link' && request.adminStatus !== 'active'))} title="Invitation and setup requests stay open until the account is active." onClick={() => runSupportRequestBulkAction('resolve')}>{bulkRequestBusy ? 'Working...' : 'Resolve selected'}</button></>}{requestStatusView === 'deleted' ? <button type="button" disabled={bulkRequestBusy || !selectedVisibleSupportRequests.length} onClick={() => runSupportRequestBulkAction('restore')}>{bulkRequestBusy ? 'Working...' : 'Restore selected'}</button> : <button type="button" className="is-danger" disabled={bulkRequestBusy || !selectedVisibleSupportRequests.length} onClick={() => runSupportRequestBulkAction('delete')}>{bulkRequestBusy ? 'Working...' : 'Delete selected'}</button>}</div>
      </div>
      {visibleSupportRequests.length ? <div className="owner-request-table-scroll"><table className="owner-request-table"><thead><tr><th className="owner-request-select"><input type="checkbox" aria-label="Select all visible requests" checked={visibleSupportRequests.length > 0 && visibleSupportRequests.every(request => selectedRequestIds.includes(request.id))} onChange={event => setSelectedRequestIds(current => event.target.checked ? [...new Set([...current, ...visibleSupportRequests.map(request => request.id)])] : current.filter(id => !visibleSupportRequests.some(request => request.id === id)))} /></th><th>Requester</th><th>Request</th><th>Status</th><th>Details</th><th>Submitted</th><th>{requestStatusView === 'resolved' ? 'Resolved' : requestStatusView === 'deleted' ? 'Deleted' : 'Action'}</th></tr></thead><tbody>{visibleSupportRequests.map(request => <tr key={request.id}>
        <td className="owner-request-select"><input type="checkbox" aria-label={`Select request from ${request.name}`} checked={selectedRequestIds.includes(request.id)} onChange={event => setSelectedRequestIds(current => event.target.checked ? [...new Set([...current, request.id])] : current.filter(id => id !== request.id))} /></td>
        <td className="owner-request-person"><strong>{request.name}</strong><a href={`mailto:${request.email}`}>{request.email}</a></td>
        <td className="owner-request-request"><ExpandableCell className="owner-request-request-content"><span className="owner-request-category">{supportCategoryLabels[request.category] || request.category.replaceAll('_', ' ')}</span>{request.category === 'admin_invitation' && request.requestedRoles?.length > 0 && <span className="owner-request-role-list">Requested roles: {request.requestedRoles.map(role => standardAdminRoles.find(([value]) => value === role)?.[1] || role).join(', ')}</span>}{request.responseCount > 0 && <span className="owner-request-role-list">{request.responseCount} response{request.responseCount === 1 ? '' : 's'} sent</span>}</ExpandableCell></td>
        <td><span className={`owner-request-status ${requestStatusView === 'deleted' ? 'deleted' : request.status}`}>{requestStatusView === 'deleted' ? 'Deleted' : request.status === 'open' ? 'Open' : 'Resolved'}</span></td>
        <td className="owner-request-message"><RequestDetails message={request.message} /></td>
        <td><time>{formatActivityTime(request.createdAt)}</time></td>
        <td><div className="owner-request-actions">{requestStatusView === 'deleted' ? <div className="owner-request-action-buttons"><button className="owner-action-button" type="button" disabled={updatingRequestId === request.id} onClick={() => restoreSupportRequest(request)}>Restore</button></div> : request.status === 'open' ? <div className="owner-request-action-buttons">{request.category === 'admin_invitation' && request.adminStatus !== 'active' && <button className="owner-action-button owner-invite-request" type="button" disabled={updatingRequestId === request.id} onClick={() => inviteFromRequest(request)}>{updatingRequestId === request.id ? 'Sending...' : request.adminStatus === 'pending' ? 'Resend setup link' : request.adminStatus === 'inactive' ? 'Restore account & send reset link' : 'Approve & send setup link'}</button>}{request.category === 'setup_link' && request.adminStatus === 'inactive' && <button className="owner-action-button owner-invite-request" type="button" disabled={updatingRequestId === request.id} onClick={() => inviteFromRequest(request)}>Restore account &amp; send reset link</button>}{request.category === 'setup_link' && request.adminStatus === 'pending' && <button className="owner-action-button owner-invite-request" type="button" disabled={updatingRequestId === request.id} onClick={() => inviteFromRequest(request)}>{updatingRequestId === request.id ? 'Sending…' : 'Resend setup link'}</button>}{request.category === 'setup_link' && !request.adminStatus && <button className="owner-action-button owner-invite-request" type="button" disabled={updatingRequestId === request.id} onClick={() => openInvitationRolePicker(request)}>Create account &amp; send setup link</button>}{(request.category !== 'admin_invitation' && request.category !== 'setup_link' || request.adminStatus === 'active') && <button className="owner-action-button" type="button" disabled={updatingRequestId === request.id} onClick={() => updateSupportRequest(request, 'resolved')}>{updatingRequestId === request.id ? 'Saving…' : 'Mark resolved'}</button>}<button className="owner-action-button delete" type="button" disabled={updatingRequestId === request.id} onClick={() => deleteSupportRequest(request)}>Delete</button></div> : <><time>{formatActivityTime(request.resolvedAt)}</time><div className="owner-request-action-buttons"><button className="owner-action-button" type="button" disabled={updatingRequestId === request.id} onClick={() => updateSupportRequest(request, 'open')}>Reopen</button><button className="owner-action-button delete" type="button" disabled={updatingRequestId === request.id} onClick={() => deleteSupportRequest(request)}>Delete</button></div></>}</div></td>
      </tr>)}</tbody></table></div> : <div className="owner-request-empty"><i className={`fas ${requestStatusView === 'open' ? 'fa-circle-check' : 'fa-box-archive'}`} aria-hidden="true" /><strong>{requestStatusView === 'open' ? 'No open support requests' : requestStatusView === 'deleted' ? 'No deleted requests' : 'No resolved requests yet'}</strong><span>{requestStatusView === 'open' ? 'New requests will appear here. Resolved items remain available in the Resolved tab.' : requestStatusView === 'deleted' ? 'Requests you delete stay here until you restore them.' : 'Requests appear here after their issue is completed or marked resolved.'}</span></div>}
    </section>}

    {messagesView && <div id="owner-messages" className="owner-messages-view"><OwnerMessages onMessagesChanged={refreshInbox} ownerId={owner?.id} ownerEmail={owner?.email} /></div>}

    {directoryView && <>
    <section className="owner-stat-grid owner-directory-stats" aria-label="Admin account totals">
      <article className="owner-stat"><span className="owner-stat-icon blue"><i className="fas fa-users" /></span><div><small>All admins</small><strong>{counts.total}</strong></div></article>
      <article className="owner-stat"><span className="owner-stat-icon green"><i className="fas fa-circle-check" /></span><div><small>Active</small><strong>{counts.active}</strong></div></article>
      <article className="owner-stat"><span className="owner-stat-icon amber"><i className="fas fa-hourglass-half" /></span><div><small>Pending invitations</small><strong>{counts.pending}</strong></div></article>
      <article className="owner-stat"><span className="owner-stat-icon gray"><i className="fas fa-user-slash" /></span><div><small>Inactive</small><strong>{counts.inactive}</strong></div></article>
    </section>

    <section className="owner-card owner-directory" id="admin-directory"><div className="owner-section-heading"><div><p className="owner-eyebrow">ACCOUNT ACCESS</p><h2>Administrators</h2></div><span>{counts.total} accounts</span></div>
      <div className="owner-bulk-actions" aria-label="Bulk administrator actions">
        <span>Bulk actions <small>Customer admins only</small></span>
        <button type="button" className="bulk-activate" disabled={busy || bulkBusy || !counts.total} onClick={() => { setBulkPhrase(''); setBulkAction('activate_all'); }}><i className="fas fa-user-check" /> Activate all</button>
        <button type="button" className="bulk-deactivate" disabled={busy || bulkBusy || !counts.total} onClick={() => { setBulkPhrase(''); setBulkAction('deactivate_all'); }}><i className="fas fa-user-slash" /> Deactivate all</button>
        <button type="button" className="bulk-reset" disabled={busy || bulkBusy || !counts.total} onClick={() => { setBulkPhrase(''); setBulkAction('reset_passwords'); }}><i className="fas fa-key" /> Reset passwords all</button>
        <button type="button" className="bulk-assign-roles" disabled={busy || bulkBusy || !counts.total} onClick={() => { setBulkPhrase(''); setBulkRoles(['portfolio_owner']); setBulkAction('assign_roles_all'); }}><i className="fas fa-user-tag" /> Assign roles all</button>
        <button type="button" className="bulk-delete" disabled={busy || bulkBusy || !counts.total} onClick={() => { setBulkPhrase(''); setBulkAction('delete_all'); }}><i className="fas fa-trash-can" /> Delete all</button>
        <button type="button" className="owner-restore-deleted-button" disabled={busy || bulkBusy || !counts.deleted} onClick={async () => { setDeletedAdminsOpen(value => !value); if (!deletedAdminsOpen) { try { await loadDeletedAdmins(); } catch (requestError) { setError(requestError.message || 'Could not load deleted administrator accounts.'); } } }}><i className="fas fa-rotate-left" /> Restore deleted ({counts.deleted || 0})</button>
      </div>
      {bulkAction && <div className="owner-confirm-backdrop" role="presentation"><form className="owner-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="owner-bulk-title" onSubmit={event => { event.preventDefault(); runBulkAction(); }}>
        <span className={`owner-confirm-icon ${bulkAction === 'delete_all' ? 'danger' : ''}`}><i className={`fas ${bulkAction === 'delete_all' ? 'fa-triangle-exclamation' : bulkAction === 'reset_passwords' ? 'fa-key' : 'fa-users-gear'}`} aria-hidden="true" /></span>
        <h3 id="owner-bulk-title">{bulkActionInfo[bulkAction].title}</h3>
        <p>{bulkActionInfo[bulkAction].detail}</p>
        {bulkAction === 'assign_roles_all' && <fieldset className="owner-role-checks owner-bulk-role-checks" aria-label="Roles to assign to all customer admins"><legend>Roles to assign</legend>{roles.map(([value, label]) => <label key={value}><input type="checkbox" checked={bulkRoles.includes(value)} disabled={bulkBusy || (value !== 'platform_owner' && bulkRoles.includes('platform_owner'))} onChange={event => setBulkRoles(current => updateRoleSelection(current, value, event.target.checked))} /> <span>{label}</span></label>)}<small>Choose one or more roles. Super admin automatically receives every site role.</small></fieldset>}
        {bulkAction !== 'assign_roles_all' && <><label htmlFor="owner-bulk-confirm">Type <strong>{bulkActionInfo[bulkAction].phrase}</strong> to confirm</label>
        <input id="owner-bulk-confirm" autoFocus autoComplete="off" value={bulkPhrase} onChange={event => setBulkPhrase(event.target.value)} /></>}
        <div className="owner-confirm-actions"><button type="button" className="owner-confirm-cancel" disabled={bulkBusy} onClick={() => { setBulkAction(''); setBulkPhrase(''); }}>Cancel</button><button type="submit" className={bulkAction === 'delete_all' ? 'owner-confirm-delete' : 'owner-confirm-submit'} disabled={bulkBusy || (bulkAction !== 'assign_roles_all' && bulkPhrase !== bulkActionInfo[bulkAction].phrase) || (bulkAction === 'assign_roles_all' && !bulkRoles.length)}>{bulkBusy ? 'Working…' : 'Confirm'}</button></div>
      </form></div>}
      {deletedAdminsOpen && <section className="owner-deleted-admins" aria-label="Deleted administrator accounts"><header><div><strong>Deleted administrator accounts</strong><span>Restore access with each account’s previous status.</span></div><div><button type="button" disabled={bulkBusy || !selectedDeletedAdminIds.length} onClick={() => restoreDeletedAdmins()}><i className="fas fa-rotate-left" /> Restore selected ({selectedDeletedAdminIds.length})</button><button type="button" className="owner-deleted-admins-close" onClick={() => setDeletedAdminsOpen(false)} aria-label="Close deleted administrator accounts"><i className="fas fa-xmark" /></button></div></header>{deletedAdmins.length ? <div className="owner-deleted-admin-list">{deletedAdmins.map(admin => <label key={admin.id}><input type="checkbox" checked={selectedDeletedAdminIds.includes(admin.id)} onChange={event => setSelectedDeletedAdminIds(current => event.target.checked ? [...new Set([...current, admin.id])] : current.filter(id => id !== admin.id))} /><span><strong>{admin.displayName}</strong><small>{admin.email} · {admin.status} before deletion</small></span><button type="button" disabled={bulkBusy} onClick={event => { event.preventDefault(); event.stopPropagation(); restoreDeletedAdmins([admin.id]); }}>Restore</button></label>)}</div> : <p>No deleted administrator accounts.</p>}</section>}
      <div className="owner-filters"><label className="owner-search"><i className="fas fa-magnifying-glass" /><input type="search" placeholder="Search by name or email" value={searchInput} onChange={event => setSearchInput(event.target.value)} /></label><label className="owner-status-filter"><span>Status</span><select value={statusFilter} onChange={event => { setStatusFilter(event.target.value); setPage(1); }}><option value="all">All accounts</option><option value="active">Active</option><option value="pending">Pending invitations</option><option value="inactive">Inactive</option></select></label></div>
      <div className="owner-table-wrap"><div className="owner-table-scroll"><table className="owner-table"><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Status</th><th className="owner-actions-heading">Actions</th></tr></thead><tbody>{admins.map(admin => <tr key={admin.id}>
        <td className="owner-name-cell"><strong><ExpandableCell>{admin.displayName}</ExpandableCell></strong></td>
        <td className="owner-email-cell"><ExpandableCell>{admin.email}</ExpandableCell></td>
        <td className="owner-phone-cell"><ExpandableCell>{admin.phone || <span>Not provided</span>}</ExpandableCell></td>
        <td><div className="owner-role-cell">{editingRolesId === admin.id ? <details className="owner-role-dropdown" open><summary>Choose roles <i className="fas fa-chevron-down" aria-hidden="true" /></summary><div className="owner-role-dropdown-panel"><fieldset className="owner-role-checks owner-row-role-checks" aria-label={`Access roles for ${admin.displayName}`}>{roles.map(([value, label]) => <label key={value}><input type="checkbox" checked={draftRoles.includes(value)} disabled={busy || (value !== 'platform_owner' && draftRoles.includes('platform_owner'))} onChange={event => setDraftRoles(current => updateRoleSelection(current, value, event.target.checked))} /> <span>{label}</span></label>)}</fieldset><div className="owner-role-edit-actions"><button type="button" className="owner-role-save" disabled={busy || !draftRoles.length} onClick={() => updateAdmin(admin.id, 'roles', { roles: draftRoles }, 'Roles updated.')}>Confirm</button><button type="button" className="owner-role-cancel" disabled={busy} onClick={() => setEditingRolesId(null)}>Cancel</button></div></div></details> : <>{(admin.roles || [admin.role]).includes('platform_owner') ? <div className="owner-role-badges"><span className="is-super-admin">Super admin (full access)</span></div> : (admin.roles || [admin.role]).length > 1 ? <details className="owner-role-dropdown owner-role-view-dropdown" onToggle={positionRoleViewDropdown}><summary>See roles <i className="fas fa-chevron-down" aria-hidden="true" /></summary><div className="owner-role-dropdown-panel"><div className="owner-role-badges">{(admin.roles || [admin.role]).map(value => <span key={value}>{roles.find(([role]) => role === value)?.[1] || value}</span>)}</div></div></details> : <div className="owner-role-badges">{(admin.roles || [admin.role]).map(value => <span key={value}>{roles.find(([role]) => role === value)?.[1] || value}</span>)}</div>}{String(admin.id) === String(owner?.id) ? <span className="owner-protected-status" title="Your active super-admin account cannot have its roles changed">Current session protected</span> : <button type="button" className="owner-role-edit" disabled={busy} onClick={() => { setDraftRoles(admin.roles || [admin.role]); setEditingRolesId(admin.id); }} title="Edit access roles" aria-label={`Edit access roles for ${admin.displayName}`}><i className="fas fa-pen" /></button>}</>}</div></td>
        <td className={`owner-status-column ${admin.status === 'active' ? 'is-active' : admin.status === 'inactive' ? 'is-inactive' : 'is-pending'}`}><div className="owner-status-cell">{admin.role === 'platform_owner' ? <span className="owner-protected-status">Protected</span> : admin.status === 'pending' ? <span className="owner-status-pill pending">Invitation pending</span> : <><button type="button" role="switch" aria-checked={admin.status === 'active'} aria-label={`${admin.status === 'active' ? 'Deactivate' : 'Activate'} ${admin.displayName}`} className={`owner-status-toggle ${admin.status === 'active' ? 'is-on' : 'is-off'}`} disabled={busy} onClick={() => { const nextStatus = admin.status === 'active' ? 'inactive' : 'active'; updateAdmin(admin.id, 'status', { status: nextStatus }, nextStatus === 'active' ? 'Account activated.' : 'Account deactivated.'); }}><span className="owner-status-toggle-knob" /></button><span className={`owner-status-label ${admin.status}`}>{admin.status === 'active' ? 'Active' : 'Inactive'}</span></>}</div></td>
        <td><div className="owner-row-actions"><button type="button" className="owner-action-button owner-link-action" aria-label={admin.status === 'pending' ? `Resend setup link to ${admin.displayName}` : `Send password reset link to ${admin.displayName}`} disabled={busy || admin.role === 'platform_owner' || admin.status === 'inactive'} title={admin.status === 'inactive' ? 'Activate this account before sending a link' : undefined} onClick={() => updateAdmin(admin.id, 'password-reset', null, admin.status === 'pending' ? 'Setup link sent.' : 'Password reset link sent.')}>{admin.status === 'pending' && <i className="fas fa-paper-plane" aria-hidden="true" />} {admin.status === 'pending' ? 'Resend setup' : 'Reset password'}</button><button type="button" className="owner-action-button delete owner-icon-action" aria-label={`Delete administrator ${admin.displayName}`} title="Move to deleted accounts" disabled={busy || admin.role === 'platform_owner'} onClick={() => { if (window.confirm(`Move ${admin.displayName} (${admin.email}) to deleted accounts? You can restore the account later.`)) updateAdmin(admin.id, 'delete', null, 'Administrator account moved to deleted accounts.'); }}><i className="fas fa-trash-can" aria-hidden="true" /></button></div></td>
      </tr>)}</tbody></table>{admins.length === 0 && <div className="owner-empty"><i className="fas fa-user-magnifying-glass" /><strong>No administrators found</strong><span>Try another search or status filter.</span></div>}</div></div>
      <footer className="owner-pagination"><span>Page {page} of {totalPages}</span><div><button disabled={page <= 1 || busy} onClick={() => setPage(value => Math.max(1, value - 1))}><i className="fas fa-chevron-left" /> Previous</button><button disabled={page >= totalPages || busy} onClick={() => setPage(value => Math.min(totalPages, value + 1))}>Next <i className="fas fa-chevron-right" /></button></div></footer>
    </section>

    <section className="owner-card owner-audit" id="recent-activity" aria-labelledby="owner-audit-title">
      <header className="owner-audit-heading"><div><p className="owner-eyebrow">SECURITY HISTORY</p><h2 id="owner-audit-title">Recent access activity</h2><p>Review administrator actions. Deleted history can be restored by the dates it was removed.</p></div><span className="owner-audit-count">{auditEvents.length} active · {deletedAuditCount} deleted</span></header>
      <div className="owner-audit-body">
        <form className="owner-audit-search" onSubmit={event => { event.preventDefault(); setActivitySearch(activitySearchInput.trim().toLowerCase()); }}>
          <label><i className="fas fa-magnifying-glass" /><input type="search" value={activitySearchInput} onChange={event => { setActivitySearchInput(event.target.value); setActivitySearch(event.target.value.trim().toLowerCase()); }} placeholder="Search activity, admin, or email" aria-label="Search access activity" /></label>
          <button type="submit">Search</button>
          <button className="owner-audit-restore" type="button" disabled={!deletedAuditCount || restoringAudit || deletingAllAudit} onClick={() => setRestoreAuditOpen(true)}>Restore activity</button>
          <button className="owner-audit-delete-all owner-audit-icon-button" type="button" aria-label="Delete all activity records" title="Delete all activity records" disabled={!auditEvents.length || deletingAllAudit || deletingAuditId !== null} onClick={deleteAllAudit}><i className={`fas ${deletingAllAudit ? 'fa-spinner fa-spin' : 'fa-trash-can'}`} /></button>
        </form>
        {auditEvents.length ? visibleAuditEvents.length ? <>
          <p className="owner-audit-scroll-hint"><i className="fas fa-arrows-left-right" /> On smaller screens, scroll horizontally to see all columns.</p>
          <div className="owner-audit-table-scroll" role="region" aria-label="Recent access activity table" tabIndex="0">
            <table className="owner-audit-table"><thead><tr><th>Activity</th><th>Date / time</th><th>Action</th></tr></thead>
              <tbody>{visibleAuditEvents.map(event => <tr key={event.id}>
                <td><div className="owner-audit-activity"><span className="owner-audit-dot" /><div><strong><ExpandableCell>{formatActivityName(event.action)}</ExpandableCell></strong><small><ExpandableCell>{event.actorEmail || 'System'}{event.targetEmail ? ` · ${event.targetEmail}` : ''}</ExpandableCell></small></div></div></td>
                <td><time dateTime={event.createdAt}>{formatActivityTime(event.createdAt)}</time></td>
                <td><button type="button" className="owner-audit-delete" aria-label={`Delete ${formatActivityName(event.action)} activity`} title="Delete activity" disabled={deletingAllAudit || deletingAuditId !== null} onClick={() => deleteAuditEvent(event)}><i className={`fas ${deletingAuditId === event.id ? 'fa-spinner fa-spin' : 'fa-trash-can'}`} aria-hidden="true" /></button></td>
              </tr>)}</tbody>
            </table>
          </div>
        </> : <p className="owner-audit-empty">No activity matches your search.</p> : <p className="owner-audit-empty">No access changes recorded yet.</p>}
      </div>
    </section>
    </>}
    {responseDialogOpen && <div className="owner-confirm-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !responseBusy) setResponseDialogOpen(false); }}><form className="owner-confirm-dialog owner-support-response-dialog" role="dialog" aria-modal="true" aria-labelledby="owner-support-response-title" onSubmit={sendBulkSupportResponse}>
      <span className="owner-confirm-icon"><i className="fas fa-reply" aria-hidden="true" /></span><h3 id="owner-support-response-title">Reply to {selectedVisibleSupportRequests.length} open ticket{selectedVisibleSupportRequests.length === 1 ? '' : 's'}</h3>
      <p>This response will be emailed separately to every selected requester. They can reply directly to your email. Sending a reply leaves each ticket open.</p><label htmlFor="owner-support-response-body">Your response</label><textarea id="owner-support-response-body" required minLength="3" maxLength="5000" rows="6" value={responseDraft} onChange={event => setResponseDraft(event.target.value)} placeholder="Write your response to the requester(s)" />
      <div className="owner-confirm-actions"><button type="button" className="owner-confirm-cancel" disabled={responseBusy} onClick={() => setResponseDialogOpen(false)}>Cancel</button><button type="submit" className="owner-confirm-submit" disabled={responseBusy || responseDraft.trim().length < 3 || selectedVisibleSupportRequests.length > 50}>{responseBusy ? 'Sending...' : `Send ${selectedVisibleSupportRequests.length} response${selectedVisibleSupportRequests.length === 1 ? '' : 's'}`}</button></div>
    </form></div>}
    {restoreAuditOpen && <div className="owner-confirm-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !restoringAudit) setRestoreAuditOpen(false); }}><form className="owner-confirm-dialog owner-activity-restore-dialog" role="dialog" aria-modal="true" aria-labelledby="owner-activity-restore-title" onSubmit={restoreAuditRange}>
      <span className="owner-confirm-icon"><i className="fas fa-clock-rotate-left" aria-hidden="true" /></span><h3 id="owner-activity-restore-title">Restore deleted activity</h3><p>Choose the dates when the activity was deleted. Records removed during that range will return to Recent access activity. This restores history records only; it does not undo the admin actions they describe.</p>
      <label htmlFor="restore-activity-from">Deleted from</label><input id="restore-activity-from" type="date" required value={restoreAuditFrom} onChange={event => setRestoreAuditFrom(event.target.value)} />
      <label htmlFor="restore-activity-to">Deleted through</label><input id="restore-activity-to" type="date" required value={restoreAuditTo} onChange={event => setRestoreAuditTo(event.target.value)} />
      <div className="owner-confirm-actions"><button type="button" className="owner-confirm-cancel" disabled={restoringAudit} onClick={() => setRestoreAuditOpen(false)}>Cancel</button><button type="submit" className="owner-confirm-submit" disabled={restoringAudit || !restoreAuditFrom || !restoreAuditTo || restoreAuditFrom > restoreAuditTo}>{restoringAudit ? 'Restoring...' : 'Restore this range'}</button></div>
    </form></div>}
    {invitationRequest && <div className="owner-confirm-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !updatingRequestId) setInvitationRequest(null); }}><form className="owner-confirm-dialog owner-invitation-approval" role="dialog" aria-modal="true" aria-labelledby="owner-invitation-title" onSubmit={(event) => { event.preventDefault(); inviteFromRequest(invitationRequest, invitationRoles); }}>
      <span className="owner-confirm-icon"><i className="fas fa-user-shield" aria-hidden="true" /></span>
      <h3 id="owner-invitation-title">{invitationRequest.adminStatus === 'inactive' ? `Restore ${invitationRequest.name}'s admin access` : !invitationRequest.adminStatus ? `Create an admin account for ${invitationRequest.name}` : `Approve ${invitationRequest.name}'s admin request`}</h3>
      <p>{invitationRequest.adminStatus === 'inactive' ? `This email already belongs to an inactive admin. Choose their roles to reactivate the existing account and send a password-reset link to ${invitationRequest.email}. The request stays open until they reset their password and sign in.` : !invitationRequest.adminStatus ? `No admin account currently exists for ${invitationRequest.email}. Choose standard roles and send a setup link. The request stays open until setup is completed and the account is active.` : `Choose the standard access roles for ${invitationRequest.email}. The request stays open until they complete setup and their account becomes active. Super-admin access cannot be granted here.`}</p>
      <fieldset className="owner-role-checks owner-invitation-roles" aria-label="Roles for the invited administrator"><legend>Admin roles</legend>{standardAdminRoles.map(([value, label]) => <label key={value}><input type="checkbox" checked={invitationRoles.includes(value)} disabled={updatingRequestId === invitationRequest.id} onChange={(event) => setInvitationRoles((current) => event.target.checked ? [...new Set([...current, value])] : current.filter((role) => role !== value))} /> <span>{label}</span></label>)}<small>Choose one or more roles. You can change role access later from Admin accounts.</small></fieldset>
      <div className="owner-confirm-actions"><button type="button" className="owner-confirm-cancel" disabled={updatingRequestId === invitationRequest.id} onClick={() => setInvitationRequest(null)}>Cancel</button><button type="submit" className="owner-confirm-submit" disabled={updatingRequestId === invitationRequest.id || !invitationRoles.length}>{updatingRequestId === invitationRequest.id ? 'Sending…' : invitationRequest.adminStatus === 'pending' ? 'Save roles & resend link' : invitationRequest.adminStatus === 'inactive' ? 'Reactivate & send password link' : !invitationRequest.adminStatus ? 'Create account & send setup link' : 'Approve & send setup link'}</button></div>
    </form></div>}
    <p className="owner-data-note"><i className="fas fa-circle-info" /> Roles currently apply to this shared portfolio. Per-customer data separation is part of the next multi-tenant phase.</p>
    </div>
  </main>;
}
