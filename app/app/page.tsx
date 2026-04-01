'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

// === Types ===
type DocMode = 'general' | 'legal-letter' | 'legal-memo' | 'court-filing' | 'demand-letter' | 'deposition-summary' | 'engagement-letter' | 'accounting-report' | 'tax-advisory' | 'audit-opinion' | 'client-email' | 'meeting-notes';
type Panel = 'none' | 'settings' | 'vocabulary' | 'hotkeys' | 'history';
interface HistoryItem { id: string; raw: string; enhanced: string; mode: DocMode; date: string; }
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
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

// === Main Component ===
export default function DictationApp() {
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

  // Settings stored in localStorage
  const [vocabulary, setVocabulary] = useState<string[]>([]);
  const [newWord, setNewWord] = useState('');
  const [hotkeys, setHotkeys] = useState<HotkeyConfig>(DEFAULT_HOTKEYS);
  const [editingHotkey, setEditingHotkey] = useState<keyof HotkeyConfig | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [recordMode, setRecordMode] = useState<'toggle' | 'hold'>('toggle');

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
        const blob = new Blob(chunksRef.current, { type: mimeType });
        if (blob.size < 500) { setError('Recording too short'); return; }
        await transcribeAudio(blob, mimeType);
      };

      recorder.start(250);
      setIsRecording(true);
      setDuration(0);
      setEnhancedText('');
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    } catch (err: any) {
      setError(err.name === 'NotAllowedError' ? 'Microphone access denied — check browser settings' : err.message);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
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
      let processed = data.text;
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

      setRawText(prev => prev ? prev + '\n\n' + processed.trim() : processed.trim());
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

      // Save to history
      setHistory(prev => {
        const item: HistoryItem = {
          id: Date.now().toString(),
          raw: rawText,
          enhanced: '', // Will be updated below
          mode,
          date: new Date().toISOString(),
        };
        const updated = [item, ...prev].slice(0, 50);
        saveJSON('av_history', updated);
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
      const filename = `AlecRae_${mode}_${new Date().toISOString().split('T')[0]}.docx`;
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

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  const formatDate = (iso: string) => new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  // === Render ===
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="shrink-0 border-b border-ink-800/60 px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-lg text-ink-50">
            AlecRae <span className="text-gold-400">Voice</span>
          </h1>
          {privacyMode && (
            <span className="text-[10px] bg-red-500/20 text-red-300 px-2 py-0.5 rounded-full">PRIVACY</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {(['vocabulary', 'hotkeys', 'history', 'settings'] as Panel[]).map(p => (
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
                <div className="space-y-2 max-h-[70vh] overflow-y-auto">
                  {history.map(item => (
                    <button
                      key={item.id}
                      onClick={() => loadFromHistory(item)}
                      className="w-full text-left bg-ink-800/50 hover:bg-ink-800 rounded-lg px-3 py-2 transition-colors"
                    >
                      <p className="text-xs text-ink-400 mb-1">{formatDate(item.date)} · {item.mode}</p>
                      <p className="text-sm text-ink-200 line-clamp-2">{item.raw.slice(0, 120)}...</p>
                    </button>
                  ))}
                  {history.length === 0 && <p className="text-xs text-ink-600 italic">No history yet</p>}
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
                  : 'bg-gold-500 hover:bg-gold-400 hover:scale-105'
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
                  <p className="text-red-400 text-sm font-medium">Recording {formatTime(duration)}</p>
                  <p className="text-ink-500 text-xs">Tap button or press {hotkeys.record} to stop</p>
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

            {/* Mode Selector */}
            <select
              value={mode}
              onChange={e => setMode(e.target.value as DocMode)}
              className="shrink-0 bg-ink-800 border border-ink-700/50 rounded-lg px-3 py-2 text-sm text-ink-200 focus:border-gold-500/50 max-w-[200px]"
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
                <span className="text-xs text-ink-400 font-medium">Raw dictation</span>
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
            <div className="flex flex-col min-h-0 bg-ink-900/40 rounded-xl border border-ink-800/50 overflow-hidden">
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

          {/* Bottom Action Bar */}
          <section className="shrink-0 flex items-center gap-3 flex-wrap">
            <button
              onClick={enhanceText}
              disabled={!rawText.trim() || isEnhancing}
              className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                !rawText.trim() || isEnhancing
                  ? 'bg-ink-800 text-ink-500 cursor-not-allowed'
                  : 'bg-gold-500 text-ink-950 hover:bg-gold-400 shadow-sm'
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
