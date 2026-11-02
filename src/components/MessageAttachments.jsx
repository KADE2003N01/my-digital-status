import React, { useEffect, useRef, useState } from 'react';
import { apiFetch } from '../services/api.js';
import { getStoredSessionToken } from '../services/adminSession.js';

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const MAX_TOTAL_SIZE = 100 * 1024 * 1024;
const MIME_BY_EXTENSION = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp',
  mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime',
  mp3: 'audio/mpeg', m4a: 'audio/mp4', aac: 'audio/aac', wav: 'audio/wav', ogg: 'audio/ogg', flac: 'audio/flac',
  pdf: 'application/pdf', txt: 'text/plain', csv: 'text/csv', zip: 'application/zip', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', ppt: 'application/vnd.ms-powerpoint', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
};

function normalizedType(file) {
  if (file.type) return file.type.toLowerCase().split(';')[0].trim();
  const ext = file.name.split('.').pop()?.toLowerCase();
  return MIME_BY_EXTENSION[ext] || '';
}

export async function uploadMessageAttachment(file) {
  const token = getStoredSessionToken();
  const response = await apiFetch('/messages/attachments', {
    method: 'POST', credentials: 'include',
    headers: {
      'Content-Type': 'application/octet-stream',
      'X-File-Name': encodeURIComponent(file.name),
      'X-File-Type': normalizedType(file),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: file
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || `Could not upload ${file.name}.`);
  return result.attachment;
}

export async function discardMessageAttachments(ids) {
  const token = getStoredSessionToken();
  await Promise.all(ids.map(async (id) => {
    const response = await apiFetch(`/messages/attachments/${id}`, {
      method: 'DELETE', credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    if (!response.ok && response.status !== 404) throw new Error('Could not remove an unused attachment.');
  }));
}

export async function downloadMessageAttachment(attachment) {
  const token = getStoredSessionToken();
  const response = await apiFetch(attachment.url, {
    credentials: 'include',
    allowBinary: true,
    headers: token ? { Authorization: 'Bearer ' + token } : {}
  });
  if (!response.ok) throw new Error('Could not download ' + (attachment.name || 'attachment') + '.');
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = attachment.name || 'attachment';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function AuthenticatedAttachment({ attachment }) {
  const isVoiceNote = attachment.mimeType.startsWith('audio/') && /^voice message\b/i.test(attachment.name || '');
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [playbackError, setPlaybackError] = useState(false);
  const [requested, setRequested] = useState(isVoiceNote);
  const [retryAttempt, setRetryAttempt] = useState(0);
  useEffect(() => {
    if (!requested) return undefined;
    let active = true;
    let objectUrl = '';
    const token = getStoredSessionToken();
    const loadAttachment = async () => {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          const response = await apiFetch(attachment.url, { credentials: 'include', allowBinary: true, headers: token ? { Authorization: `Bearer ${token}` } : {} });
          if (response.ok) {
            const blob = await response.blob();
            if (!blob.size) throw new Error('The attachment is empty on the server.');
            objectUrl = URL.createObjectURL(blob);
            if (active) setUrl(objectUrl);
            return;
          }
          const result = await response.json().catch(() => ({}));
          const error = new Error(result.error || `Attachment request failed (${response.status}).`);
          if (attempt === 2 || ![404, 429, 500, 502, 503, 504].includes(response.status)) throw error;
        } catch (loadError) {
          if (attempt === 2) throw loadError;
        }
        await new Promise((resolve) => window.setTimeout(resolve, 400 * (attempt + 1)));
      }
    };
    loadAttachment().catch((loadError) => { if (active) setError(loadError.message || 'Attachment could not be loaded.'); });
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [attachment.id, attachment.url, requested, retryAttempt]);

  if (error) return <button type="button" className="message-attachment-unavailable" onClick={() => { setError(''); setRetryAttempt((current) => current + 1); }}>{error} - Retry</button>;
  if (!requested) return <button type="button" className="message-attachment-open" onClick={() => setRequested(true)}><i className={`fas ${attachment.mimeType.startsWith('audio/') ? 'fa-volume-high' : attachment.mimeType.startsWith('video/') ? 'fa-video' : attachment.mimeType.startsWith('image/') ? 'fa-image' : 'fa-paperclip'}`} /> {attachment.mimeType.startsWith('image/') ? 'View' : attachment.mimeType.startsWith('audio/') ? 'Play' : attachment.mimeType.startsWith('video/') ? 'Play' : 'Open'} {attachment.name}</button>;
  if (!url) return <span className="message-attachment-loading">Loading {attachment.name}…</span>;
  if (attachment.mimeType.startsWith('image/')) return <a className="message-attachment-image" href={url} target="_blank" rel="noreferrer"><img src={url} alt={attachment.name} /></a>;
  if (attachment.mimeType.startsWith('video/')) return <video className="message-attachment-media" src={url} controls preload="metadata" aria-label={attachment.name} />;
  if (attachment.mimeType.startsWith('audio/')) return <div className="message-attachment-audio"><audio className="message-attachment-media" src={url} controls preload="metadata" aria-label={attachment.name} onError={() => setPlaybackError(true)} />{playbackError && <small className="message-attachment-playback-error">This browser could not play the recording. Download it from message actions to listen in another player.</small>}</div>;
  return <span className="message-attachment-file"><i className="fas fa-paperclip" /> {attachment.name}</span>;
}

export function MessageAttachmentList({ attachments = [] }) {
  if (!attachments.length) return null;
  return <div className="message-attachment-list">{attachments.map((attachment) => <AuthenticatedAttachment key={attachment.id} attachment={attachment} />)}</div>;
}

function PendingAttachmentPreview({ file, disabled, onRemove }) {
  const [previewUrl, setPreviewUrl] = useState('');
  const [playbackError, setPlaybackError] = useState(false);
  const isAudio = file.type.startsWith('audio/');
  useEffect(() => {
    if (!isAudio) return undefined;
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file, isAudio]);

  return <div className="message-attachment-pending-item">
    <span className="message-attachment-pending"><i className={`fas ${isAudio ? 'fa-volume-high' : file.type.startsWith('video/') ? 'fa-video' : file.type.startsWith('image/') ? 'fa-image' : 'fa-paperclip'}`} /> {file.name}<button type="button" aria-label={`Remove ${file.name}`} disabled={disabled} onClick={onRemove}><i className="fas fa-xmark" /></button></span>
    {previewUrl && <audio className="message-attachment-pending-audio" controls preload="metadata" src={previewUrl} aria-label={`Preview ${file.name}`} onError={() => setPlaybackError(true)} />}
    {playbackError && <small className="message-attachment-playback-error">This browser cannot preview this audio format.</small>}
  </div>;
}

export function MessageAttachmentPicker({ files, onFilesChange, disabled, onError, renderControls }) {
  const inputRef = useRef(null);
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const stopAfterStartRef = useRef(false);
  const discardRecordingRef = useRef(false);
  const recordingStartedAtRef = useRef(0);
  const recordingElapsedRef = useRef(0);
  const requestingMicrophoneRef = useRef(false);
  const [recording, setRecording] = useState(false);
  const [requestingMicrophone, setRequestingMicrophone] = useState(false);
  const [recordingPaused, setRecordingPaused] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  useEffect(() => () => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  useEffect(() => {
    if (!recording || recordingPaused) return undefined;
    const timer = window.setInterval(() => {
      setRecordingSeconds(Math.floor((recordingElapsedRef.current + Date.now() - recordingStartedAtRef.current) / 1000));
    }, 250);
    return () => window.clearInterval(timer);
  }, [recording, recordingPaused]);

  function addFiles(fileList) {
    const added = Array.from(fileList || []);
    const tooLarge = added.find((file) => file.size > MAX_FILE_SIZE);
    if (tooLarge) { onError(`${tooLarge.name} is larger than 50 MB.`); return; }
    if (files.length + added.length > 10) { onError('Attach up to 10 files to one message.'); return; }
    if ([...files, ...added].reduce((total, file) => total + file.size, 0) > MAX_TOTAL_SIZE) { onError('Attachments together must be 100 MB or smaller.'); return; }
    onFilesChange((current) => [...current, ...added]);
    onError('');
  }

  function stopRecording() {
    if (recorderRef.current?.state === 'recording' || recorderRef.current?.state === 'paused') {
      const recorder = recorderRef.current;
      if (recorder.state === 'recording') {
        try { recorder.requestData(); } catch { /* stop() still flushes the final dataavailable event. */ }
      }
      recorder.stop();
    }
    else if (requestingMicrophoneRef.current) stopAfterStartRef.current = true;
  }

  function cancelRecording() {
    discardRecordingRef.current = true;
    stopAfterStartRef.current = true;
    if (recorderRef.current?.state === 'recording' || recorderRef.current?.state === 'paused') {
      recorderRef.current.stop();
    } else if (!requestingMicrophoneRef.current) {
      setRecording(false);
      setRecordingPaused(false);
    }
  }

  function togglePauseRecording() {
    const recorder = recorderRef.current;
    if (recorder?.state === 'recording') {
      recordingElapsedRef.current += Date.now() - recordingStartedAtRef.current;
      recorder.pause();
      setRecordingPaused(true);
    } else if (recorder?.state === 'paused') {
      recordingStartedAtRef.current = Date.now();
      recorder.resume();
      setRecordingPaused(false);
    }
  }

  function toggleManualRecording() {
    if (recorderRef.current?.state === 'recording' || requestingMicrophoneRef.current) {
      stopRecording();
    } else {
      startRecording();
    }
  }

  async function startRecording() {
    if (recorderRef.current?.state === 'recording' || requestingMicrophoneRef.current) return;
    if (!window.isSecureContext) {
      onError('Microphone recording requires a secure page. Open the site over HTTPS or localhost.');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      onError('Voice recording is not supported in this browser. Try a current version of Chrome, Edge, Firefox, or Safari.');
      return;
    }
    requestingMicrophoneRef.current = true;
    setRequestingMicrophone(true);
    stopAfterStartRef.current = false;
    discardRecordingRef.current = false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/ogg', 'audio/mp4'].find((type) => MediaRecorder.isTypeSupported?.(type));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onstop = () => {
        if (!discardRecordingRef.current) {
          const type = (recorder.mimeType || 'audio/webm').split(';')[0].trim().toLowerCase();
          const extension = type.includes('ogg') ? 'ogg' : type.includes('mp4') ? 'm4a' : 'webm';
          const voiceFile = new File(chunksRef.current, `Voice message ${new Date().toLocaleString().replace(/[\\/:]/g, '-')}.${extension}`, { type });
          if (voiceFile.size > 128) addFiles([voiceFile]);
          else onError('The voice recording was empty. Please record again and wait for the recording to finish before sending.');
        }
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setRecording(false);
        setRecordingPaused(false);
        if (discardRecordingRef.current) setRecordingSeconds(0);
        discardRecordingRef.current = false;
      };
      recorder.onerror = () => {
        discardRecordingRef.current = true;
        onError('The voice recording could not be completed. Please try again.');
      };
      recordingElapsedRef.current = 0;
      recordingStartedAtRef.current = Date.now();
      setRecordingSeconds(0);
      setRecordingPaused(false);
      recorder.start();
      setRecording(true);
      requestingMicrophoneRef.current = false;
      setRequestingMicrophone(false);
      onError('');
      if (stopAfterStartRef.current) {
        stopAfterStartRef.current = false;
        recorder.stop();
      }
    } catch (error) {
      const microphoneErrors = {
        NotAllowedError: 'Microphone access is blocked. Allow microphone access for this site in your browser settings, then try again.',
        SecurityError: 'The browser blocked microphone access. Check this site’s microphone permission and use HTTPS or localhost.',
        NotFoundError: 'No microphone was found. Connect or enable a microphone, then try again.',
        DevicesNotFoundError: 'No microphone was found. Connect or enable a microphone, then try again.',
        NotReadableError: 'The microphone could not start. It may be in use by another app or unavailable to the browser.',
        TrackStartError: 'The microphone could not start. Check that it is connected and not being used by another app.',
        OverconstrainedError: 'The microphone does not support the requested recording settings. Try another microphone.',
        AbortError: 'Microphone startup was interrupted. Please try again.'
      };
      onError(microphoneErrors[error?.name] || `Could not start voice recording${error?.message ? `: ${error.message}` : '.'}`);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      requestingMicrophoneRef.current = false;
      setRequestingMicrophone(false);
      if (discardRecordingRef.current) {
        discardRecordingRef.current = false;
        setRecording(false);
        setRecordingPaused(false);
        setRecordingSeconds(0);
      }
    }
  }

  const formatRecordingTime = (seconds) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  const recordingControls = <div className={`message-recording-controls${recordingPaused ? ' is-paused' : ''}`} role="group" aria-label="Voice recording controls">
    <button type="button" className="message-recording-cancel" aria-label="Delete voice recording" title="Delete recording" disabled={disabled} onClick={cancelRecording}><i className="fas fa-trash" aria-hidden="true" /></button>
    <span className="message-recording-timer"><span className="message-recording-indicator" aria-hidden="true" />{formatRecordingTime(recordingSeconds)}</span>
    <div className="message-recording-waveform" role="img" aria-label="Recording waveform">{[7, 12, 18, 10, 23, 15, 27, 11, 19, 8, 24, 14, 30, 18, 10, 22, 14, 26, 9, 17, 29, 13, 21, 8, 18, 27, 12, 23, 15, 30, 10, 20].map((height, index) => <span key={index} style={{ '--wave-height': `${height}px`, '--wave-delay': `${(index % 8) * -0.11}s` }} />)}</div>
    <button type="button" className="message-recording-pause" aria-label={recordingPaused ? 'Resume voice recording' : 'Pause voice recording'} title={recordingPaused ? 'Resume' : 'Pause'} disabled={disabled} onClick={togglePauseRecording}><i className={`fas ${recordingPaused ? 'fa-play' : 'fa-pause'}`} aria-hidden="true" /></button>
    <button type="button" className="message-recording-stop" aria-label="Stop recording and review voice message" title="Stop and review" disabled={disabled} onClick={stopRecording}><i className="fas fa-stop" aria-hidden="true" /></button>
  </div>;

  const attachmentButton = <button type="button" className="message-attachment-inline-button" aria-label="Attach files" title="Attach files" disabled={disabled || recording} onClick={() => inputRef.current?.click()}><i className="fas fa-paperclip" aria-hidden="true" /></button>;
  const voiceButton = <button
    type="button"
    className={`message-voice-inline-button${recording ? ' is-recording' : ''}`}
    aria-label={requestingMicrophone ? 'Connecting microphone' : recording ? 'Stop recording and review voice message' : 'Start recording voice message'}
    title={requestingMicrophone ? 'Connecting microphone…' : recording ? 'Stop recording and review voice message' : 'Click to record a voice message'}
    disabled={disabled || requestingMicrophone}
    onClick={toggleManualRecording}
  ><i className={`fas ${requestingMicrophone ? 'fa-spinner fa-spin' : recording ? 'fa-paper-plane' : 'fa-microphone'}`} aria-hidden="true" /></button>;

  return <div className={`message-attachment-picker${typeof renderControls === 'function' ? ' is-inline-composer' : ''}${recording ? ' is-recording' : ''}`}>
    <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime,audio/mpeg,audio/mp4,audio/aac,audio/wav,audio/ogg,audio/webm,audio/flac,application/pdf,text/plain,text/csv,application/zip,.doc,.docx,.xls,.xlsx,.ppt,.pptx" multiple hidden disabled={disabled} onChange={(event) => { addFiles(event.target.files); event.target.value = ''; }} />
    {typeof renderControls === 'function'
      ? renderControls({ attachmentButton, voiceButton, recording, requestingMicrophone, recordingPaused, recordingControls })
      : <><button type="button" className="message-attachment-action" disabled={disabled || recording} onClick={() => inputRef.current?.click()}><i className="fas fa-paperclip" /> Attach files</button>
        <button type="button" className={`message-attachment-action${recording ? ' is-recording' : ''}`} disabled={disabled || requestingMicrophone} onClick={toggleManualRecording} title="Records a voice note using your computer’s microphone; this is not speech-to-text dictation."><i className={`fas ${requestingMicrophone ? 'fa-spinner fa-spin' : recording ? 'fa-stop' : 'fa-microphone'}`} /> {requestingMicrophone ? 'Connecting microphone…' : recording ? 'Stop recording' : 'Record voice'}</button></>}
    {recording && recordingControls}
    {files.map((file, index) => <PendingAttachmentPreview key={`${file.name}-${file.lastModified}-${index}`} file={file} disabled={disabled || recording} onRemove={() => onFilesChange((current) => current.filter((_, itemIndex) => itemIndex !== index))} />)}
  </div>;
}
