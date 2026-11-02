function parseChatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function chatDayKey(value) {
  const date = parseChatDate(value);
  if (!date) return 'unknown';
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

export function formatChatTime(value) {
  const date = parseChatDate(value);
  return date ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
}

export function getMessageInitials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0].toLocaleUpperCase()).join('') || '?';
}

export function getChatDayLabel(value, now = new Date()) {
  const date = parseChatDate(value);
  if (!date) return 'Date unavailable';
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const messageDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const daysAgo = Math.round((today.getTime() - messageDay.getTime()) / 86400000);
  if (daysAgo === 0) return 'Today';
  if (daysAgo === 1) return 'Yesterday';
  return date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

export function groupMessagesByDay(messages) {
  const groups = [];
  messages.forEach((message) => {
    const key = chatDayKey(message.createdAt);
    let group = groups[groups.length - 1];
    if (!group || group.key !== key) {
      group = { key, label: getChatDayLabel(message.createdAt), messages: [] };
      groups.push(group);
    }
    group.messages.push(message);
  });
  return groups;
}

export function getMessageReceiptState(message) {
  if (message.isReadByRecipient) return 'read';
  if (message.isDelivered) return 'delivered';
  return 'sent';
}
