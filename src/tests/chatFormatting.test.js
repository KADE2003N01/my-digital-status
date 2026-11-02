import { describe, expect, it } from 'vitest';
import { formatChatTime, getChatDayLabel, getMessageInitials, getMessageReceiptState, groupMessagesByDay } from '../pages/messages/chatFormatting.js';

describe('chat formatting', () => {
  it('creates initials for sender avatars', () => {
    expect(getMessageInitials('  Kade Computer Science ')).toBe('KC');
    expect(getMessageInitials('Admin')).toBe('A');
    expect(getMessageInitials('')).toBe('?');
  });

  it('groups messages by local calendar day without changing their order', () => {
    const messages = [
      { id: 1, createdAt: '2024-01-02T09:00:00' },
      { id: 2, createdAt: '2024-01-02T11:00:00' },
      { id: 3, createdAt: '2024-01-03T08:00:00' }
    ];

    expect(groupMessagesByDay(messages).map(({ label, messages: grouped }) => [label, grouped.map(({ id }) => id)]))
      .toEqual([['Tuesday, January 2, 2024', [1, 2]], ['Wednesday, January 3, 2024', [3]]]);
  });

  it('labels today and yesterday and formats bubble times', () => {
    const now = new Date(2024, 0, 3, 12);
    expect(getChatDayLabel(new Date(2024, 0, 3, 8), now)).toBe('Today');
    expect(getChatDayLabel(new Date(2024, 0, 2, 8), now)).toBe('Yesterday');
    expect(formatChatTime('not-a-date')).toBe('');
  });

  it('uses the strongest available recipient receipt', () => {
    expect(getMessageReceiptState({})).toBe('sent');
    expect(getMessageReceiptState({ isDelivered: true })).toBe('delivered');
    expect(getMessageReceiptState({ isDelivered: true, isReadByRecipient: true })).toBe('read');
  });
});
