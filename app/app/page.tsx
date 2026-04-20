'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { detectDocumentType } from '@/lib/auto-detect';
import { BUILT_IN_TEMPLATES, fillTemplate, type DocumentTemplate } from '@/lib/templates-fillable';
import { useBranding } from '@/lib/BrandingContext';
import {
  CitationPanel,
  RedactionPanel,
  CompliancePanel,
  MultiDocPanel,
} from '@/app/components/features';

// === Types ===
type DocMode = 'general' | 'legal-letter' | 'legal-memo' | 'court-filing' | 'demand-letter' | 'deposition-summary' | 'engagement-letter' | 'accounting-report' | 'tax-advisory' | 'audit-opinion' | 'client-email' | 'meeting-notes';
type Panel = 'none' | 'settings' | 'vocabulary' | 'hotkeys' | 'history' | 'templates';

interface BatchFileStatus {
  filename: string;
  status: 'pending' | 'transcribing' | 'done' | 'error';
  text?: string;
  error?: string;
  duration?: number;
}
interface HistoryItem { id: string; raw: string; enhanced: string; mode: DocMode; date: string; audioData?: string; audioMimeType?: string; }
interface HotkeyConfig { record: string; enhance: string; copy: string; clear: string; export: string; }

// === Mode Configs ===
const MODES: { value: DocMode; label: string; cat: string }[] = [
  { value: 'general', label: 'General cleanup', cat: 'general' },
  { value: 'legal-letter', label: 'Legal letter', cat: 'legal' },
  { value: 'legal-memo', label: 'Legal memorandum', cat: 'legal' },
  { value: 'court-filing', label: 'Court filing', cat: 'legal' },
  { value: 'demand-letter', label: 'Demand letter', cat: 'legal' },
  { value: 'deposition-summary', label: 'Deposition summary', cat: 'legal' },
  { value: 'engagement-letter', label: 'Engagement letter', cat: 'legal' },
  { value: 'accounting-report', label: 'Accounting report', cat: 'accounting' },
  { value: 'tax-advisory', label: 'Tax advisory', cat: 'accounting' },
  { value: 'audit-opinion', label: 'Audit opinion', cat: 'accounting' },
  { value: 'client-email', label: 'Client email', cat: 'general' },
  { value: 'meeting-notes', label: 'Meeting notes', cat: 'general' },
];

const DEFAULT_HOTKEYS: HotkeyConfig = { record: 'F2', enhance: 'F4', copy: 'F6', clear: 'F8', export: 'F10' };

// === Storage Helpers ===
function loadJSON<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
function saveJSON(key: string, value: any) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    // If quota exceeded and saving history, retry without audio data
    if (key === 'av_history' && Array.isArray(value)) {
      try {
        const stripped = value.map((item: any) => ({ ...item, audioData: undefined, audioMimeType: undefined }));
        localStorage.setItem(key, JSON.stringify(stripped));
      } catch { /* truly full, nothing we can do */ }
    }
  }
}

// === Main Component ===
export default function DictationApp() {
  const { branding } = useBranding();

  // Core state
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [rawText, setRawText] = useState('');
  const [enhancedText, setEnhancedText] = useState('');
  const [mode, setMode] = useState<DocMode>('general');
  const [error, setError] = useState('');
  const [duration, setDuration] = useState(0);
  const [copied, setCopied] = useState('');
  const [privacyMode, setPrivacyMode] = useState(false);
  const [customInstructions, setCustomInstructions] = useState('');

  // Panels
  const [activePanel, setActivePanel] = useState<Panel>('none');
  const [historySearch, setHistorySearch] = useState('');

  // Settings stored in localStorage
  const [vocabulary, setVocabulary] = useState<string[]>([]);
  const [newWord, setNewWord] = useState('');
  const [hotkeys, setHotkeys] = useState<HotkeyConfig>(DEFAULT_HOTKEYS);
  const [editingHotkey, setEditingHotkey] = useState<keyof HotkeyConfig | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [recordMode, setRecordMode] = useState<'toggle' | 'hold'>('toggle');

  // Live transcription state
  const [transcriptionMode, setTranscriptionMode] = useState<'standard' | 'live'>('standard');
  const [isLiveActive, setIsLiveActive] = useState(false);
  const liveChunkIndexRef = useRef(0);
  const liveAbortRef = useRef<AbortController | null>(null);
  const liveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const liveChunksRef = useRef<Blob[]>([]);
  const liveTranscriptsRef = useRef<Map<number, string>>(new Map());
  const liveMimeTypeRef = useRef<string>('');
  const liveProcessingRef = useRef(false);

  // Batch transcription state
  const [showBatchPanel, setShowBatchPanel] = useState(false);
  const [batchFiles, setBatchFiles] = useState<BatchFileStatus[]>([]);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const batchInputRef = useRef<HTMLInputElement>(null);

  // Auto-detect state
  const [autoDetectResult, setAutoDetectResult] = useState<{ mode: string; confidence: number } | null>(null);
  const autoDetectTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Template state
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [templateFieldValues, setTemplateFieldValues] = useState<Record<string, string>>({});

  // Audio playback state
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState(0);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const lastRecordedAudioRef = useRef<{ base64: string; mimeType: string } | null>(null);

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const enhancedRef = useRef<HTMLDivElement>(null);

  // Load settings from localStorage
  useEffect(() => {
    setVocabulary(loadJSON('av_vocabulary', []));
    setHotkeys(loadJSON('av_hotkeys', DEFAULT_HOTKEYS));
    setHistory(loadJSON('av_history', []));
    setRecordMode(loadJSON('av_record_mode', 'toggle'));
    setMode(loadJSON('av_last_mode', 'general'));
  }, []);

  // Save settings
  useEffect(() => { saveJSON('av_vocabulary', vocabulary); }, [vocabulary]);
  useEffect(() => { saveJSON('av_hotkeys', hotkeys); }, [hotkeys]);
  useEffect(() => { saveJSON('av_record_mode', recordMode); }, [recordMode]);
  useEffect(() => { saveJSON('av_last_mode', mode); }, [mode]);

  // === Hotkey Listener ===
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (editingHotkey) return; // Don't trigger while rebinding
      const key = e.key;
      if (key === hotkeys.record) { e.preventDefault(); isRecording ? stopRecording() : startRecording(); }
      else if (key === hotkeys.enhance && rawText) { e.preventDefault(); enhanceText(); }
      else if (key === hotkeys.copy && enhancedText) { e.preventDefault(); copyToClipboard(enhancedText, 'enhanced'); }
      else if (key === hotkeys.clear) { e.preventDefault(); clearAll(); }
      else if (key === hotkeys.export && enhancedText) { e.preventDefault(); exportDocx(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [hotkeys, isRecording, rawText, enhancedText, editingHotkey]);

  // === Hotkey Capture ===
  useEffect(() => {
    if (!editingHotkey) return;
    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      if (e.key === 'Escape') { setEditingHotkey(null); return; }
      setHotkeys(prev => ({ ...prev, [editingHotkey]: e.key }));
      setEditingHotkey(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [editingHotkey]);

  // === Voice Command Processing ===
  const processVoiceCommands = (text: string): string => {
    let processed = text;
    processed = processed.replace(/\b(new paragraph|next paragraph)\b/gi, '\n\n');
    processed = processed.replace(/\b(new line|next line)\b/gi, '\n');
    processed = processed.replace(/\bperiod\b/gi, '.');
    processed = processed.replace(/\bcomma\b/gi, ',');
    processed = processed.replace(/\bquestion mark\b/gi, '?');
    processed = processed.replace(/\bexclamation mark\b/gi, '!');
    processed = processed.replace(/\bcolon\b/gi, ':');
    processed = processed.replace(/\bsemicolon\b/gi, ';');
    processed = processed.replace(/\bopen quote\b/gi, '"');
    processed = processed.replace(/\bclose quote\b/gi, '"');
    processed = processed.replace(/\b(delete that|scratch that|strike that)\b/gi, '');
    return processed.trim();
  };

  // === Live Streaming Transcription ===
  const sendLiveChunk = useCallback(async () => {
    if (liveProcessingRef.current || liveChunksRef.current.length === 0) return;

    liveProcessingRef.current = true;
    const chunkIndex = liveChunkIndexRef.current++;
    const mimeType = liveMimeTypeRef.current;
    const ext = mimeType.includes('webm') ? 'webm' : 'm4a';

    const audioBlob = new Blob(liveChunksRef.current, { type: mimeType });
    liveChunksRef.current = [];

    if (audioBlob.size < 1000) {
      liveProcessingRef.current = false;
      return;
    }

    try {
      const abortController = new AbortController();
      liveAbortRef.current = abortController;

      const formData = new FormData();
      formData.append('audio', new File([audioBlob], `chunk_${chunkIndex}.${ext}`, { type: mimeType }));
      if (vocabulary.length > 0) formData.append('vocabulary', vocabulary.join(', '));
      formData.append('chunkIndex', chunkIndex.toString());

      const res = await fetch('/api/transcribe-stream', {
        method: 'POST',
        body: formData,
        signal: abortController.signal,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Transcription failed' }));
        throw new Error(errData.error);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6);
          if (payload === '[DONE]') break;

          try {
            const event = JSON.parse(payload);
            if (event.type === 'error') {
              console.error('Live transcription error:', event.error);
              continue;
            }
            if (event.type === 'partial' && event.text) {
              const processed = processVoiceCommands(event.text);
              if (processed) {
                liveTranscriptsRef.current.set(event.chunkIndex, processed);
                const sortedKeys = Array.from(liveTranscriptsRef.current.keys()).sort((a, b) => a - b);
                const fullText = sortedKeys.map(k => liveTranscriptsRef.current.get(k)).join(' ');
                setRawText(fullText);
              }
            }
          } catch {}
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Live chunk transcription error:', err.message);
      }
    } finally {
      liveProcessingRef.current = false;
    }
  }, [vocabulary]);

  const startLiveTranscription = useCallback((stream: MediaStream, mimeType: string) => {
    liveChunkIndexRef.current = 0;
    liveTranscriptsRef.current.clear();
    liveChunksRef.current = [];
    liveMimeTypeRef.current = mimeType;
    setIsLiveActive(true);

    const liveRecorder = new MediaRecorder(stream, { mimeType });
    liveRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        liveChunksRef.current.push(e.data);
      }
    };
    liveRecorder.start(500);

    liveIntervalRef.current = setInterval(() => {
      sendLiveChunk();
    }, 3000);

    return liveRecorder;
  }, [sendLiveChunk]);

  // === Recording ===
  const startRecording = useCallback(async () => {
    try {
      setError('');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 },
      });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        if (timerRef.current) clearInterval(timerRef.current);

        // Save audio as base64 for playback (cap at 5MB)
        const fullBlob = new Blob(chunksRef.current, { type: mimeType });
        if (fullBlob.size > 0 && fullBlob.size <= 5 * 1024 * 1024) {
          try {
            const reader = new FileReader();
            reader.onloadend = () => {
              if (typeof reader.result === 'string') {
                lastRecordedAudioRef.current = { base64: reader.result, mimeType };
              }
            };
            reader.readAsDataURL(fullBlob);
          } catch { /* audio save is best-effort */ }
        } else {
          lastRecordedAudioRef.current = null;
        }

        // In live mode, skip the final full-blob transcription (text already streamed)
        if (transcriptionMode === 'live') return;
        const blob = fullBlob;
        if (blob.size < 500) { setError('Recording too short'); return; }
        await transcribeAudio(blob, mimeType);
      };

      recorder.start(250);
      setIsRecording(true);
      setDuration(0);
      setEnhancedText('');
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);

      // Start live transcription if in live mode
      if (transcriptionMode === 'live') {
        startLiveTranscription(stream, mimeType);
      }
    } catch (err: any) {
      setError(err.name === 'NotAllowedError' ? 'Microphone access denied — check browser settings' : err.message);
    }
  }, [transcriptionMode, startLiveTranscription]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
    // Clean up live transcription
    if (liveIntervalRef.current) {
      clearInterval(liveIntervalRef.current);
      liveIntervalRef.current = null;
    }
    if (liveAbortRef.current) {
      liveAbortRef.current.abort();
      liveAbortRef.current = null;
    }
    setIsLiveActive(false);
    liveProcessingRef.current = false;
  }, []);

  // === Transcription ===
  const transcribeAudio = async (blob: Blob, mimeType: string) => {
    setIsTranscribing(true);
    setError('');
    try {
      const ext = mimeType.includes('webm') ? 'webm' : 'm4a';
      const formData = new FormData();
      formData.append('audio', new File([blob], `rec.${ext}`, { type: mimeType }));
      if (vocabulary.length > 0) formData.append('vocabulary', vocabulary.join(', '));

      const res = await fetch('/api/transcribe', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Process voice commands in raw text
      const processed = processVoiceCommands(data.text);

      setRawText(prev => prev ? prev + '\n\n' + processed : processed);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsTranscribing(false);
    }
  };

  // === Enhancement (Streaming) ===
  const enhanceText = async () => {
    if (!rawText.trim() || isEnhancing) return;
    setIsEnhancing(true);
    setEnhancedText('');
    setError('');

    try {
      const res = await fetch('/api/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: rawText,
          mode,
          customInstructions: customInstructions || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Enhancement failed');
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6);
          if (payload === '[DONE]') break;
          try {
            const { text, error: streamError } = JSON.parse(payload);
            if (streamError) throw new Error(streamError);
            if (text) {
              setEnhancedText(prev => prev + text);
              // Auto-scroll enhanced panel
              if (enhancedRef.current) {
                enhancedRef.current.scrollTop = enhancedRef.current.scrollHeight;
              }
            }
          } catch {}
        }
      }

      // Save to history (include audio if available and not in privacy mode)
      const audioSnapshot = lastRecordedAudioRef.current;
      lastRecordedAudioRef.current = null;
      setHistory(prev => {
        const item: HistoryItem = {
          id: Date.now().toString(),
          raw: rawText,
          enhanced: '', // Will be updated below
          mode,
          date: new Date().toISOString(),
          ...(audioSnapshot && !privacyMode ? { audioData: audioSnapshot.base64, audioMimeType: audioSnapshot.mimeType } : {}),
        };
        const updated = [item, ...prev].slice(0, 50);
        // Try saving; if localStorage is full, save without audio
        try {
          saveJSON('av_history', updated);
        } catch {
          const withoutAudio = updated.map(h => ({ ...h, audioData: undefined, audioMimeType: undefined }));
          saveJSON('av_history', withoutAudio);
        }
        return updated;
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsEnhancing(false);
    }
  };

  // Update history with final enhanced text
  useEffect(() => {
    if (!isEnhancing && enhancedText && history.length > 0 && !history[0].enhanced) {
      setHistory(prev => {
        const updated = [...prev];
        if (updated[0]) updated[0] = { ...updated[0], enhanced: enhancedText };
        saveJSON('av_history', updated);
        return updated;
      });
    }
  }, [isEnhancing, enhancedText]);

  // === Batch Transcription ===
  const handleBatchUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    const files = Array.from(fileList).slice(0, 20);
    const statuses: BatchFileStatus[] = files.map(f => ({
      filename: f.name,
      status: 'pending',
    }));
    setBatchFiles(statuses);
    setIsBatchProcessing(true);
    setBatchProgress({ current: 0, total: files.length });
    setError('');
    setShowBatchPanel(true);

    try {
      const formData = new FormData();
      files.forEach(f => formData.append('files', f));
      if (vocabulary.length > 0) formData.append('vocabulary', vocabulary.join(', '));

      const res = await fetch('/api/transcribe-batch', { method: 'POST', body: formData });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Batch transcription failed');
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6);
          if (payload === '[DONE]') break;

          try {
            const event = JSON.parse(payload);

            if (event.type === 'progress') {
              setBatchProgress({ current: event.current, total: event.total });
              setBatchFiles(prev => prev.map((f, i) =>
                i === event.current - 1 ? { ...f, status: 'transcribing' } : f
              ));
            } else if (event.type === 'result') {
              setBatchFiles(prev => prev.map((f, i) =>
                i === event.index
                  ? {
                      ...f,
                      status: event.error ? 'error' : 'done',
                      text: event.text || undefined,
                      error: event.error || undefined,
                      duration: event.duration || undefined,
                    }
                  : f
              ));
            }
          } catch {}
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsBatchProcessing(false);
      if (batchInputRef.current) batchInputRef.current.value = '';
    }
  };

  const useBatchResult = (text: string) => {
    setRawText(prev => prev ? prev + '\n\n' + text : text);
  };

  const useAllBatchResults = () => {
    const allText = batchFiles
      .filter(f => f.status === 'done' && f.text)
      .map(f => f.text!)
      .join('\n\n---\n\n');
    if (allText) {
      setRawText(prev => prev ? prev + '\n\n' + allText : allText);
    }
    setShowBatchPanel(false);
  };

  // === Auto-Detect Document Type ===
  const handleAutoDetect = () => {
    if (!rawText.trim()) return;
    const result = detectDocumentType(rawText);
    setMode(result.mode);
    setAutoDetectResult({ mode: result.mode, confidence: result.confidence });

    if (autoDetectTimerRef.current) clearTimeout(autoDetectTimerRef.current);
    autoDetectTimerRef.current = setTimeout(() => setAutoDetectResult(null), 3000);
  };

  // === Actions ===
  const copyToClipboard = async (text: string, which: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(which);
    setTimeout(() => setCopied(''), 2000);
  };

  const exportDocx = async () => {
    const text = enhancedText || rawText;
    if (!text) return;
    try {
      const { Document, Packer, Paragraph, TextRun } = await import('docx');
      const paragraphs = text.split('\n').filter(Boolean).map(
        line => new Paragraph({ children: [new TextRun({ text: line, font: 'Cambria', size: 24 })] })
      );
      const doc = new Document({ sections: [{ children: paragraphs }] });
      const blob = await Packer.toBlob(doc);
      const { saveAs } = await import('file-saver');
      const brandSlug = branding.appName.replace(/\s+/g, '');
      const filename = `${brandSlug}_${mode}_${new Date().toISOString().split('T')[0]}.docx`;
      saveAs(blob, filename);
    } catch (err: any) {
      setError('Export failed: ' + err.message);
    }
  };

  const clearAll = () => {
    setRawText('');
    setEnhancedText('');
    setError('');
    setDuration(0);
    setCustomInstructions('');
  };

  const loadFromHistory = (item: HistoryItem) => {
    setRawText(item.raw);
    setEnhancedText(item.enhanced);
    setMode(item.mode);
    setActivePanel('none');
  };

  const addVocabWord = () => {
    const word = newWord.trim();
    if (!word || vocabulary.includes(word)) return;
    setVocabulary(prev => [...prev, word]);
    setNewWord('');
  };

  const removeVocabWord = (word: string) => {
    setVocabulary(prev => prev.filter(w => w !== word));
  };

  const logout = async () => {
    await fetch('/api/auth', { method: 'DELETE' });
    window.location.href = '/';
  };

  // === Template Actions ===
  const selectTemplate = (template: DocumentTemplate) => {
    setSelectedTemplate(template);
    // Initialize field values with empty strings (and today's date for date fields)
    const initial: Record<string, string> = {};
    template.fields.forEach(f => {
      if (f.type === 'date') {
        initial[f.id] = new Date().toISOString().split('T')[0];
      } else if (f.type === 'select' && f.options?.length) {
        initial[f.id] = f.options[0];
      } else {
        initial[f.id] = '';
      }
    });
    setTemplateFieldValues(initial);
  };

  const updateTemplateField = (fieldId: string, value: string) => {
    setTemplateFieldValues(prev => ({ ...prev, [fieldId]: value }));
  };

  const generateFromTemplate = () => {
    if (!selectedTemplate) return;
    // Check required fields
    const missing = selectedTemplate.fields.filter(f => f.required && !templateFieldValues[f.id]?.trim());
    if (missing.length > 0) {
      setError(`Please fill in: ${missing.map(f => f.label).join(', ')}`);
      return;
    }
    const result = fillTemplate(selectedTemplate, templateFieldValues);
    setEnhancedText(result);
    setMode(selectedTemplate.mode);
    setActivePanel('none');
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  const formatDate = (iso: string) => new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  // === Audio Playback ===
  const toggleAudioPlayback = useCallback((itemId: string, audioData: string) => {
    // If already playing this item, pause it
    if (playingAudioId === itemId && audioElementRef.current) {
      audioElementRef.current.pause();
      setPlayingAudioId(null);
      setAudioProgress(0);
      return;
    }

    // Stop any current playback
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current = null;
    }

    const audio = new Audio(audioData);
    audioElementRef.current = audio;
    setPlayingAudioId(itemId);
    setAudioProgress(0);

    audio.addEventListener('timeupdate', () => {
      if (audio.duration > 0) {
        setAudioProgress(audio.currentTime / audio.duration);
      }
    });

    audio.addEventListener('ended', () => {
      setPlayingAudioId(null);
      setAudioProgress(0);
      audioElementRef.current = null;
    });

    audio.addEventListener('error', () => {
      setPlayingAudioId(null);
      setAudioProgress(0);
      audioElementRef.current = null;
    });

    audio.play().catch(() => {
      setPlayingAudioId(null);
      audioElementRef.current = null;
    });
  }, [playingAudioId]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current = null;
      }
    };
  }, []);

  // === Render ===
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="shrink-0 glass-header px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {branding.logoUrl ? (
            <img src={branding.logoUrl} alt={branding.appName} className="h-7" />
          ) : (
            <h1 className="font-display text-lg text-ink-50">
              {branding.appName.includes(' ') ? (
                <>{branding.appName.split(' ').slice(0, -1).join(' ')} <span style={{ color: 'var(--brand-accent)' }}>{branding.appName.split(' ').pop()}</span></>
              ) : (
                <span style={{ color: 'var(--brand-accent)' }}>{branding.appName}</span>
              )}
            </h1>
          )}
          {privacyMode && (
            <span className="text-[10px] bg-red-500/20 text-red-300 px-2 py-0.5 rounded-full">PRIVACY</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {(['templates', 'vocabulary', 'hotkeys', 'history', 'settings'] as Panel[]).map(p => (
            <button
              key={p}
              onClick={() => setActivePanel(activePanel === p ? 'none' : p)}
              className={`px-2.5 py-1.5 rounded-lg text-xs capitalize transition-colors ${
                activePanel === p ? 'bg-ink-700 text-ink-100' : 'text-ink-400 hover:text-ink-200 hover:bg-ink-800/50'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Side Panel */}
        {activePanel !== 'none' && (
          <aside className="w-72 shrink-0 border-r border-ink-800/60 bg-ink-900/50 overflow-y-auto p-4 animate-fade-in">
            {/* Templates Panel */}
            {activePanel === 'templates' && (
              <div>
                {!selectedTemplate ? (
                  <>
                    <h2 className="text-sm font-medium text-ink-200 mb-1">Document templates</h2>
                    <p className="text-xs text-ink-500 mb-4">Pre-formatted documents with fillable fields</p>

                    {(['legal', 'accounting'] as const).map(cat => {
                      const templates = BUILT_IN_TEMPLATES.filter(t => t.category === cat);
                      if (templates.length === 0) return null;
                      return (
                        <div key={cat} className="mb-4">
                          <p className="text-[10px] uppercase tracking-wider text-ink-500 font-medium mb-2">{cat}</p>
                          <div className="space-y-1.5">
                            {templates.map(t => (
                              <button
                                key={t.id}
                                onClick={() => selectTemplate(t)}
                                className="w-full text-left bg-ink-800/50 hover:bg-ink-800 rounded-lg px-3 py-2.5 transition-colors group"
                              >
                                <p className="text-sm text-ink-200 group-hover:text-ink-50">{t.name}</p>
                                <p className="text-[11px] text-ink-500 mt-0.5 line-clamp-2">{t.description}</p>
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setSelectedTemplate(null)}
                      className="text-xs text-ink-500 hover:text-ink-200 mb-3 flex items-center gap-1"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                      Back to templates
                    </button>
                    <h2 className="text-sm font-medium text-ink-200 mb-1">{selectedTemplate.name}</h2>
                    <p className="text-xs text-ink-500 mb-4">{selectedTemplate.description}</p>

                    <div className="space-y-3 mb-4">
                      {selectedTemplate.fields.map(field => (
                        <div key={field.id}>
                          <label className="text-xs text-ink-400 block mb-1">
                            {field.label}
                            {field.required && <span className="text-gold-500 ml-0.5">*</span>}
                          </label>
                          {field.type === 'text' && (
                            <input
                              type="text"
                              value={templateFieldValues[field.id] || ''}
                              onChange={e => updateTemplateField(field.id, e.target.value)}
                              placeholder={field.placeholder}
                              className="w-full bg-ink-800 border border-ink-700/50 rounded-lg px-3 py-1.5 text-sm text-ink-100 placeholder:text-ink-600 focus:border-gold-500/50 focus:outline-none"
                            />
                          )}
                          {field.type === 'date' && (
                            <input
                              type="date"
                              value={templateFieldValues[field.id] || ''}
                              onChange={e => updateTemplateField(field.id, e.target.value)}
                              className="w-full bg-ink-800 border border-ink-700/50 rounded-lg px-3 py-1.5 text-sm text-ink-100 focus:border-gold-500/50 focus:outline-none [color-scheme:dark]"
                            />
                          )}
                          {field.type === 'textarea' && (
                            <textarea
                              value={templateFieldValues[field.id] || ''}
                              onChange={e => updateTemplateField(field.id, e.target.value)}
                              placeholder={field.placeholder}
                              rows={3}
                              className="w-full bg-ink-800 border border-ink-700/50 rounded-lg px-3 py-2 text-sm text-ink-100 placeholder:text-ink-600 resize-none focus:border-gold-500/50 focus:outline-none"
                            />
                          )}
                          {field.type === 'select' && field.options && (
                            <select
                              value={templateFieldValues[field.id] || ''}
                              onChange={e => updateTemplateField(field.id, e.target.value)}
                              className="w-full bg-ink-800 border border-ink-700/50 rounded-lg px-3 py-1.5 text-sm text-ink-100 focus:border-gold-500/50 focus:outline-none"
                            >
                              {field.options.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          )}
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={generateFromTemplate}
                      className="w-full py-2.5 rounded-lg text-sm font-medium bg-gold-500 text-ink-950 hover:bg-gold-400 transition-colors"
                    >
                      Generate document
                    </button>
                    <p className="text-[10px] text-ink-600 mt-2 text-center">
                      Output appears in the Enhanced panel. Dictate content to replace [DICTATED CONTENT] sections.
                    </p>
                  </>
                )}
              </div>
            )}

            {/* Vocabulary Panel */}
            {activePanel === 'vocabulary' && (
              <div>
                <h2 className="text-sm font-medium text-ink-200 mb-3">Custom vocabulary</h2>
                <p className="text-xs text-ink-500 mb-3">Terms fed to Whisper for better accuracy</p>
                <div className="flex gap-2 mb-3">
                  <input
                    value={newWord}
                    onChange={e => setNewWord(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addVocabWord()}
                    placeholder="Add term..."
                    className="flex-1 bg-ink-800 border border-ink-700/50 rounded-lg px-3 py-1.5 text-sm text-ink-100 placeholder:text-ink-500 focus:border-gold-500/50"
                  />
                  <button onClick={addVocabWord} className="px-3 py-1.5 bg-gold-500 text-ink-950 rounded-lg text-sm font-medium">+</button>
                </div>
                <div className="space-y-1 max-h-96 overflow-y-auto">
                  {vocabulary.map(w => (
                    <div key={w} className="flex items-center justify-between bg-ink-800/50 rounded-lg px-3 py-1.5">
                      <span className="text-sm text-ink-200">{w}</span>
                      <button onClick={() => removeVocabWord(w)} className="text-ink-500 hover:text-red-400 text-xs">remove</button>
                    </div>
                  ))}
                  {vocabulary.length === 0 && <p className="text-xs text-ink-600 italic">No custom terms yet</p>}
                </div>
              </div>
            )}

            {/* Hotkeys Panel */}
            {activePanel === 'hotkeys' && (
              <div>
                <h2 className="text-sm font-medium text-ink-200 mb-3">Keyboard shortcuts</h2>
                <p className="text-xs text-ink-500 mb-3">Click a key to rebind, press Escape to cancel</p>
                <div className="space-y-2">
                  {(Object.entries(hotkeys) as [keyof HotkeyConfig, string][]).map(([action, key]) => (
                    <div key={action} className="flex items-center justify-between bg-ink-800/50 rounded-lg px-3 py-2">
                      <span className="text-sm text-ink-300 capitalize">{action}</span>
                      <button
                        onClick={() => setEditingHotkey(action)}
                        className={`px-3 py-1 rounded text-xs font-mono transition-colors ${
                          editingHotkey === action
                            ? 'bg-gold-500 text-ink-950 animate-pulse-soft'
                            : 'bg-ink-700 text-ink-200 hover:bg-ink-600'
                        }`}
                      >
                        {editingHotkey === action ? 'Press key...' : key}
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setHotkeys(DEFAULT_HOTKEYS)}
                  className="mt-4 text-xs text-ink-500 hover:text-ink-300"
                >
                  Reset to defaults
                </button>
              </div>
            )}

            {/* History Panel */}
            {activePanel === 'history' && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-medium text-ink-200">History</h2>
                  <button
                    onClick={() => { setHistory([]); saveJSON('av_history', []); }}
                    className="text-xs text-ink-500 hover:text-red-400"
                  >
                    Clear
                  </button>
                </div>
                <input
                  value={historySearch}
                  onChange={e => setHistorySearch(e.target.value)}
                  placeholder="Search dictations..."
                  className="w-full bg-ink-800 border border-ink-700/50 rounded-lg px-3 py-1.5 text-sm text-ink-100 placeholder:text-ink-500 focus:border-gold-500/50 mb-3"
                />
                <div className="space-y-2 max-h-[70vh] overflow-y-auto">
                  {(() => {
                    const q = historySearch.toLowerCase().trim();
                    const filtered = q
                      ? history.filter(item =>
                          item.raw.toLowerCase().includes(q) ||
                          item.enhanced.toLowerCase().includes(q) ||
                          item.mode.toLowerCase().includes(q) ||
                          formatDate(item.date).toLowerCase().includes(q)
                        )
                      : history;
                    if (filtered.length === 0 && q) {
                      return <p className="text-xs text-ink-600 italic">No dictations match your search</p>;
                    }
                    if (filtered.length === 0) {
                      return <p className="text-xs text-ink-600 italic">No history yet</p>;
                    }
                    return filtered.map(item => {
                      const modeLabel = MODES.find(m => m.value === item.mode)?.label || item.mode;
                      const preview = item.raw.slice(0, 120);
                      const isPlaying = playingAudioId === item.id;
                      return (
                        <div key={item.id} className="relative">
                          <button
                            onClick={() => loadFromHistory(item)}
                            className="w-full text-left bg-ink-800/50 hover:bg-ink-800 rounded-lg px-3 py-2 transition-colors"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-xs text-ink-400">{formatDate(item.date)} · {modeLabel}</p>
                              {item.audioData && (
                                <span
                                  role="button"
                                  tabIndex={0}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleAudioPlayback(item.id, item.audioData!);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.stopPropagation();
                                      e.preventDefault();
                                      toggleAudioPlayback(item.id, item.audioData!);
                                    }
                                  }}
                                  className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-ink-700/50 transition-colors group"
                                  title={isPlaying ? 'Pause audio' : 'Play recording'}
                                >
                                  {isPlaying ? (
                                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-[#c4a23a]">
                                      <rect x="2" y="2" width="3" height="8" rx="0.5" fill="currentColor" />
                                      <rect x="7" y="2" width="3" height="8" rx="0.5" fill="currentColor" />
                                    </svg>
                                  ) : (
                                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-[#c4a23a] group-hover:text-[#d4b24a]">
                                      <path d="M3 1.5V10.5L10.5 6L3 1.5Z" fill="currentColor" />
                                    </svg>
                                  )}
                                </span>
                              )}
                            </div>
                            {/* Audio progress bar */}
                            {isPlaying && (
                              <div className="w-full h-0.5 bg-ink-700 rounded-full mb-1.5 overflow-hidden">
                                <div
                                  className="h-full bg-[#c4a23a] rounded-full transition-all duration-200"
                                  style={{ width: `${audioProgress * 100}%` }}
                                />
                              </div>
                            )}
                            <p className="text-sm text-ink-200 line-clamp-2">{preview}...</p>
                          </button>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            )}

            {/* Settings Panel */}
            {activePanel === 'settings' && (
              <div className="space-y-5">
                <h2 className="text-sm font-medium text-ink-200">Settings</h2>

                <div>
                  <label className="text-xs text-ink-400 block mb-1.5">Recording mode</label>
                  <div className="flex gap-2">
                    {(['toggle', 'hold'] as const).map(m => (
                      <button
                        key={m}
                        onClick={() => setRecordMode(m)}
                        className={`flex-1 py-1.5 rounded-lg text-xs capitalize ${
                          recordMode === m ? 'bg-gold-500 text-ink-950 font-medium' : 'bg-ink-800 text-ink-300'
                        }`}
                      >
                        {m === 'toggle' ? 'Tap to toggle' : 'Hold to record'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-ink-400 block mb-1.5">Privacy mode</label>
                  <button
                    onClick={() => setPrivacyMode(!privacyMode)}
                    className={`w-full py-2 rounded-lg text-xs font-medium ${
                      privacyMode ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-ink-800 text-ink-300'
                    }`}
                  >
                    {privacyMode ? 'Privacy ON — no history saved' : 'Enable privacy mode'}
                  </button>
                  <p className="text-[10px] text-ink-600 mt-1">When enabled, dictations are not saved to history</p>
                </div>

                <div>
                  <label className="text-xs text-ink-400 block mb-1.5">Custom AI instructions</label>
                  <textarea
                    value={customInstructions}
                    onChange={e => setCustomInstructions(e.target.value)}
                    placeholder="e.g. Always use UK spelling. Our firm name is Smith & Partners LLP. Format dates as DD/MM/YYYY."
                    className="w-full bg-ink-800 border border-ink-700/50 rounded-lg px-3 py-2 text-xs text-ink-200 placeholder:text-ink-600 resize-none focus:border-gold-500/50"
                    rows={4}
                  />
                </div>

                <div>
                  <label className="text-xs text-ink-400 block mb-1.5">Voice commands</label>
                  <div className="bg-ink-800/50 rounded-lg p-3 text-[11px] text-ink-400 space-y-1">
                    <p><span className="text-ink-200">&quot;new paragraph&quot;</span> — inserts paragraph break</p>
                    <p><span className="text-ink-200">&quot;new line&quot;</span> — inserts line break</p>
                    <p><span className="text-ink-200">&quot;period / comma / colon&quot;</span> — inserts punctuation</p>
                    <p><span className="text-ink-200">&quot;open/close quote&quot;</span> — inserts quotation marks</p>
                    <p><span className="text-ink-200">&quot;delete that&quot;</span> — removes last phrase</p>
                  </div>
                </div>

                <button onClick={logout} className="w-full py-2 rounded-lg text-xs text-ink-500 hover:text-red-400 border border-ink-800 hover:border-red-500/30 transition-colors">
                  Sign out
                </button>
              </div>
            )}
          </aside>
        )}

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden p-4 sm:p-6 gap-4">
          {/* Record Section */}
          <section className="flex items-center gap-4">
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isTranscribing}
              className={`shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
                isRecording
                  ? 'bg-red-500 recording-pulse'
                  : isTranscribing
                  ? 'bg-ink-700 cursor-wait'
                  : 'bg-gold-500 hover:bg-gold-400 hover:scale-105 gold-idle-pulse'
              }`}
            >
              {isTranscribing ? (
                <svg className="w-6 h-6 animate-spin text-ink-300" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : isRecording ? (
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><rect x="7" y="7" width="10" height="10" rx="2" /></svg>
              ) : (
                <svg className="w-6 h-6 text-ink-950" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                </svg>
              )}
            </button>
            <div className="flex-1 min-w-0">
              {isRecording ? (
                <div>
                  <div className="flex items-center gap-2">
                    {/* Audio waveform bars */}
                    <div className="flex items-center gap-[3px] h-5">
                      {[1,2,3,4,5].map(i => (
                        <div key={i} className="w-[3px] bg-red-400 rounded-full waveform-bar" />
                      ))}
                    </div>
                    <p className="text-red-400 text-sm font-medium">Recording {formatTime(duration)}</p>
                    {isLiveActive && (
                      <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 live-pulse" />
                        LIVE
                      </span>
                    )}
                  </div>
                  <p className="text-ink-500 text-xs">
                    {isLiveActive ? 'Live transcription active — text appears as you speak' : `Tap button or press ${hotkeys.record} to stop`}
                  </p>
                </div>
              ) : isTranscribing ? (
                <p className="text-gold-400 text-sm">Transcribing with Whisper...</p>
              ) : (
                <div>
                  <p className="text-ink-300 text-sm">Tap to start dictating</p>
                  <p className="text-ink-600 text-xs">Shortcut: {hotkeys.record}</p>
                </div>
              )}
            </div>

            {/* Transcription Mode Toggle */}
            <div className="shrink-0 flex items-center bg-ink-800/70 rounded-lg p-0.5">
              {(['standard', 'live'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setTranscriptionMode(m)}
                  disabled={isRecording || isTranscribing}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    transcriptionMode === m
                      ? m === 'live'
                        ? 'bg-emerald-500/20 text-emerald-300 shadow-sm'
                        : 'bg-ink-700 text-ink-100 shadow-sm'
                      : 'text-ink-400 hover:text-ink-200'
                  } ${(isRecording || isTranscribing) ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {m === 'live' ? 'Live' : 'Standard'}
                </button>
              ))}
            </div>

            {/* Mode Selector + Auto-detect */}
            <div className="shrink-0 flex items-center gap-1.5 relative">
              <select
                value={mode}
                onChange={e => setMode(e.target.value as DocMode)}
                className="bg-ink-800 border border-ink-700/50 rounded-lg px-3 py-2 text-sm text-ink-200 focus:border-gold-500/50 max-w-[200px] mode-select"
              >
                <optgroup label="General">
                  {MODES.filter(m => m.cat === 'general').map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </optgroup>
                <optgroup label="Legal">
                  {MODES.filter(m => m.cat === 'legal').map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </optgroup>
                <optgroup label="Accounting">
                  {MODES.filter(m => m.cat === 'accounting').map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </optgroup>
              </select>
              <button
                onClick={handleAutoDetect}
                disabled={!rawText.trim()}
                title="Auto-detect document type from content"
                className={`px-2.5 py-2 rounded-lg text-xs font-medium transition-all ${
                  !rawText.trim()
                    ? 'bg-ink-800/50 text-ink-600 cursor-not-allowed'
                    : 'bg-ink-800 text-ink-300 hover:text-gold-400 hover:border-gold-500/30 border border-ink-700/50'
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </button>
              {autoDetectResult && (
                <div className="absolute top-full right-0 mt-1.5 bg-ink-800 border border-gold-500/30 rounded-lg px-3 py-1.5 text-xs text-gold-400 whitespace-nowrap animate-fade-in z-10 shadow-lg">
                  {MODES.find(m => m.value === autoDetectResult.mode)?.label || autoDetectResult.mode}
                  <span className="ml-1.5 text-ink-400">{Math.round(autoDetectResult.confidence * 100)}% confidence</span>
                </div>
              )}
            </div>
          </section>

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5 text-red-300 text-sm animate-fade-in">
              {error}
              <button onClick={() => setError('')} className="ml-2 text-red-400/60 hover:text-red-300">dismiss</button>
            </div>
          )}

          {/* Text Panels */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">
            {/* Raw Panel */}
            <div className="flex flex-col min-h-0 bg-ink-900/40 rounded-xl border border-ink-800/50 overflow-hidden">
              <div className="shrink-0 flex items-center justify-between px-4 py-2 border-b border-ink-800/40">
                <span className="text-xs text-ink-400 font-medium flex items-center gap-2">
                  Raw dictation
                  {isLiveActive && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 live-pulse" />
                      streaming
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-2">
                  {rawText && (
                    <>
                      <button onClick={() => copyToClipboard(rawText, 'raw')} className="text-[11px] text-ink-500 hover:text-ink-200">
                        {copied === 'raw' ? 'Copied!' : 'Copy'}
                      </button>
                      <button onClick={clearAll} className="text-[11px] text-ink-500 hover:text-red-400">Clear</button>
                    </>
                  )}
                </div>
              </div>
              <textarea
                value={rawText}
                onChange={e => setRawText(e.target.value)}
                placeholder="Tap the microphone and start speaking..."
                className="flex-1 bg-transparent px-4 py-3 text-sm text-ink-100 leading-relaxed resize-none placeholder:text-ink-600"
              />
            </div>

            {/* Enhanced Panel */}
            <div className={`flex flex-col min-h-0 bg-ink-900/40 rounded-xl border overflow-hidden transition-all duration-300 ${
              isEnhancing ? 'border-gold-500/30 enhance-glow' : 'border-ink-800/50'
            }`}>
              <div className="shrink-0 flex items-center justify-between px-4 py-2 border-b border-ink-800/40">
                <span className="text-xs text-gold-400 font-medium">
                  Enhanced {isEnhancing && <span className="stream-cursor" />}
                </span>
                <div className="flex items-center gap-2">
                  {enhancedText && (
                    <>
                      <button onClick={() => copyToClipboard(enhancedText, 'enhanced')} className="text-[11px] text-ink-500 hover:text-ink-200">
                        {copied === 'enhanced' ? 'Copied!' : 'Copy'}
                      </button>
                      <button onClick={exportDocx} className="text-[11px] text-ink-500 hover:text-gold-400">
                        Export .docx
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div ref={enhancedRef} className="flex-1 overflow-y-auto px-4 py-3 text-sm text-ink-50 leading-relaxed whitespace-pre-wrap">
                {enhancedText || (
                  <span className="text-ink-600 italic">Enhanced output will appear here...</span>
                )}
              </div>
            </div>
          </div>

          {/* Intelligence panels (Wave 5) */}
          {(rawText || enhancedText) && (
            <div className="shrink-0 space-y-3">
              <CitationPanel text={enhancedText || rawText} />
              <CompliancePanel text={enhancedText || rawText} mode={mode} />
              <RedactionPanel
                text={enhancedText || rawText}
                onRedact={(redacted) => {
                  if (enhancedText) setEnhancedText(redacted);
                  else setRawText(redacted);
                }}
              />
              {rawText && (
                <MultiDocPanel rawText={rawText} customInstructions={customInstructions} />
              )}
            </div>
          )}

          {/* Batch Transcription Panel */}
          {showBatchPanel && (
            <div className="shrink-0 bg-ink-900/60 border border-ink-800/50 rounded-xl p-4 animate-fade-in">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium text-ink-200">Batch transcription</h3>
                  {isBatchProcessing && (
                    <span className="text-xs text-gold-400">
                      {batchProgress.current}/{batchProgress.total}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {!isBatchProcessing && batchFiles.some(f => f.status === 'done' && f.text) && (
                    <button
                      onClick={useAllBatchResults}
                      className="text-xs text-gold-400 hover:text-gold-300 font-medium"
                    >
                      Use all results
                    </button>
                  )}
                  <button
                    onClick={() => { setShowBatchPanel(false); setBatchFiles([]); }}
                    className="text-xs text-ink-500 hover:text-ink-300"
                  >
                    Close
                  </button>
                </div>
              </div>

              {isBatchProcessing && (
                <div className="w-full bg-ink-800 rounded-full h-1.5 mb-3">
                  <div
                    className="bg-gold-500 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${batchProgress.total > 0 ? (batchProgress.current / batchProgress.total) * 100 : 0}%` }}
                  />
                </div>
              )}

              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {batchFiles.map((file, i) => (
                  <div key={i} className="flex items-center gap-2 bg-ink-800/40 rounded-lg px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-ink-200 truncate">{file.filename}</p>
                      {file.status === 'done' && file.text && (
                        <p className="text-[11px] text-ink-500 truncate mt-0.5">{file.text.slice(0, 80)}...</p>
                      )}
                      {file.status === 'error' && (
                        <p className="text-[11px] text-red-400 mt-0.5">{file.error || 'Failed'}</p>
                      )}
                    </div>
                    <div className="shrink-0 flex items-center gap-1.5">
                      {file.duration != null && (
                        <span className="text-[10px] text-ink-600">{Math.round(file.duration)}s</span>
                      )}
                      {file.status === 'pending' && (
                        <span className="text-[10px] text-ink-500 bg-ink-800 px-1.5 py-0.5 rounded">Queued</span>
                      )}
                      {file.status === 'transcribing' && (
                        <svg className="w-3.5 h-3.5 animate-spin text-gold-400" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      )}
                      {file.status === 'done' && file.text && (
                        <button
                          onClick={() => useBatchResult(file.text!)}
                          className="text-[10px] text-gold-400 hover:text-gold-300 font-medium px-1.5 py-0.5 bg-gold-500/10 rounded"
                        >
                          Use
                        </button>
                      )}
                      {file.status === 'done' && !file.text && (
                        <span className="text-[10px] text-ink-500">Empty</span>
                      )}
                      {file.status === 'error' && (
                        <span className="text-[10px] text-red-400">Error</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bottom Action Bar */}
          <section className="shrink-0 flex items-center gap-3 flex-wrap">
            <button
              onClick={enhanceText}
              disabled={!rawText.trim() || isEnhancing}
              className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                !rawText.trim() || isEnhancing
                  ? 'bg-ink-800 text-ink-500 cursor-not-allowed'
                  : 'bg-gold-500 text-ink-950 hover:bg-gold-400 shadow-sm btn-premium'
              }`}
            >
              {isEnhancing ? 'Enhancing...' : `Enhance (${hotkeys.enhance})`}
            </button>

            {enhancedText && (
              <>
                <button
                  onClick={() => copyToClipboard(enhancedText, 'enhanced')}
                  className="px-4 py-2.5 rounded-xl text-sm bg-ink-800 text-ink-200 hover:bg-ink-700 transition-colors"
                >
                  {copied === 'enhanced' ? 'Copied!' : `Copy (${hotkeys.copy})`}
                </button>
                <button
                  onClick={exportDocx}
                  className="px-4 py-2.5 rounded-xl text-sm bg-ink-800 text-ink-200 hover:bg-ink-700 transition-colors"
                >
                  Export .docx ({hotkeys.export})
                </button>
              </>
            )}

            <input
              ref={batchInputRef}
              type="file"
              multiple
              accept="audio/*,.mp3,.wav,.m4a,.webm,.ogg,.flac,.mp4"
              onChange={e => handleBatchUpload(e.target.files)}
              className="hidden"
            />
            <button
              onClick={() => batchInputRef.current?.click()}
              disabled={isBatchProcessing}
              className={`px-4 py-2.5 rounded-xl text-sm transition-colors ${
                isBatchProcessing
                  ? 'bg-ink-800 text-ink-500 cursor-wait'
                  : 'bg-ink-800 text-ink-200 hover:bg-ink-700'
              }`}
            >
              {isBatchProcessing ? 'Processing...' : 'Batch upload'}
            </button>

            <div className="flex-1" />
            <span className="text-[11px] text-ink-600">
              {rawText ? `${rawText.split(/\s+/).filter(Boolean).length} words` : ''}
            </span>
          </section>
        </main>
      </div>
    </div>
  );
}
