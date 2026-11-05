import React, { useEffect, useState } from 'react';
import { platformOwnerRequest } from './platformOwnerApi.js';

export default function CustomerChatInbox() {
  const [customers, setCustomers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function loadCustomers() {
    const result = await platformOwnerRequest('/customer-chat');
    setCustomers(result.customers || []);
  }
  async function openChat(customer) {
    setSelected(customer);
    setError('');
    try {
      const result = await platformOwnerRequest(`/customer-chat/${customer.id}`);
      setMessages(result.messages || []);
      await loadCustomers();
    } catch (requestError) { setError(requestError.message); }
  }
  useEffect(() => { loadCustomers().catch((requestError) => setError(requestError.message)); }, []);

  async function sendReply(event) {
    event.preventDefault();
    if (!selected || !draft.trim()) return;
    setBusy(true);
    try {
      const result = await platformOwnerRequest(`/customer-chat/${selected.id}`, { method: 'POST', body: JSON.stringify({ body: draft.trim() }) });
      setMessages((current) => [...current, result.message]);
      setDraft('');
      await loadCustomers();
    } catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  }

  return <section className="owner-card owner-customer-chat">
    <div className="owner-section-heading"><div><p className="owner-eyebrow">CUSTOMER MESSAGES</p><h2>FolioSpace support chat</h2></div><button type="button" className="owner-action-button" onClick={() => loadCustomers().catch((e) => setError(e.message))}>Refresh</button></div>
    {error && <p className="owner-customer-chat-error" role="alert">{error}</p>}
    <div className="owner-customer-chat-layout">
      <nav className="owner-customer-chat-list" aria-label="Customer conversations">
        {customers.map((customer) => <button type="button" key={customer.id} className={selected?.id === customer.id ? 'is-selected' : ''} onClick={() => openChat(customer)}><strong>{customer.displayName}</strong><span>{customer.email}</span><small>{customer.lastMessage || 'Conversation'}</small>{customer.unreadCount > 0 && <b>{customer.unreadCount}</b>}</button>)}
        {!customers.length && <p>No customer conversations yet.</p>}
      </nav>
      <div className="owner-customer-chat-conversation">
        {selected ? <><header><strong>{selected.displayName}</strong><span>{selected.email}</span></header><div className="owner-customer-chat-messages">{messages.map((message) => <article key={message.id} className={`is-${message.senderRole}`}><strong>{message.senderRole === 'platform_owner' ? 'You' : selected.displayName}</strong><p>{message.body}</p><time>{new Date(message.createdAt).toLocaleString()}</time></article>)}{!messages.length && <p>No messages in this conversation yet.</p>}</div><form onSubmit={sendReply}><textarea aria-label="Reply to customer" maxLength={3000} required value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Write a reply"/><button type="submit" disabled={busy || !draft.trim()}>{busy ? 'Sending…' : 'Reply'}</button></form></> : <p>Select a customer conversation.</p>}
      </div>
    </div>
  </section>;
}
