export interface ShortcutDef {
  id: string;
  label: string;
  description: string;
  mac: string;
  windows: string;
  action: string;
  category: 'recording' | 'editing' | 'navigation' | 'export';
}

const SHORTCUTS: ShortcutDef[] = [
  // Recording
  {
    id: 'toggle-recording',
    label: 'Start / Stop Recording',
    description: 'Toggle dictation recording on or off',
    mac: '⌘+Shift+R',
    windows: 'Ctrl+Shift+R',
    action: 'toggleRecording',
    category: 'recording',
  },
  {
    id: 'enhance-text',
    label: 'Enhance Text',
    description: 'Send raw dictation to Claude for AI enhancement',
    mac: '⌘+Shift+E',
    windows: 'Ctrl+Shift+E',
    action: 'enhanceText',
    category: 'recording',
  },
  {
    id: 'toggle-privacy',
    label: 'Toggle Privacy Mode',
    description: 'Enable or disable privacy mode (no history saved)',
    mac: '⌘+Shift+P',
    windows: 'Ctrl+Shift+P',
    action: 'togglePrivacy',
    category: 'recording',
  },

  // Editing
  {
    id: 'copy-raw',
    label: 'Copy Raw Text',
    description: 'Copy the raw transcription to clipboard',
    mac: '⌘+Shift+C',
    windows: 'Ctrl+Shift+C',
    action: 'copyRaw',
    category: 'editing',
  },
  {
    id: 'copy-enhanced',
    label: 'Copy Enhanced Text',
    description: 'Copy the AI-enhanced text to clipboard',
    mac: '⌘+Shift+X',
    windows: 'Ctrl+Shift+X',
    action: 'copyEnhanced',
    category: 'editing',
  },
  {
    id: 'clear-all',
    label: 'Clear All',
    description: 'Clear both raw and enhanced text',
    mac: '⌘+Shift+Delete',
    windows: 'Ctrl+Shift+Delete',
    action: 'clearAll',
    category: 'editing',
  },
  {
    id: 'undo',
    label: 'Undo',
    description: 'Undo the last text edit',
    mac: '⌘+Z',
    windows: 'Ctrl+Z',
    action: 'undo',
    category: 'editing',
  },
  {
    id: 'redo',
    label: 'Redo',
    description: 'Redo the last undone text edit',
    mac: '⌘+Shift+Z',
    windows: 'Ctrl+Shift+Z',
    action: 'redo',
    category: 'editing',
  },
  {
    id: 'select-all',
    label: 'Select All',
    description: 'Select all text in the active editor',
    mac: '⌘+A',
    windows: 'Ctrl+A',
    action: 'selectAll',
    category: 'editing',
  },
  {
    id: 'find-replace',
    label: 'Find and Replace',
    description: 'Open the find and replace dialog',
    mac: '⌘+H',
    windows: 'Ctrl+H',
    action: 'findReplace',
    category: 'editing',
  },

  // Export
  {
    id: 'export-docx',
    label: 'Export .docx',
    description: 'Export the enhanced text as a Word document',
    mac: '⌘+Shift+D',
    windows: 'Ctrl+Shift+D',
    action: 'exportDocx',
    category: 'export',
  },
  {
    id: 'batch-upload',
    label: 'Batch Upload',
    description: 'Open the batch audio file upload dialog',
    mac: '⌘+Shift+U',
    windows: 'Ctrl+Shift+U',
    action: 'batchUpload',
    category: 'export',
  },
  {
    id: 'template-picker',
    label: 'Template Picker',
    description: 'Open the document template selector',
    mac: '⌘+Shift+T',
    windows: 'Ctrl+Shift+T',
    action: 'templatePicker',
    category: 'export',
  },

  // Navigation
  {
    id: 'open-settings',
    label: 'Settings',
    description: 'Open the settings panel',
    mac: '⌘+,',
    windows: 'Ctrl+,',
    action: 'openSettings',
    category: 'navigation',
  },
  {
    id: 'open-vocabulary',
    label: 'Vocabulary',
    description: 'Open the custom vocabulary editor',
    mac: '⌘+Shift+V',
    windows: 'Ctrl+Shift+V',
    action: 'openVocabulary',
    category: 'navigation',
  },
  {
    id: 'open-hotkeys',
    label: 'Hotkeys',
    description: 'Open the keyboard shortcut configuration',
    mac: '⌘+Shift+K',
    windows: 'Ctrl+Shift+K',
    action: 'openHotkeys',
    category: 'navigation',
  },
  {
    id: 'open-history',
    label: 'History',
    description: 'Open the dictation history panel',
    mac: '⌘+Shift+H',
    windows: 'Ctrl+Shift+H',
    action: 'openHistory',
    category: 'navigation',
  },
  {
    id: 'open-admin',
    label: 'Admin Dashboard',
    description: 'Navigate to the admin dashboard',
    mac: '⌘+Shift+A',
    windows: 'Ctrl+Shift+A',
    action: 'openAdmin',
    category: 'navigation',
  },
  {
    id: 'open-billing',
    label: 'Billing',
    description: 'Navigate to the billing page',
    mac: '⌘+Shift+B',
    windows: 'Ctrl+Shift+B',
    action: 'openBilling',
    category: 'navigation',
  },

  // Document mode switching (1-9, 0)
  {
    id: 'mode-1',
    label: 'Mode 1: General Cleanup',
    description: 'Switch document mode to General Cleanup',
    mac: '⌘+1',
    windows: 'Ctrl+1',
    action: 'setMode:general',
    category: 'navigation',
  },
  {
    id: 'mode-2',
    label: 'Mode 2: Client Email',
    description: 'Switch document mode to Client Email',
    mac: '⌘+2',
    windows: 'Ctrl+2',
    action: 'setMode:email',
    category: 'navigation',
  },
  {
    id: 'mode-3',
    label: 'Mode 3: Meeting Notes',
    description: 'Switch document mode to Meeting Notes',
    mac: '⌘+3',
    windows: 'Ctrl+3',
    action: 'setMode:meeting',
    category: 'navigation',
  },
  {
    id: 'mode-4',
    label: 'Mode 4: Legal Letter',
    description: 'Switch document mode to Legal Letter',
    mac: '⌘+4',
    windows: 'Ctrl+4',
    action: 'setMode:legal-letter',
    category: 'navigation',
  },
  {
    id: 'mode-5',
    label: 'Mode 5: Legal Memorandum',
    description: 'Switch document mode to Legal Memorandum',
    mac: '⌘+5',
    windows: 'Ctrl+5',
    action: 'setMode:legal-memo',
    category: 'navigation',
  },
  {
    id: 'mode-6',
    label: 'Mode 6: Court Filing',
    description: 'Switch document mode to Court Filing',
    mac: '⌘+6',
    windows: 'Ctrl+6',
    action: 'setMode:court-filing',
    category: 'navigation',
  },
  {
    id: 'mode-7',
    label: 'Mode 7: Demand Letter',
    description: 'Switch document mode to Demand Letter',
    mac: '⌘+7',
    windows: 'Ctrl+7',
    action: 'setMode:demand-letter',
    category: 'navigation',
  },
  {
    id: 'mode-8',
    label: 'Mode 8: Deposition Summary',
    description: 'Switch document mode to Deposition Summary',
    mac: '⌘+8',
    windows: 'Ctrl+8',
    action: 'setMode:deposition',
    category: 'navigation',
  },
  {
    id: 'mode-9',
    label: 'Mode 9: Engagement Letter',
    description: 'Switch document mode to Engagement Letter',
    mac: '⌘+9',
    windows: 'Ctrl+9',
    action: 'setMode:engagement',
    category: 'navigation',
  },
  {
    id: 'mode-0',
    label: 'Mode 10: Accounting Report',
    description: 'Switch document mode to Accounting Report',
    mac: '⌘+0',
    windows: 'Ctrl+0',
    action: 'setMode:accounting',
    category: 'navigation',
  },
];

export function getShortcuts(os: 'mac' | 'windows' | 'linux'): ShortcutDef[] {
  return SHORTCUTS;
}

export function formatShortcut(shortcut: ShortcutDef, os: string): string {
  if (os === 'mac') {
    return shortcut.mac;
  }
  // Windows and Linux use the same key bindings
  return shortcut.windows;
}

/**
 * Returns shortcuts filtered by category.
 */
export function getShortcutsByCategory(
  os: 'mac' | 'windows' | 'linux',
  category: ShortcutDef['category']
): ShortcutDef[] {
  return SHORTCUTS.filter((s) => s.category === category);
}

/**
 * Finds a shortcut definition by its action name.
 */
export function getShortcutByAction(action: string): ShortcutDef | undefined {
  return SHORTCUTS.find((s) => s.action === action);
}

/**
 * Parses a keyboard event into a shortcut string for matching.
 * Returns format like "Ctrl+Shift+R" or "⌘+Shift+R".
 */
export function eventToShortcutString(event: KeyboardEvent, os: string): string {
  const parts: string[] = [];

  if (os === 'mac') {
    if (event.metaKey) parts.push('⌘');
    if (event.ctrlKey) parts.push('Ctrl');
  } else {
    if (event.ctrlKey) parts.push('Ctrl');
    if (event.metaKey) parts.push('Meta');
  }

  if (event.altKey) parts.push('Alt');
  if (event.shiftKey) parts.push('Shift');

  // Map special keys
  const keyMap: Record<string, string> = {
    Backspace: 'Delete',
    Delete: 'Delete',
    ',': ',',
  };

  const key = keyMap[event.key] || event.key.toUpperCase();
  if (!['Control', 'Meta', 'Alt', 'Shift'].includes(event.key)) {
    parts.push(key);
  }

  return parts.join('+');
}

/**
 * Finds the matching shortcut for a keyboard event.
 */
export function matchShortcut(
  event: KeyboardEvent,
  os: 'mac' | 'windows' | 'linux'
): ShortcutDef | undefined {
  const pressed = eventToShortcutString(event, os);
  return SHORTCUTS.find((s) => {
    const expected = os === 'mac' ? s.mac : s.windows;
    return expected === pressed;
  });
}
