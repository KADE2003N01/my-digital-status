import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch } from '../../services/api.js';
import { getStoredSessionToken } from '../../services/adminSession.js';
import { discardMessageAttachments, MessageAttachmentList, MessageAttachmentPicker, uploadMessageAttachment } from '../../components/MessageAttachments.jsx';
import './ChatRoomPreview.css';

async function chatRequest(path, options = {}) {
  const token = getStoredSessionToken();
  const response = await apiFetch(path, {
    ...options,
    credentials: 'include',
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Could not complete the chat action.');
  return result;
}

function initials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] || '').join('').toUpperCase() || '?';
}

function messageTime(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function conversationTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return messageTime(value);
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function dayLabel(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
}

function conversationMessagePreview(message) {
  if (!message) return 'Start a conversation';
  if (message.deletedAt) return 'Message deleted';
  if (message.body) return message.body;
  return message.attachments?.length ? '📎 Attachment' : 'Start a conversation';
}

export default function ChatRoomPreview() {
  const [user, setUser] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [messages, setMessages] = useState([]);
  const [activeContactId, setActiveContactId] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [body, setBody] = useState('');
  const [pendingFiles, setPendingFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const historyRef = useRef(null);
  const textareaRef = useRef(null);

  const isPlatformOwner = (user?.roles || [user?.role]).includes('platform_owner');
  const workspaceQuery = isPlatformOwner ? '' : '?workspace=admin';

  const loadChat = useCallback(async () => {
    const authResult = await chatRequest('/auth/me');
    const currentUser = authResult.user;
    if (!currentUser) throw new Error('Your administrator session could not be verified.');
    const ownerMode = (currentUser.roles || [currentUser.role]).includes('platform_owner');
    const [inboxResult, ownerResult] = await Promise.all([
      chatRequest(`/messages${ownerMode ? '' : '?workspace=admin'}`),
      chatRequest('/messages/super-admins')
    ]);
    const nextContacts = ownerMode
      ? (inboxResult.threads || [])
        .filter((thread) => String(thread.adminId) !== String(currentUser.id))
        .map((thread) => ({
          id: String(thread.adminId),
          threadId: thread.id,
          name: thread.adminName || thread.adminEmail || 'Administrator',
          subtitle: thread.adminEmail || '',
          status: thread.adminStatus,
          roles: thread.adminRoles || [],
          replyAllowed: thread.replyAllowed
        }))
      : (ownerResult.admins || []).map((owner) => ({
        id: String(owner.id),
        threadId: inboxResult.threads?.[0]?.id,
        name: owner.displayName || owner.email || 'Super admin',
        subtitle: owner.email || 'Super admin',
        status: owner.adminStatus,
        roles: ['platform_owner'],
        replyAllowed: owner.replyAllowed
      }));

    setUser(currentUser);
    setContacts(nextContacts);
    setMessages(inboxResult.messages || []);
    setActiveContactId((current) => nextContacts.some((contact) => contact.id === current)
      ? current
      : nextContacts[0]?.id || '');
    setError('');
  }, [workspaceQuery]);

  useEffect(() => {
    let active = true;
    loadChat().catch((requestError) => {
      if (!active) return;
      if (/authentication required|session/i.test(requestError.message)) {
        window.location.replace('admin-login.html?next=chatroom-preview.html');
        return;
      }
      setError(requestError.message);
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [loadChat]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!document.hidden && !sending) loadChat().catch((requestError) => setError(requestError.message));
    }, 15000);
    return () => window.clearInterval(timer);
  }, [loadChat, sending]);

  const activeContact = contacts.find((contact) => contact.id === activeContactId);
  const contactMessages = useMemo(() => {
    if (!activeContact) return [];
    return messages.filter((message) => {
      if (isPlatformOwner) {
        const sameThread = String(message.threadId) === String(activeContact.threadId);
        const ownerSent = sameThread
          && String(message.senderId) === String(user?.id)
          && (!message.recipientOwnerId || String(message.recipientOwnerId) === activeContact.id);
        const adminSent = sameThread
          && String(message.senderId) === activeContact.id
          && (!message.recipientOwnerId || String(message.recipientOwnerId) === String(user?.id));
        return ownerSent || adminSent;
      }
      return String(message.threadId) === String(activeContact.threadId)
        && (message.senderRole === 'platform_owner'
          ? String(message.senderId) === activeContact.id
          : String(message.recipientOwnerId) === activeContact.id);
    }).filter((message) => !message.isHidden);
  }, [activeContact, isPlatformOwner, messages, user?.id]);

  const conversations = useMemo(() => contacts.map((contact) => {
    const conversation = messages.filter((message) => {
      if (isPlatformOwner) {
        const sameThread = String(message.threadId) === String(contact.threadId);
        const ownerSent = sameThread
          && String(message.senderId) === String(user?.id)
          && (!message.recipientOwnerId || String(message.recipientOwnerId) === contact.id);
        const adminSent = sameThread
          && String(message.senderId) === contact.id
          && (!message.recipientOwnerId || String(message.recipientOwnerId) === String(user?.id));
        return ownerSent || adminSent;
      }
      return String(message.threadId) === String(contact.threadId)
        && (message.senderRole === 'platform_owner'
          ? String(message.senderId) === contact.id
          : String(message.recipientOwnerId) === contact.id);
    }).filter((message) => !message.isHidden);
    const latest = conversation[conversation.length - 1];
    const unread = conversation.filter((message) =>
      String(message.senderId) !== String(user?.id) && !message.isRead && !message.deletedAt
    ).length;
    return { ...contact, latest, unread, conversation };
  }).filter((contact) => {
    const matchesSearch = `${contact.name} ${contact.subtitle} ${contact.roles.join(' ')}`.toLowerCase().includes(search.trim().toLowerCase());
    return matchesSearch && (filter === 'all' || (filter === 'unread' && contact.unread > 0));
  }).sort((left, right) => {
    const leftTime = left.latest ? new Date(left.latest.createdAt).getTime() || 0 : 0;
    const rightTime = right.latest ? new Date(right.latest.createdAt).getTime() || 0 : 0;
    return rightTime - leftTime || left.name.localeCompare(right.name);
  }), [contacts, filter, isPlatformOwner, messages, search, user?.id]);

  const latestUnread = contactMessages.find((message) =>
    String(message.senderId) !== String(user?.id) && !message.isRead && !message.deletedAt
  );

  useEffect(() => {
    const history = historyRef.current;
    if (history) history.scrollTop = history.scrollHeight;
  }, [activeContactId, contactMessages.length]);

  useEffect(() => {
    if (!activeContact?.threadId || !latestUnread) return;
    chatRequest(`/messages/threads/${activeContact.threadId}/read${workspaceQuery}`, {
      method: 'POST',
      body: JSON.stringify(isPlatformOwner ? {} : { senderId: Number(activeContact.id) })
    }).then(() => loadChat()).catch((requestError) => setError(requestError.message));
  }, [activeContact?.id, activeContact?.threadId, isPlatformOwner, latestUnread?.id, loadChat, workspaceQuery]);

  async function sendMessage(event) {
    event.preventDefault();
    if ((!body.trim() && !pendingFiles.length) || !activeContact || sending) return;
    if (activeContact.status && activeContact.status !== 'active') {
      setError('Messages can only be sent to active administrator accounts.');
      return;
    }
    setSending(true);
    setError('');
    const uploadedIds = [];
    try {
      for (const file of pendingFiles) uploadedIds.push((await uploadMessageAttachment(file)).id);
      const payload = {
        body: body.trim(),
        attachmentIds: uploadedIds,
        ...(isPlatformOwner ? { adminId: Number(activeContact.id) } : { recipientOwnerId: Number(activeContact.id) })
      };
      await chatRequest('/messages', { method: 'POST', body: JSON.stringify(payload) });
      setBody('');
      setPendingFiles([]);
      await loadChat();
      textareaRef.current?.focus();
    } catch (requestError) {
      if (uploadedIds.length) {
        try { await discardMessageAttachments(uploadedIds); } catch { /* Keep the original send error visible. */ }
      }
      setError(requestError.message || 'Could not send this message.');
    } finally {
      setSending(false);
    }
  }

  function handleComposerKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  const groupedMessages = useMemo(() => {
    const groups = [];
    contactMessages.forEach((message) => {
      const date = dayLabel(message.createdAt);
      let group = groups[groups.length - 1];
      if (!group || group.date !== date) {
        group = { date, messages: [] };
        groups.push(group);
      }
      group.messages.push(message);
    });
    return groups;
  }, [contactMessages]);

  return <main className="chat-preview-page">
    <header className="chat-preview-topbar">
      <a className="chat-preview-brand" href="admin-messages.html" aria-label="Return to existing messages">
        <span className="chat-preview-brand-icon"><i className="fas fa-comments" /></span>
        <span><strong>Messages</strong><small>New chatroom preview</small></span>
      </a>
      <div className="chat-preview-top-actions">
        <span className="chat-preview-preview-tag"><i className="fas fa-flask" /> Preview only</span>
        <a href="admin-messages.html"><i className="fas fa-arrow-left" /> Existing inbox</a>
      </div>
    </header>

    <section className={`chat-preview-shell${mobileChatOpen ? ' is-chat-open' : ''}`} aria-label="Chatroom preview">
      <aside className="chat-preview-sidebar" aria-label="Conversations">
        <div className="chat-preview-sidebar-heading">
          <div><p>MESSAGES</p><h1>Chats</h1></div>
          <span className="chat-preview-live-indicator"><i /> Live</span>
        </div>
        {error && <p className="chat-preview-sidebar-error" role="alert">{error}</p>}
        <label className="chat-preview-search">
          <i className="fas fa-magnifying-glass" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search or start a new chat" aria-label="Search conversations" />
          {search && <button type="button" onClick={() => setSearch('')} aria-label="Clear search"><i className="fas fa-xmark" /></button>}
        </label>
        <div className="chat-preview-filters" role="group" aria-label="Filter chats">
          <button type="button" className={filter === 'all' ? 'is-active' : ''} onClick={() => setFilter('all')}>All</button>
          <button type="button" className={filter === 'unread' ? 'is-active' : ''} onClick={() => setFilter('unread')}>Unread</button>
        </div>
        <div className="chat-preview-conversation-list">
          {loading && <p className="chat-preview-list-message">Loading conversations…</p>}
          {!loading && conversations.length === 0 && <p className="chat-preview-list-message">{contacts.length ? 'No matching conversations.' : 'No available conversations.'}</p>}
          {conversations.map((conversation) => <button
            type="button"
            key={conversation.id}
            className={`chat-preview-contact${activeContactId === conversation.id ? ' is-selected' : ''}`}
            onClick={() => { setActiveContactId(conversation.id); setMobileChatOpen(true); }}
          >
            <span className="chat-preview-avatar">{initials(conversation.name)}<i className={conversation.status === 'active' ? 'is-online' : ''} /></span>
            <span className="chat-preview-contact-content">
              <span className="chat-preview-contact-line"><strong>{conversation.name}</strong><time>{conversationTime(conversation.latest?.createdAt)}</time></span>
              <span className="chat-preview-contact-line chat-preview-preview-line"><span>{String(conversation.latest?.senderId) === String(user?.id) && <i className={`fas ${conversation.latest?.isRead ? 'fa-check-double is-read' : 'fa-check'}`} />} {conversationMessagePreview(conversation.latest)}</span>{conversation.unread > 0 && <b>{conversation.unread}</b>}</span>
            </span>
          </button>)}
        </div>
        <footer className="chat-preview-sidebar-footer"><i className="fas fa-lock" /> Private administrator conversations</footer>
      </aside>

      <section className="chat-preview-conversation" aria-label={activeContact ? `Conversation with ${activeContact.name}` : 'Chat conversation'}>
        {activeContact ? <>
          <header className="chat-preview-conversation-header">
            <button type="button" className="chat-preview-mobile-back" onClick={() => setMobileChatOpen(false)} aria-label="Back to conversations"><i className="fas fa-arrow-left" /></button>
            <span className="chat-preview-avatar">{initials(activeContact.name)}<i className={activeContact.status === 'active' ? 'is-online' : ''} /></span>
            <div className="chat-preview-recipient"><strong>{activeContact.name}</strong><small>{activeContact.status === 'active' ? 'Active administrator' : activeContact.status || 'Administrator'}{activeContact.subtitle ? ` · ${activeContact.subtitle}` : ''}</small></div>
            <div className="chat-preview-header-actions"><button type="button" title="Search chats" aria-label="Search chats" onClick={() => document.querySelector('.chat-preview-search input')?.focus()}><i className="fas fa-magnifying-glass" /></button><span className="chat-preview-header-status"><i className="fas fa-shield-halved" /> Private</span></div>
          </header>

          <div className="chat-preview-history" ref={historyRef} aria-live="polite">
            <div className="chat-preview-encryption-note"><i className="fas fa-lock" /> This is a private administrator conversation.</div>
            {loading && <p className="chat-preview-history-empty">Loading messages…</p>}
            {!loading && contactMessages.length === 0 && <div className="chat-preview-welcome"><span><i className="fas fa-comments" /></span><h2>Start your conversation</h2><p>Messages with {activeContact.name} will appear here.</p></div>}
            {groupedMessages.map((group) => <div className="chat-preview-day-group" key={group.date}>
              <div className="chat-preview-day-label"><span>{group.date}</span></div>
              {group.messages.map((message) => {
                const outgoing = String(message.senderId) === String(user?.id);
                return <article className={`chat-preview-bubble-row${outgoing ? ' is-outgoing' : ''}`} key={message.id}>
                  <div className={`chat-preview-bubble${message.deletedAt ? ' is-deleted' : ''}`}>
                    {message.deletedAt
                      ? <p><i className="fas fa-ban" /> This message was deleted</p>
                      : <>
                        {message.body && <p>{message.body}</p>}
                        <MessageAttachmentList attachments={message.attachments || []} />
                      </>}
                    <footer><time>{messageTime(message.createdAt)}</time>{message.editedAt && <span>edited</span>}{outgoing && <i className={`fas ${message.isRead ? 'fa-check-double is-read' : message.isDelivered ? 'fa-check-double' : 'fa-check'}`} aria-label={message.isRead ? 'Read' : message.isDelivered ? 'Delivered' : 'Sent'} />}</footer>
                  </div>
                </article>;
              })}
            </div>)}
          </div>

          <form className="chat-preview-composer" onSubmit={sendMessage}>
            {error && <p className="chat-preview-error" role="alert">{error}</p>}
            <MessageAttachmentPicker files={pendingFiles} onFilesChange={setPendingFiles} disabled={sending} onError={setError} />
            <div className="chat-preview-compose-row">
              <label className="chat-preview-compose-box">
                <i className="far fa-face-smile" aria-hidden="true" />
                <textarea ref={textareaRef} rows="1" value={body} onChange={(event) => setBody(event.target.value)} onKeyDown={handleComposerKeyDown} placeholder="Type a message" aria-label="Type a message" maxLength={3000} disabled={sending || (activeContact.status && activeContact.status !== 'active')} />
              </label>
              <button type="submit" className="chat-preview-send" disabled={sending || (!body.trim() && pendingFiles.length === 0) || (activeContact.status && activeContact.status !== 'active')} aria-label="Send message" title="Send message"><i className={`fas ${sending ? 'fa-spinner fa-spin' : 'fa-paper-plane'}`} /></button>
            </div>
            <p className="chat-preview-compose-hint">Enter to send · Shift + Enter for a new line</p>
          </form>
        </> : <div className="chat-preview-empty-panel"><span><i className="fas fa-comments" /></span><h2>Your conversations</h2><p>Select a chat from the list to view messages.</p></div>}
      </section>
    </section>
  </main>;
}
