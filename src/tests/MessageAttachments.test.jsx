import React, { act, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MessageAttachmentPicker } from '../components/MessageAttachments.jsx';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('message voice composer', () => {
  let host;
  let root;

  afterEach(async () => {
    if (root) await act(async () => root.unmount());
    host?.remove();
    root = null;
    host = null;
    delete window.URL.createObjectURL;
    delete window.URL.revokeObjectURL;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('toggles voice recording, previews the unsent voice note, and lets the user remove it', async () => {
    const track = { stop: vi.fn() };
    const stream = { getTracks: () => [track] };
    const getUserMedia = vi.fn().mockResolvedValue(stream);
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } });
    Object.defineProperty(window, 'isSecureContext', { configurable: true, value: true });
    Object.defineProperty(window.URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:voice-preview') });
    Object.defineProperty(window.URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });

    class TestMediaRecorder {
      static isTypeSupported() { return true; }
      constructor(_stream, options) { this.mimeType = options?.mimeType || 'audio/webm'; this.state = 'inactive'; }
      start() { this.state = 'recording'; }
      pause() { this.state = 'paused'; }
      resume() { this.state = 'recording'; }
      stop() {
        this.state = 'inactive';
        this.ondataavailable?.({ data: new Blob(['voice clip'], { type: 'audio/webm' }) });
        this.onstop?.();
      }
    }
    vi.stubGlobal('MediaRecorder', TestMediaRecorder);

    function Harness() {
      const [files, setFiles] = useState([]);
      return <MessageAttachmentPicker files={files} onFilesChange={setFiles} disabled={false} onError={vi.fn()} renderControls={({ attachmentButton, voiceButton }) => <>
        {attachmentButton}{voiceButton}{files.length > 0 && <button type="submit">Send voice</button>}
      </>} />;
    }

    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    await act(async () => root.render(<Harness />));

    const voiceButton = host.querySelector('.message-voice-inline-button');
    await act(async () => {
      voiceButton.click();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(getUserMedia).toHaveBeenCalledWith({ audio: true });
    expect(voiceButton.classList.contains('is-recording')).toBe(true);
    expect(voiceButton.querySelector('i')?.classList.contains('fa-paper-plane')).toBe(true);
    expect(voiceButton.getAttribute('aria-label')).toBe('Stop recording and review voice message');
    expect(host.querySelector('.message-recording-waveform')).not.toBeNull();
    expect(host.querySelector('.message-recording-timer')?.textContent).toContain('0:00');

    await act(async () => {
      host.querySelector('[aria-label="Pause voice recording"]').click();
      await Promise.resolve();
    });
    expect(host.querySelector('[aria-label="Resume voice recording"]')).not.toBeNull();

    await act(async () => {
      host.querySelector('[aria-label="Resume voice recording"]').click();
      await Promise.resolve();
    });

    await act(async () => {
      host.querySelector('[aria-label="Stop recording and review voice message"]').click();
      await Promise.resolve();
    });
    expect(host.querySelector('audio[aria-label^="Preview Voice message"]')).not.toBeNull();
    expect(host.querySelector('button[type="submit"]')?.textContent).toBe('Send voice');
    expect(host.querySelector('[aria-label="Play voice message"]')).not.toBeNull();
    const audio = host.querySelector('audio');
    audio.play = vi.fn().mockResolvedValue(undefined);
    await act(async () => host.querySelector('[aria-label="Play voice message"]').click());
    expect(audio.play).toHaveBeenCalledOnce();
    expect(host.querySelector('[aria-label="Pause voice message"]')).not.toBeNull();

    await act(async () => host.querySelector('[aria-label^="Remove Voice message"]').click());
    expect(host.querySelector('audio')).toBeNull();
    expect(host.querySelector('button[type="submit"]')).toBeNull();
    expect(track.stop).toHaveBeenCalled();

    await act(async () => {
      host.querySelector('.message-voice-inline-button').click();
      await Promise.resolve();
      await Promise.resolve();
    });
    await act(async () => host.querySelector('[aria-label="Delete voice recording"]').click());
    expect(host.querySelector('audio')).toBeNull();
    expect(host.querySelector('[aria-label="Delete voice recording"]')).toBeNull();
  });
});
