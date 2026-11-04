import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import MessageReactionPicker, { messageReactions } from '../pages/messages/MessageReactionPicker.jsx';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('message reaction picker', () => {
  let host;
  let root;

  afterEach(async () => {
    if (root) await act(async () => root.unmount());
    host?.remove();
    root = null;
    host = null;
  });

  it('shows four reactions initially and reveals the rest from the plus button', async () => {
    const onSelect = vi.fn();
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    await act(async () => root.render(<MessageReactionPicker onSelect={onSelect} />));

    expect(host.querySelectorAll('button[role="menuitem"]')).toHaveLength(4);
    const moreButton = host.querySelector('[aria-label="Show more reactions"]');
    expect(moreButton).not.toBeNull();

    await act(async () => moreButton.click());
    expect(host.querySelectorAll('button[role="menuitem"]')).toHaveLength(12);

    const fireReaction = host.querySelector('[aria-label="React with Fire"]');
    expect(fireReaction).not.toBeNull();
    await act(async () => fireReaction.click());
    expect(onSelect).toHaveBeenCalledWith(messageReactions.find(({ label }) => label === 'Fire').emoji, expect.any(Object));

    await act(async () => host.querySelector('[aria-label="Show fewer reactions"]').click());
    expect(host.querySelectorAll('button[role="menuitem"]')).toHaveLength(4);
  });
});
