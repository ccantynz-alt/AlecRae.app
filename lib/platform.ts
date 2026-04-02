export interface PlatformInfo {
  os: 'ios' | 'android' | 'windows' | 'mac' | 'linux' | 'unknown';
  browser: 'chrome' | 'safari' | 'firefox' | 'edge' | 'opera' | 'samsung' | 'unknown';
  isNative: boolean;
  isPWA: boolean;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  supportsMediaRecorder: boolean;
  supportsSpeechRecognition: boolean;
  supportsNotifications: boolean;
  maxAudioFormat: 'webm' | 'mp4' | 'ogg';
}

function detectOS(ua: string): PlatformInfo['os'] {
  if (/iPad|iPhone|iPod/.test(ua) || (ua.includes('Mac') && 'ontouchend' in document)) {
    return 'ios';
  }
  if (/Android/.test(ua)) return 'android';
  if (/Win/.test(ua)) return 'windows';
  if (/Mac/.test(ua)) return 'mac';
  if (/Linux/.test(ua)) return 'linux';
  return 'unknown';
}

function detectBrowser(ua: string): PlatformInfo['browser'] {
  // Order matters — Edge and Opera include Chrome in their UA strings
  if (/SamsungBrowser/i.test(ua)) return 'samsung';
  if (/OPR|Opera/i.test(ua)) return 'opera';
  if (/Edg/i.test(ua)) return 'edge';
  if (/Chrome|CriOS/i.test(ua)) return 'chrome';
  if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) return 'safari';
  if (/Firefox|FxiOS/i.test(ua)) return 'firefox';
  return 'unknown';
}

function detectIsTablet(ua: string, os: PlatformInfo['os']): boolean {
  if (os === 'ios') {
    // iPad with desktop UA — check for touch support + Mac platform
    return /iPad/.test(ua) || (ua.includes('Mac') && 'ontouchend' in document && window.innerWidth >= 768);
  }
  if (os === 'android') {
    // Android tablets generally don't include "Mobile" in UA
    return !/Mobile/.test(ua);
  }
  return false;
}

function detectBestAudioFormat(browser: PlatformInfo['browser'], os: PlatformInfo['os']): PlatformInfo['maxAudioFormat'] {
  // Safari and iOS do not support webm recording
  if (browser === 'safari' || os === 'ios') return 'mp4';

  // Firefox supports both webm and ogg, but webm/opus is preferred
  if (browser === 'firefox') {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
      return 'webm';
    }
    return 'ogg';
  }

  // Chrome, Edge, Opera, Samsung — webm/opus is well supported
  return 'webm';
}

export function detectPlatform(): PlatformInfo {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    // Server-side fallback
    return {
      os: 'unknown',
      browser: 'unknown',
      isNative: false,
      isPWA: false,
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      supportsMediaRecorder: false,
      supportsSpeechRecognition: false,
      supportsNotifications: false,
      maxAudioFormat: 'webm',
    };
  }

  const ua = navigator.userAgent;
  const os = detectOS(ua);
  const browser = detectBrowser(ua);

  // Capacitor injects a global object
  const isNative = !!(window as unknown as Record<string, unknown>).Capacitor;

  // Detect installed PWA via display-mode media query or iOS standalone
  const isPWA =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    (navigator as unknown as Record<string, unknown>).standalone === true;

  const isTablet = detectIsTablet(ua, os);
  const isMobile = (os === 'ios' || os === 'android') && !isTablet;
  const isDesktop = !isMobile && !isTablet;

  const supportsMediaRecorder = typeof MediaRecorder !== 'undefined';

  const supportsSpeechRecognition =
    'SpeechRecognition' in window ||
    'webkitSpeechRecognition' in window;

  const supportsNotifications =
    'Notification' in window && 'serviceWorker' in navigator;

  const maxAudioFormat = detectBestAudioFormat(browser, os);

  return {
    os,
    browser,
    isNative,
    isPWA,
    isMobile,
    isTablet,
    isDesktop,
    supportsMediaRecorder,
    supportsSpeechRecognition,
    supportsNotifications,
    maxAudioFormat,
  };
}

export function getOptimalAudioConfig(platform: PlatformInfo): MediaRecorderOptions {
  switch (platform.maxAudioFormat) {
    case 'mp4':
      // Safari / iOS — AAC in MP4 container
      return {
        mimeType: 'audio/mp4',
        audioBitsPerSecond: 128000,
      };

    case 'ogg':
      // Firefox fallback when webm isn't supported
      return {
        mimeType: 'audio/ogg;codecs=opus',
        audioBitsPerSecond: 128000,
      };

    case 'webm':
    default:
      // Chrome, Edge, Opera, Samsung — best quality
      return {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 128000,
      };
  }
}

export function getInstallInstructions(platform: PlatformInfo): string {
  if (platform.isPWA || platform.isNative) {
    return 'AlecRae Voice is already installed on this device.';
  }

  switch (platform.os) {
    case 'ios':
      return [
        'To install AlecRae Voice on your iPhone or iPad:',
        '1. Tap the Share button (square with arrow) in Safari',
        '2. Scroll down and tap "Add to Home Screen"',
        '3. Tap "Add" to confirm',
        '',
        'The app will appear on your home screen and run in full-screen mode.',
      ].join('\n');

    case 'android':
      if (platform.browser === 'chrome' || platform.browser === 'edge') {
        return [
          'To install AlecRae Voice on your Android device:',
          '1. Tap the three-dot menu in the top right',
          '2. Tap "Install app" or "Add to Home screen"',
          '3. Tap "Install" to confirm',
          '',
          'The app will appear in your app drawer and home screen.',
        ].join('\n');
      }
      if (platform.browser === 'samsung') {
        return [
          'To install AlecRae Voice on your Samsung device:',
          '1. Tap the menu icon (three lines) at the bottom',
          '2. Tap "Add page to" then "Home screen"',
          '3. Tap "Add" to confirm',
        ].join('\n');
      }
      return [
        'To install AlecRae Voice:',
        '1. Open this page in Chrome or Edge',
        '2. Tap the browser menu and select "Install app"',
      ].join('\n');

    case 'mac':
      if (platform.browser === 'chrome' || platform.browser === 'edge') {
        return [
          'To install AlecRae Voice on your Mac:',
          '1. Click the install icon in the address bar (right side)',
          '   Or go to the browser menu and select "Install AlecRae Voice"',
          '2. Click "Install" to confirm',
          '',
          'The app will appear in your Applications folder and Dock.',
        ].join('\n');
      }
      if (platform.browser === 'safari') {
        return [
          'To install AlecRae Voice on your Mac (macOS Sonoma or later):',
          '1. Click File in the menu bar',
          '2. Select "Add to Dock"',
          '',
          'The app will appear in your Dock and run in its own window.',
        ].join('\n');
      }
      return [
        'To install AlecRae Voice:',
        'Open this page in Chrome, Edge, or Safari (macOS Sonoma+)',
        'and use the browser\'s install option.',
      ].join('\n');

    case 'windows':
      if (platform.browser === 'chrome' || platform.browser === 'edge') {
        return [
          'To install AlecRae Voice on Windows:',
          '1. Click the install icon in the address bar (right side)',
          '   Or go to the browser menu and select "Install AlecRae Voice"',
          '2. Click "Install" to confirm',
          '',
          'The app will appear in your Start menu and can be pinned to the taskbar.',
        ].join('\n');
      }
      return [
        'To install AlecRae Voice:',
        'Open this page in Chrome or Edge and use the browser\'s install option.',
      ].join('\n');

    case 'linux':
      return [
        'To install AlecRae Voice on Linux:',
        '1. Open this page in Chrome or Edge',
        '2. Click the install icon in the address bar',
        '3. Click "Install" to confirm',
        '',
        'The app will be available as a desktop application.',
      ].join('\n');

    default:
      return [
        'To install AlecRae Voice:',
        'Open this page in a modern browser (Chrome, Edge, or Safari)',
        'and look for the install option in the address bar or browser menu.',
      ].join('\n');
  }
}
