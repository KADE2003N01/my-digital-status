import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch } from '../../services/api.js';
import { getStoredSessionToken } from '../../services/adminSession.js';
import { MessageAttachmentPicker } from '../../components/MessageAttachments.jsx';
import MessageReactionPicker, { getReactionDisplay } from '../messages/MessageReactionPicker.jsx';
import ExpandableMessageText from '../messages/ExpandableMessageText.jsx';
import { formatChatTime, getChatDayLabel, getMessageInitials } from '../messages/chatFormatting.js';
import { CustomerChatAttachment } from '../platform-auth/CustomerSupportChat.jsx';
import { platformOwnerRequest } from './platformOwnerApi.js';

export default function CustomerChatInbox() {
  const [customers, setCustomers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [pendingFiles, setPendingFiles] = useState([]);
  const [replyTarget, setReplyTarget] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [conversationSearch, setConversationSearch] = useState('');
  const [messageSearch, setMessageSearch] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState([]);
  const [deletingSelected, setDeletingSelected] = useState(false);
  const historyRef = useRef(null);
  const atBottomRef = useRef(true);
  const textareaRef = useRef(null);
  const refreshingRef = useRef(false);
  const longPressTimer = useRef(null);

  const loadCustomers = useCallback(async () => {
    const result = await platformOwnerRequest('/customer-chat');
    setCustomers(result.customers || []);
  }, []);

  const loadChat = useCallback(async (customerId) => {
    if (!customerId) return;
    const result = await platformOwnerRequest(`/customer-chat/${customerId}`);
    setSelected(result.customer);
    setMessages(result.messages || []);
    await loadCustomers();
  }, [loadCustomers]);

  function positionMessageMenu(event) {
    if (!event.currentTarget.open) return;
    const menu = event.currentTarget.querySelector('[role="menu"]');
    const trigger = event.currentTarget.querySelector('summary')?.getBoundingClientRect();
    if (!menu || !trigger) return;
    const width = Math.min(190, window.innerWidth - 24);
    const left = Math.max(12, Math.min(trigger.right - width, window.innerWidth - width - 12));
    const height = menu.getBoundingClientRect().height || 220;
    const top = trigger.bottom + height < window.innerHeight - 12
      ? trigger.bottom + 6
      : Math.max(12, trigger.top - height - 6);
    menu.style.setProperty('--owner-customer-chat-menu-left', `${left}px`);
    menu.style.setProperty('--owner-customer-chat-menu-top', `${top}px`);
  }

  function runMessageMenuAction(event, action) {
    event.currentTarget.closest('details').open = false;
    action();
  }

  function cancelMessageLongPress() {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    historyRef.current?.querySelector('.owner-customer-chat-day article.is-long-press')?.classList.remove('is-long-press');
  }

  function startMessageLongPress(event) {
    if (event.touches.length !== 1) return;
    cancelMessageLongPress();
    const touch = event.touches[0];
    longPressTimer.current = window.setTimeout(() => {
      longPressTimer.current = null;
      const article = event.target.closest?.('.owner-customer-chat-day article');
      const menu = article?.querySelector('details.owner-customer-chat-actions');
      if (menu) {
        article.classList.remove('is-long-press');
        menu.open = true;
      }
      if (navigator.vibrate) navigator.vibrate(30);
    }, 550);
    event.target.addEventListener('touchmove', (moveEvent) => {
      const current = moveEvent.touches[0];
      if (current && (Math.abs(current.clientX - touch.clientX) > 10 || Math.abs(current.clientY - touch.clientY) > 10)) cancelMessageLongPress();
    }, { once: true, passive: true });
    event.target.closest?.('.owner-customer-chat-day article')?.classList.add('is-long-press');
  }

  useEffect(() => cancelMessageLongPress, []);

  useEffect(() => {
    loadCustomers().catch((requestError) => setError(requestError.message));
    const refresh = async () => {
      if (document.hidden || refreshingRef.current) return;
      refreshingRef.current = true;
      try {
        await loadCustomers();
        if (selected?.id) {
          const result = await platformOwnerRequest(`/customer-chat/${selected.id}`);
          setMessages(result.messages || []);
        }
      } catch (requestError) {
        if (!document.hidden) setError(requestError.message);
      } finally { refreshingRef.current = false; }
    };
    const timer = window.setInterval(refresh, 5000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [loadCustomers, selected?.id]);

  useEffect(() => {
    const history = historyRef.current;
    if (history && atBottomRef.current) history.scrollTop = history.scrollHeight;
  }, [messages.length]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    const maxHeight = 140;
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }, [draft]);

  const visibleCustomers = useMemo(() => {
    const query = conversationSearch.trim().toLocaleLowerCase();
    return query ? customers.filter((customer) => `${customer.displayName} ${customer.email} ${customer.lastMessage || ''}`.toLocaleLowerCase().includes(query)) : customers;
  }, [customers, conversationSearch]);
  const visibleMessages = useMemo(() => {
    const query = messageSearch.trim().toLocaleLowerCase();
    return query ? messages.filter((message) => `${message.body} ${message.attachments?.map((file) => file.name).join(' ')}`.toLocaleLowerCase().includes(query)) : messages;
  }, [messages, messageSearch]);
  const groupedMessages = useMemo(() => {
    const groups = [];
    visibleMessages.forEach((message) => {
      const date = new Date(message.createdAt);
      const key = Number.isNaN(date.getTime()) ? 'unknown' : `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      let group = groups.at(-1);
      if (!group || group.key !== key) {
        group = { key, label: getChatDayLabel(message.createdAt), messages: [] };
        groups.push(group);
      }
      group.messages.push(message);
    });
    return groups;
  }, [visibleMessages]);

  async function uploadFile(file) {
    return platformOwnerRequest(`/customer-chat/${selected.id}/attachments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream', 'X-File-Name': encodeURIComponent(file.name), 'X-File-Type': file.type },
      body: file
    });
  }

  async function sendReply(event) {
    event.preventDefault();
    if (!selected || busy || (!draft.trim() && !pendingFiles.length)) return;
    setBusy(true);
    setError('');
    let uploaded = [];
    try {
      if (editingMessage) {
        const result = await platformOwnerRequest(`/customer-chat/${selected.id}/${editingMessage.id}`, { method: 'PATCH', body: JSON.stringify({ body: draft.trim() }) });
        setMessages((current) => current.map((message) => message.id === editingMessage.id ? result.message : message));
      } else {
        for (const file of pendingFiles) uploaded.push(await uploadFile(file));
        const result = await platformOwnerRequest(`/customer-chat/${selected.id}`, {
          method: 'POST',
          body: JSON.stringify({ body: draft.trim(), attachmentIds: uploaded.map((file) => file.attachment.id), ...(replyTarget ? { replyToMessageId: replyTarget.id } : {}) })
        });
        setMessages((current) => [...current.filter((message) => message.id !== result.message.id), result.message]);
      }
      setDraft('');
      setPendingFiles([]);
      setReplyTarget(null);
      setEditingMessage(null);
      await loadCustomers();
    } catch (requestError) {
      if (uploaded.length) {
        await Promise.all(uploaded.map(async (file) => {
          await platformOwnerRequest(`/customer-chat/${selected.id}/attachments/${file.attachment.id}`, { method: 'DELETE' }).catch(() => {});
        }));
      }
      setError(requestError.message);
    } finally { setBusy(false); }
  }

  async function reactToMessage(message, emoji) {
    try {
      const result = await platformOwnerRequest(`/customer-chat/${selected.id}/${message.id}/reactions`, { method: 'POST', body: JSON.stringify({ emoji }) });
      setMessages((current) => current.map((item) => item.id === message.id ? { ...item, reactions: result.reactions || [] } : item));
    } catch (requestError) { setError(requestError.message); }
  }

  async function toggleMessageFlag(message, flag, enabled) {
    try {
      const result = await platformOwnerRequest(`/customer-chat/${selected.id}/${message.id}/flags`, { method: 'POST', body: JSON.stringify({ flag, enabled }) });
      setMessages((current) => current.map((item) => item.id === message.id ? { ...item, isPinned: result.isPinned, isStarred: result.isStarred } : item));
    } catch (requestError) { setError(requestError.message); }
  }

  function toggleMessageSelection(message) {
    setSelectedMessageIds((current) => current.some((id) => id === message.id)
      ? current.filter((id) => id !== message.id)
      : [...current, message.id]);
  }

  async function deleteSelectedMessages() {
    const selectedMessages = messages.filter((message) => selectedMessageIds.includes(message.id) && message.senderRole === 'platform_owner' && !message.deletedAt);
    if (!selectedMessages.length || deletingSelected) return;
    if (!window.confirm(`Delete ${selectedMessages.length} selected message${selectedMessages.length === 1 ? '' : 's'} for everyone?`)) return;
    setDeletingSelected(true);
    setError('');
    let deleted = 0;
    try {
      for (const message of selectedMessages) {
        const result = await platformOwnerRequest(`/customer-chat/${selected.id}/${message.id}`, { method: 'DELETE' });
        setMessages((current) => current.map((item) => item.id === message.id ? result.message : item));
        deleted += 1;
      }
      setSelectedMessageIds([]);
    } catch (requestError) {
      setSelectedMessageIds((current) => current.filter((id) => !selectedMessages.slice(0, deleted).some((message) => message.id === id)));
      setError(`${deleted ? `${deleted} message${deleted === 1 ? '' : 's'} deleted. ` : ''}${requestError.message}`);
    } finally { setDeletingSelected(false); }
  }

  async function deleteMessage(message) {
    if (!window.confirm('Delete this message for everyone in the support conversation?')) return;
    try {
      const result = await platformOwnerRequest(`/customer-chat/${selected.id}/${message.id}`, { method: 'DELETE' });
      setMessages((current) => current.map((item) => item.id === message.id ? result.message : item));
    } catch (requestError) { setError(requestError.message); }
  }

  async function openAttachment(attachment) {
    const token = getStoredSessionToken();
    return apiFetch(attachment.url, { credentials: 'include', allowBinary: true, headers: token ? { Authorization: `Bearer ${token}` } : {} });
  }

  async function copyMessage(message) {
    try { await navigator.clipboard.writeText(message.body || ''); }
    catch (copyError) { setError(`Could not copy this message: ${copyError.message}`); }
  }

  function startReply(message) {
    setReplyTarget(message);
    setEditingMessage(null);
    setDraft('');
    window.setTimeout(() => textareaRef.current?.focus(), 0);
  }

  function prepareForward(message) {
    const from = message.senderRole === 'platform_owner' ? 'you' : selected.displayName;
    const attachmentNote = message.attachments?.length
      ? `\n\n[${message.attachments.length} attachment${message.attachments.length === 1 ? '' : 's'} not included in this forwarded copy.]`
      : '';
    setReplyTarget(null);
    setEditingMessage(null);
    setPendingFiles([]);
    setDraft(`Forwarded message from ${from}:\n\n${(message.body || '[Attachment]').slice(0, 2700)}${attachmentNote}`);
    window.setTimeout(() => textareaRef.current?.focus(), 0);
  }

  function startEdit(message) {
    setEditingMessage(message);
    setReplyTarget(null);
    setDraft(message.body);
    setPendingFiles([]);
    window.setTimeout(() => textareaRef.current?.focus(), 0);
  }

  function clearDraftMode() {
    setReplyTarget(null);
    setEditingMessage(null);
    setDraft('');
    setPendingFiles([]);
  }

  return <section className="owner-card owner-customer-chat">
    <div className="owner-section-heading"><div><p className="owner-eyebrow">CUSTOMER MESSAGES</p><h2>FolioSpace support chat</h2></div><button type="button" className="owner-action-button" onClick={() => loadCustomers().catch((requestError) => setError(requestError.message))}>Refresh</button></div>
    <p className="owner-customer-chat-intro">Messages refresh automatically. Open a customer conversation to read and reply with files, voice notes, reactions, and message actions.</p>
    {error && <p className="owner-customer-chat-error" role="alert">{error}</p>}
    <div className="owner-customer-chat-layout">
      <nav className="owner-customer-chat-list" aria-label="Customer conversations">
        <label className="owner-customer-chat-search"><i className="fas fa-magnifying-glass" /><input type="search" value={conversationSearch} onChange={(event) => setConversationSearch(event.target.value)} placeholder="Search customers or messages" aria-label="Search customer conversations" /></label>
        {visibleCustomers.map((customer) => <button type="button" key={customer.id} className={selected?.id === customer.id ? 'is-selected' : ''} onClick={async () => {
          setLoadingMessages(true);
          setError('');
          clearDraftMode();
          setSelectedMessageIds([]);
          try { await loadChat(customer.id); }
          catch (requestError) { setError(requestError.message); }
          finally { setLoadingMessages(false); }
        }}><strong>{customer.displayName}</strong><span>{customer.email}</span><small>{customer.lastMessage || 'Conversation'}</small>{customer.unreadCount > 0 && <b>{customer.unreadCount}</b>}</button>)}
        {!visibleCustomers.length && <p>No customer conversations found.</p>}
      </nav>
      <div className="owner-customer-chat-conversation">
        {selected ? <>
          <header><span className="owner-customer-chat-avatar">{getMessageInitials(selected.displayName)}</span><div><strong>{selected.displayName}</strong><span>{selected.email}</span></div><label className="owner-customer-chat-message-search"><i className="fas fa-magnifying-glass" /><input type="search" value={messageSearch} onChange={(event) => setMessageSearch(event.target.value)} placeholder="Find in chat" aria-label="Search messages in this conversation" /></label></header>
          <div ref={historyRef} className="owner-customer-chat-messages" onScroll={(event) => {
            const history = event.currentTarget;
            atBottomRef.current = history.scrollHeight - history.scrollTop - history.clientHeight < 72;
          }} aria-live="polite">
            {selectedMessageIds.length > 0 && <div className="owner-customer-chat-selection-bar" role="group" aria-label="Selected messages">
              <span>{selectedMessageIds.length} selected</span>
              <button type="button" className="is-danger" onClick={deleteSelectedMessages} disabled={deletingSelected}><i className={`fas ${deletingSelected ? 'fa-spinner fa-spin' : 'fa-trash'}`} /> {deletingSelected ? 'Deleting…' : 'Delete selected'}</button>
              <button type="button" onClick={() => setSelectedMessageIds([])}>Cancel</button>
            </div>}
            {loadingMessages && <p>Loading conversation…</p>}
            {!loadingMessages && messages.length === 0 && <p>No messages in this conversation yet.</p>}
            {messages.length > 0 && visibleMessages.length === 0 && <p>No messages match your search.</p>}
            {groupedMessages.map((group) => <div className="owner-customer-chat-day" key={group.key}>
              <span>{group.label}</span>
              {group.messages.map((message) => {
                const ownMessage = message.senderRole === 'platform_owner';
                const quotedMessage = messages.find((item) => item.id === message.replyToMessageId);
                return <article key={message.id} className={`is-${message.senderRole}${message.deletedAt ? ' is-deleted' : ''}${selectedMessageIds.includes(message.id) ? ' is-selected' : ''}`} onTouchStart={startMessageLongPress} onTouchEnd={cancelMessageLongPress} onTouchCancel={cancelMessageLongPress} onContextMenu={(event) => { if (window.matchMedia('(hover: none)').matches) event.preventDefault(); }}>
                  {!ownMessage && <span className="owner-customer-chat-message-avatar">{getMessageInitials(selected.displayName)}</span>}
                  <div className="owner-customer-chat-bubble">
                    <strong>{ownMessage ? 'You' : selected.displayName}</strong>
                    {quotedMessage && !message.deletedAt && <div className="owner-customer-chat-quote"><b>Replying to {quotedMessage.senderRole === 'platform_owner' ? 'you' : selected.displayName}</b><span>{quotedMessage.deletedAt ? 'Message deleted' : quotedMessage.body || 'Attachment'}</span></div>}
                    {message.deletedAt ? <p className="is-deleted-copy">This message was deleted.</p> : <>
                      <ExpandableMessageText key={`${message.id}-${message.body}`}>{message.body}</ExpandableMessageText>
                      {message.attachments?.map((attachment) => <CustomerChatAttachment key={attachment.id} attachment={attachment} requestAttachment={openAttachment} />)}
                      {(message.isPinned || message.isStarred) && <small className="owner-customer-chat-flags">{message.isPinned && <span><i className="fas fa-thumbtack" /> Pinned</span>}{message.isStarred && <span><i className="fas fa-star" /> Starred</span>}</small>}
                      {message.editedAt && <small className="owner-customer-chat-edited">Edited</small>}
                      {message.reactions?.length > 0 && <div className="owner-customer-chat-reactions">{message.reactions.map((reaction) => {
                        const display = getReactionDisplay(reaction.emoji);
                        return <button type="button" key={reaction.emoji} className={reaction.reacted ? 'is-reacted' : ''} aria-label={`${display.label}, ${reaction.count} reactions`} onClick={() => reactToMessage(message, reaction.emoji)}><i className={display.icon} /> {reaction.count}</button>;
                      })}</div>}
                    </>}
                    <footer><time dateTime={message.createdAt}>{formatChatTime(message.createdAt)}</time>{ownMessage && !message.deletedAt && <span className={message.isRead ? 'is-read' : ''} aria-label={message.isRead ? 'Read by customer' : 'Sent'} title={message.isRead ? 'Read by customer' : 'Sent'}><i className={`fas ${message.isRead ? 'fa-check-double' : 'fa-check'}`} /></span>}</footer>
                    {!message.deletedAt && <details className="owner-customer-chat-actions" onToggle={positionMessageMenu}>
                      <summary aria-label="Message actions" title="Message actions"><i className="fas fa-ellipsis" /></summary>
                      <div role="menu"><MessageReactionPicker onSelect={(emoji, event) => { event.currentTarget.closest('details').open = false; reactToMessage(message, emoji); }} />
                        <button type="button" role="menuitem" onClick={(event) => runMessageMenuAction(event, () => startReply(message))}><i className="fas fa-reply" /> Reply</button>
                        <button type="button" role="menuitem" onClick={(event) => runMessageMenuAction(event, () => copyMessage(message))}><i className="fas fa-copy" /> Copy</button>
                        <button type="button" role="menuitem" onClick={(event) => runMessageMenuAction(event, () => prepareForward(message))}><i className="fas fa-share" /> Forward message</button>
                        <button type="button" role="menuitem" onClick={(event) => runMessageMenuAction(event, () => toggleMessageFlag(message, 'pin', !message.isPinned))}><i className="fas fa-thumbtack" /> {message.isPinned ? 'Unpin' : 'Pin'}</button>
                        <button type="button" role="menuitem" onClick={(event) => runMessageMenuAction(event, () => toggleMessageFlag(message, 'star', !message.isStarred))}><i className="fas fa-star" /> {message.isStarred ? 'Unstar' : 'Star'}</button>
                        {ownMessage && <button type="button" role="menuitem" onClick={(event) => runMessageMenuAction(event, () => toggleMessageSelection(message))}><i className="fas fa-check-square" /> Select message</button>}
                        {ownMessage && <><button type="button" role="menuitem" onClick={(event) => runMessageMenuAction(event, () => startEdit(message))}><i className="fas fa-pen" /> Edit message</button><button type="button" role="menuitem" onClick={(event) => runMessageMenuAction(event, () => deleteMessage(message))}><i className="fas fa-trash" /> Delete for everyone</button></>}
                      </div>
                    </details>}
                    {selectedMessageIds.length > 0 && ownMessage && <label className="owner-customer-chat-message-select"><input type="checkbox" checked={selectedMessageIds.includes(message.id)} aria-label={`Select your message from ${formatChatTime(message.createdAt)}`} onChange={() => toggleMessageSelection(message)} /></label>}
                  </div>
                </article>;
              })}
            </div>)}
          </div>
          <form className="owner-customer-chat-compose" onSubmit={sendReply}>
            {(replyTarget || editingMessage) && <div className="owner-customer-chat-context"><span><i className={`fas ${editingMessage ? 'fa-pen' : 'fa-reply'}`} /> {editingMessage ? 'Editing your message' : `Replying to ${replyTarget.senderRole === 'platform_owner' ? 'yourself' : selected.displayName}: ${(replyTarget.body || 'Attachment').slice(0, 90)}`}</span><button type="button" aria-label="Cancel reply or edit" onClick={clearDraftMode}><i className="fas fa-xmark" /></button></div>}
            {!editingMessage && <MessageAttachmentPicker files={pendingFiles} onFilesChange={setPendingFiles} disabled={busy} onError={setError} renderControls={({ attachmentButton, voiceButton }) => <div className="owner-customer-chat-input-row">{attachmentButton}<label className="sr-only" htmlFor="owner-customer-chat-draft">Write a reply</label><textarea ref={textareaRef} id="owner-customer-chat-draft" rows="1" maxLength={3000} required={!pendingFiles.length} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} placeholder={replyTarget ? 'Write your reply…' : 'Write a reply'} disabled={busy} />{draft.trim() || pendingFiles.length ? <button type="submit" aria-label="Send reply" disabled={busy}><i className={`fas ${busy ? 'fa-spinner fa-spin' : 'fa-paper-plane'}`} /></button> : voiceButton}</div>} />}
            {editingMessage && <div className="owner-customer-chat-input-row"><label className="sr-only" htmlFor="owner-customer-chat-draft">Edit message</label><textarea ref={textareaRef} id="owner-customer-chat-draft" rows="1" maxLength={3000} required value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} placeholder="Correct your message…" disabled={busy} /><button type="submit" aria-label="Save edit" disabled={busy || !draft.trim()}><i className={`fas ${busy ? 'fa-spinner fa-spin' : 'fa-check'}`} /></button></div>}
          </form>
        </> : <p className="owner-customer-chat-select">Select a customer conversation to open the support chat.</p>}
      </div>
    </div>
  </section>;
}
