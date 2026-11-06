import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch } from '../../services/api.js';
import { MessageAttachmentPicker } from '../../components/MessageAttachments.jsx';
import MessageReactionPicker, { getReactionDisplay } from '../messages/MessageReactionPicker.jsx';
import ExpandableMessageText from '../messages/ExpandableMessageText.jsx';
import { formatChatTime, getChatDayLabel, getMessageInitials } from '../messages/chatFormatting.js';

async function supportChatRequest(path, options = {}) {
  const response = await apiFetch(`/customer-workspace/support-chat${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      ...(options.body && typeof options.body === 'string' ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers
    }
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result.error || 'The support chat request could not be completed.');
  }
  return response;
}

function createObjectUrl(blob) {
  return URL.createObjectURL(blob);
}

export function CustomerChatAttachment({ attachment, requestAttachment }) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  async function openAttachment(download = false) {
    setError('');
    try {
      const response = requestAttachment
        ? await requestAttachment(attachment)
        : await supportChatRequest(`/attachments/${encodeURIComponent(attachment.id)}`, { allowBinary: true });
      if (!response.ok) throw new Error(`Could not load ${attachment.name}.`);
      const objectUrl = createObjectUrl(await response.blob());
      if (download || (!attachment.mimeType.startsWith('image/') && !attachment.mimeType.startsWith('audio/') && !attachment.mimeType.startsWith('video/'))) {
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = attachment.name;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      } else {
        setUrl((current) => {
          if (current) URL.revokeObjectURL(current);
          return objectUrl;
        });
      }
    } catch (requestError) {
      setError(requestError.message || `Could not load ${attachment.name}.`);
    }
  }

  return <div className="platform-support-attachment">
    {url && attachment.mimeType.startsWith('image/') && <a href={url} target="_blank" rel="noreferrer"><img src={url} alt={attachment.name} /></a>}
    {url && attachment.mimeType.startsWith('video/') && <video src={url} controls preload="metadata" aria-label={attachment.name} />}
    {url && attachment.mimeType.startsWith('audio/') && <audio src={url} controls preload="metadata" aria-label={attachment.name} />}
    {!url && <button type="button" onClick={() => openAttachment()}><i className={`fas ${attachment.mimeType.startsWith('image/') ? 'fa-image' : attachment.mimeType.startsWith('video/') ? 'fa-video' : attachment.mimeType.startsWith('audio/') ? 'fa-volume-high' : 'fa-paperclip'}`} /> {attachment.name}</button>}
    <button className="platform-support-attachment-download" type="button" onClick={() => openAttachment(true)} aria-label={`Download ${attachment.name}`} title="Download"><i className="fas fa-download" /></button>
    {error && <small role="alert">{error}</small>}
  </div>;
}

function CustomerSupportMessage({ message, messages, selected, selecting, onTouchStart, onTouchEnd, onTouchCancel, onReply, onEdit, onDelete, onReact, onCopy, onForward, onFlag, onSelect }) {
  const ownMessage = message.senderRole === 'customer';
  const repliedTo = messages.find((item) => item.id === message.replyToMessageId);
  const displayName = ownMessage ? 'You' : 'FolioSpace support';
  const runMenuAction = (event, action) => {
    event.currentTarget.closest('details').open = false;
    action();
  };
  const positionMenu = (event) => {
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
    menu.style.setProperty('--platform-support-menu-left', `${left}px`);
    menu.style.setProperty('--platform-support-menu-top', `${top}px`);
  };
  return <article className={`platform-support-message is-${message.senderRole}${message.deletedAt ? ' is-deleted' : ''}${selected ? ' is-selected' : ''}`} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} onTouchCancel={onTouchCancel} onContextMenu={(event) => { if (window.matchMedia('(hover: none)').matches) event.preventDefault(); }}>
    {!ownMessage && <span className="platform-support-avatar" aria-hidden="true">{getMessageInitials('FolioSpace support')}</span>}
    <div className="platform-support-message-bubble">
      <strong>{displayName}</strong>
      {repliedTo && !message.deletedAt && <div className="platform-support-reply-quote"><b>Replying to {repliedTo.senderRole === 'customer' ? 'you' : 'FolioSpace support'}</b><span>{repliedTo.deletedAt ? 'Message deleted' : repliedTo.body || 'Attachment'}</span></div>}
      {message.deletedAt
        ? <p className="platform-support-deleted-copy"><i className="fas fa-ban" aria-hidden="true" /> This message was deleted.</p>
        : <><ExpandableMessageText key={`${message.id}-${message.body}`}>{message.body}</ExpandableMessageText>
          {message.attachments?.map((attachment) => <CustomerChatAttachment key={attachment.id} attachment={attachment} />)}
          {(message.isPinned || message.isStarred) && <small className="platform-support-flags">{message.isPinned && <span><i className="fas fa-thumbtack" /> Pinned</span>}{message.isStarred && <span><i className="fas fa-star" /> Starred</span>}</small>}
          {message.editedAt && <small className="platform-support-edited">Edited</small>}
          {message.reactions?.length > 0 && <div className="platform-support-reactions">{message.reactions.map((reaction) => {
            const display = getReactionDisplay(reaction.emoji);
            return <button type="button" key={reaction.emoji} className={reaction.reacted ? 'is-reacted' : ''} aria-label={`${display.label}, ${reaction.count} reactions`} onClick={() => onReact(message, reaction.emoji)}><i className={display.icon} aria-hidden="true" /> {reaction.count}</button>;
          })}</div>}
        </>}
      <footer><time dateTime={message.createdAt}>{formatChatTime(message.createdAt)}</time>{ownMessage && !message.deletedAt && <span className={message.isRead ? 'is-read' : ''} role="img" aria-label={message.isRead ? 'Read by support' : 'Sent'} title={message.isRead ? 'Read by support' : 'Sent'}><i className={`fas ${message.isRead ? 'fa-check-double' : 'fa-check'}`} aria-hidden="true" /></span>}</footer>
      {!message.deletedAt && <details className="platform-support-message-menu" onToggle={positionMenu}>
        <summary aria-label="Message actions" title="Message actions"><i className="fas fa-ellipsis" /></summary>
        <div role="menu" aria-label="Message actions">
          <MessageReactionPicker onSelect={(emoji, event) => { event.currentTarget.closest('details').open = false; onReact(message, emoji); }} />
          <button type="button" role="menuitem" onClick={(event) => runMenuAction(event, () => onReply(message))}><i className="fas fa-reply" /> Reply</button>
          <button type="button" role="menuitem" onClick={(event) => runMenuAction(event, () => onCopy(message))}><i className="fas fa-copy" /> Copy</button>
          <button type="button" role="menuitem" onClick={(event) => runMenuAction(event, () => onForward(message))}><i className="fas fa-share" /> Forward message</button>
          <button type="button" role="menuitem" onClick={(event) => runMenuAction(event, () => onFlag(message, 'pin', !message.isPinned))}><i className="fas fa-thumbtack" /> {message.isPinned ? 'Unpin' : 'Pin'}</button>
          <button type="button" role="menuitem" onClick={(event) => runMenuAction(event, () => onFlag(message, 'star', !message.isStarred))}><i className="fas fa-star" /> {message.isStarred ? 'Unstar' : 'Star'}</button>
          {ownMessage && <button type="button" role="menuitem" onClick={(event) => runMenuAction(event, () => onSelect(message))}><i className="fas fa-check-square" /> Select message</button>}
          {ownMessage && <><button type="button" role="menuitem" onClick={(event) => runMenuAction(event, () => onEdit(message))}><i className="fas fa-pen" /> Edit message</button><button type="button" role="menuitem" onClick={(event) => runMenuAction(event, () => onDelete(message))}><i className="fas fa-trash" /> Delete for everyone</button></>}
        </div>
      </details>}
      {selecting && ownMessage && <label className="platform-support-message-select"><input type="checkbox" checked={selected} aria-label={`Select your message from ${formatChatTime(message.createdAt)}`} onChange={() => onSelect(message)} /></label>}
    </div>
  </article>;
}

export default function CustomerSupportChat() {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [pendingFiles, setPendingFiles] = useState([]);
  const [replyTarget, setReplyTarget] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [conversationSearch, setConversationSearch] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [selectedMessageIds, setSelectedMessageIds] = useState([]);
  const [deletingSelected, setDeletingSelected] = useState(false);
  const historyRef = useRef(null);
  const textareaRef = useRef(null);
  const atBottomRef = useRef(true);
  const pollingRef = useRef(false);
  const longPressTimer = useRef(null);

  function cancelMessageLongPress() {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    historyRef.current?.querySelector('.platform-support-message.is-long-press')?.classList.remove('is-long-press');
  }

  function startMessageLongPress(event) {
    if (event.touches.length !== 1) return;
    cancelMessageLongPress();
    const touch = event.touches[0];
    longPressTimer.current = window.setTimeout(() => {
      longPressTimer.current = null;
      const article = event.target.closest?.('.platform-support-message');
      const menu = article?.querySelector('details.platform-support-message-menu');
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
    event.target.closest?.('.platform-support-message')?.classList.add('is-long-press');
  }

  useEffect(() => cancelMessageLongPress, []);

  const loadMessages = useCallback(async () => {
    const response = await supportChatRequest('');
    const result = await response.json();
    setMessages(result.messages || []);
  }, []);

  useEffect(() => {
    let active = true;
    loadMessages().catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    const refresh = async () => {
      if (document.hidden || pollingRef.current) return;
      pollingRef.current = true;
      try { await loadMessages(); }
      catch (requestError) { if (!document.hidden) setError(requestError.message); }
      finally { pollingRef.current = false; }
    };
    const timer = window.setInterval(refresh, 5000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [loadMessages]);

  useEffect(() => {
    const history = historyRef.current;
    if (history && atBottomRef.current) history.scrollTop = history.scrollHeight;
  }, [messages.length, loading]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    const maxHeight = 140;
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }, [draft]);

  const filteredMessages = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return query ? messages.filter((message) => `${message.body} ${message.attachments?.map((file) => file.name).join(' ')}`.toLocaleLowerCase().includes(query)) : messages;
  }, [messages, search]);
  const visibleConversation = useMemo(() => {
    const query = conversationSearch.trim().toLocaleLowerCase();
    const lastMessage = messages.at(-1);
    return !query || `foliospace support support conversation ${lastMessage?.body || ''} ${lastMessage?.attachments?.map((file) => file.name).join(' ') || ''}`.toLocaleLowerCase().includes(query);
  }, [conversationSearch, messages]);
  const groupedMessages = useMemo(() => {
    const groups = [];
    filteredMessages.forEach((message) => {
      const day = new Date(message.createdAt);
      const key = Number.isNaN(day.getTime()) ? 'unknown' : `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
      let group = groups.at(-1);
      if (!group || group.key !== key) {
        group = { key, label: getChatDayLabel(message.createdAt), messages: [] };
        groups.push(group);
      }
      group.messages.push(message);
    });
    return groups;
  }, [filteredMessages]);

  async function uploadFile(file) {
    const response = await supportChatRequest('/attachments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream', 'X-File-Name': encodeURIComponent(file.name), 'X-File-Type': file.type },
      body: file
    });
    return (await response.json()).attachment;
  }

  async function discardAttachments(attachments) {
    await Promise.all(attachments.map(async (attachment) => {
      const response = await supportChatRequest(`/attachments/${encodeURIComponent(attachment.id)}`, { method: 'DELETE' });
      if (!response.ok) throw new Error(`Could not discard ${attachment.name}.`);
    }));
  }

  async function sendMessage(event) {
    event.preventDefault();
    if (sending || (!draft.trim() && !pendingFiles.length)) return;
    setSending(true);
    setError('');
    setNotice('');
    let uploaded = [];
    try {
      if (editingMessage) {
        const response = await supportChatRequest(`/${editingMessage.id}`, { method: 'PATCH', body: JSON.stringify({ body: draft.trim() }) });
        const result = await response.json();
        setMessages((current) => current.map((message) => message.id === editingMessage.id ? result.message : message));
      } else {
        for (const file of pendingFiles) uploaded.push(await uploadFile(file));
        const response = await supportChatRequest('', {
          method: 'POST',
          body: JSON.stringify({ body: draft.trim(), attachmentIds: uploaded.map((file) => file.id), ...(replyTarget ? { replyToMessageId: replyTarget.id } : {}) })
        });
        const result = await response.json();
        setMessages((current) => [...current.filter((message) => message.id !== result.message.id), result.message]);
      }
      setDraft('');
      setPendingFiles([]);
      setReplyTarget(null);
      setEditingMessage(null);
    } catch (requestError) {
      if (uploaded.length) {
        try { await discardAttachments(uploaded); }
        catch (cleanupError) { setError(`${requestError.message} ${cleanupError.message}`); }
      }
      setError((current) => current || requestError.message || 'The message could not be sent.');
    } finally { setSending(false); }
  }

  async function reactToMessage(message, emoji) {
    try {
      const response = await supportChatRequest(`/${message.id}/reactions`, { method: 'POST', body: JSON.stringify({ emoji }) });
      const result = await response.json();
      setMessages((current) => current.map((item) => item.id === message.id ? { ...item, reactions: result.reactions || [] } : item));
    } catch (requestError) { setError(requestError.message); }
  }

  async function toggleMessageFlag(message, flag, enabled) {
    try {
      const response = await supportChatRequest(`/${message.id}/flags`, { method: 'POST', body: JSON.stringify({ flag, enabled }) });
      const result = await response.json();
      setMessages((current) => current.map((item) => item.id === message.id ? { ...item, isPinned: result.isPinned, isStarred: result.isStarred } : item));
    } catch (requestError) { setError(requestError.message); }
  }

  function toggleMessageSelection(message) {
    setSelectedMessageIds((current) => current.some((id) => id === message.id)
      ? current.filter((id) => id !== message.id)
      : [...current, message.id]);
  }

  async function deleteSelectedMessages() {
    const selected = messages.filter((message) => selectedMessageIds.includes(message.id) && message.senderRole === 'customer' && !message.deletedAt);
    if (!selected.length || deletingSelected) return;
    if (!window.confirm(`Delete ${selected.length} selected message${selected.length === 1 ? '' : 's'} for everyone?`)) return;
    setDeletingSelected(true);
    setError('');
    let deleted = 0;
    try {
      for (const message of selected) {
        const response = await supportChatRequest(`/${message.id}`, { method: 'DELETE' });
        const result = await response.json();
        setMessages((current) => current.map((item) => item.id === message.id ? result.message : item));
        deleted += 1;
      }
      setSelectedMessageIds([]);
      setNotice(`${deleted} message${deleted === 1 ? '' : 's'} deleted for everyone.`);
    } catch (requestError) {
      setSelectedMessageIds((current) => current.filter((id) => !selected.slice(0, deleted).some((message) => message.id === id)));
      setError(`${deleted ? `${deleted} message${deleted === 1 ? '' : 's'} deleted. ` : ''}${requestError.message}`);
    } finally { setDeletingSelected(false); }
  }

  function prepareForward(message) {
    const from = message.senderRole === 'customer' ? 'you' : 'FolioSpace support';
    const attachmentNote = message.attachments?.length
      ? `\n\n[${message.attachments.length} attachment${message.attachments.length === 1 ? '' : 's'} not included in this forwarded copy.]`
      : '';
    setReplyTarget(null);
    setEditingMessage(null);
    setPendingFiles([]);
    setDraft(`Forwarded message from ${from}:\n\n${(message.body || '[Attachment]').slice(0, 2700)}${attachmentNote}`);
    window.setTimeout(() => textareaRef.current?.focus(), 0);
  }

  async function deleteMessage(message) {
    if (!window.confirm('Delete this message for everyone in the support conversation?')) return;
    try {
      const response = await supportChatRequest(`/${message.id}`, { method: 'DELETE' });
      const result = await response.json();
      setMessages((current) => current.map((item) => item.id === message.id ? result.message : item));
    } catch (requestError) { setError(requestError.message); }
  }

  async function copyMessage(message) {
    try {
      await navigator.clipboard.writeText(message.body || '');
      setNotice('Message copied.');
      setError('');
    } catch (copyError) { setError(`Could not copy this message: ${copyError.message}`); }
  }

  function beginEdit(message) {
    setEditingMessage(message);
    setReplyTarget(null);
    setDraft(message.body);
    setPendingFiles([]);
    window.setTimeout(() => textareaRef.current?.focus(), 0);
  }

  function beginReply(message) {
    setReplyTarget(message);
    setEditingMessage(null);
    setDraft('');
    window.setTimeout(() => textareaRef.current?.focus(), 0);
  }

  function cancelDraftMode() {
    setReplyTarget(null);
    setEditingMessage(null);
    setDraft('');
    setPendingFiles([]);
  }

  return <section className="platform-support-chat" aria-label="Request chat with FolioSpace support">
    <div className="platform-support-chat-frame">
      <aside className="platform-support-chat-sidebar" aria-label="Support conversations">
        <div className="platform-support-chat-sidebar-top">
          <a href="/platform/account?section=support" aria-label="Back to support requests"><i className="fas fa-arrow-left" /></a>
          <strong>Messages</strong>
        </div>
        <label className="platform-support-conversation-search"><i className="fas fa-magnifying-glass" aria-hidden="true" /><input type="search" value={conversationSearch} onChange={(event) => setConversationSearch(event.target.value)} placeholder="Find a conversation" aria-label="Search support conversations" /></label>
        <h2>Requests <span>{visibleConversation ? '1' : '0'}</span></h2>
        {visibleConversation
          ? <button type="button" className="platform-support-conversation is-active" aria-current="page">
            <span className="platform-support-conversation-avatar"><i className="fas fa-headset" /></span>
            <span className="platform-support-conversation-copy"><strong>Request</strong><small>FolioSpace support</small><small>{messages.at(-1)?.body || (messages.at(-1)?.attachments?.length ? 'Attachment' : error ? 'Conversation unavailable' : 'Start a conversation')}</small></span>
          </button>
          : <p className="platform-support-no-conversations">No conversations match your search.</p>}
      </aside>
      <div className="platform-support-chat-conversation">
        <header className="platform-support-chat-toolbar">
          <span className="platform-support-chat-owner-avatar" aria-hidden="true"><i className="fas fa-headset" /></span>
          <div><strong>Request</strong><small>FolioSpace support team</small></div>
          <label className="platform-support-chat-search"><i className="fas fa-magnifying-glass" aria-hidden="true" /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search messages" aria-label="Search messages in this chat" /></label>
        </header>
        <div ref={historyRef} className="platform-support-chat-history" onScroll={(event) => {
          const history = event.currentTarget;
          atBottomRef.current = history.scrollHeight - history.scrollTop - history.clientHeight < 72;
        }} aria-live="polite">
        {(error || notice) && <p className={`platform-support-chat-feedback${error ? ' is-error' : ''}`} role={error ? 'alert' : 'status'}>{error || notice}<button type="button" aria-label="Dismiss message" onClick={() => { setError(''); setNotice(''); }}>×</button></p>}
        {selectedMessageIds.length > 0 && <div className="platform-support-selection-bar" role="group" aria-label="Selected messages">
          <span>{selectedMessageIds.length} selected</span>
          <button type="button" className="is-danger" onClick={deleteSelectedMessages} disabled={deletingSelected}><i className={`fas ${deletingSelected ? 'fa-spinner fa-spin' : 'fa-trash'}`} /> {deletingSelected ? 'Deleting…' : 'Delete selected'}</button>
          <button type="button" onClick={() => setSelectedMessageIds([])}>Cancel</button>
        </div>}
        {loading && <p className="platform-support-chat-empty">Loading conversation…</p>}
        {!loading && messages.length === 0 && !error && <p className="platform-support-chat-empty">No messages in this conversation yet.</p>}
        {!loading && messages.length > 0 && filteredMessages.length === 0 && <p className="platform-support-chat-empty">No messages match your search.</p>}
        {groupedMessages.map((group) => <div className="platform-support-chat-day" key={group.key}>
          <div className="platform-support-chat-day-label"><span>{group.label}</span></div>
          {group.messages.map((message) => <CustomerSupportMessage key={message.id} message={message} messages={messages} selected={selectedMessageIds.includes(message.id)} selecting={selectedMessageIds.length > 0} onTouchStart={startMessageLongPress} onTouchEnd={cancelMessageLongPress} onTouchCancel={cancelMessageLongPress} onReply={beginReply} onEdit={beginEdit} onDelete={deleteMessage} onReact={reactToMessage} onCopy={copyMessage} onForward={prepareForward} onFlag={toggleMessageFlag} onSelect={toggleMessageSelection} />)}
        </div>)}
      </div>
      <form className="platform-support-chat-compose" onSubmit={sendMessage}>
        {(replyTarget || editingMessage) && <div className="platform-support-chat-context"><span><i className={`fas ${editingMessage ? 'fa-pen' : 'fa-reply'}`} /> {editingMessage ? 'Editing your message' : `Replying to ${replyTarget.senderRole === 'customer' ? 'yourself' : 'FolioSpace support'}: ${(replyTarget.body || 'Attachment').slice(0, 100)}`}</span><button type="button" onClick={cancelDraftMode} aria-label="Cancel reply or edit"><i className="fas fa-xmark" /></button></div>}
        {!editingMessage && <MessageAttachmentPicker files={pendingFiles} onFilesChange={setPendingFiles} disabled={sending} onError={setError} renderControls={({ attachmentButton, voiceButton }) => <div className="platform-support-chat-input-row">
          {attachmentButton}
          <label className="sr-only" htmlFor="support-chat-message">Write a message</label>
          <textarea ref={textareaRef} id="support-chat-message" rows="1" maxLength={3000} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} placeholder={replyTarget ? 'Write your reply…' : 'Write a message…'} disabled={sending} required={!pendingFiles.length} />
          {draft.trim() || pendingFiles.length ? <button className="platform-support-chat-send" type="submit" aria-label="Send message" title="Send message" disabled={sending}><i className={`fas ${sending ? 'fa-spinner fa-spin' : 'fa-paper-plane'}`} /></button> : voiceButton}
        </div>} />}
        {editingMessage && <div className="platform-support-chat-input-row">
          <label className="sr-only" htmlFor="support-chat-message">Edit message</label>
          <textarea ref={textareaRef} id="support-chat-message" rows="1" maxLength={3000} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} placeholder="Correct your message…" disabled={sending} required />
          <button className="platform-support-chat-send" type="submit" aria-label="Save message" title="Save message" disabled={sending || !draft.trim()}><i className={`fas ${sending ? 'fa-spinner fa-spin' : 'fa-check'}`} /></button>
        </div>}
        <small>Enter to send · Shift + Enter for a new line</small>
      </form>
      </div>
    </div>
  </section>;
}
