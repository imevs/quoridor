/**
 * Fullscreen API helper with cross-browser and mobile vendor-prefix fallbacks.
 */

export type FullscreenResult = 'entered' | 'exited' | 'unsupported' | 'failed';

interface FullscreenDocument extends Document {
  webkitFullscreenEnabled?: boolean;
  mozFullScreenEnabled?: boolean;
  msFullscreenEnabled?: boolean;
  webkitFullscreenElement?: Element;
  mozFullScreenElement?: Element;
  msFullscreenElement?: Element;
  webkitExitFullscreen?: () => Promise<void> | void;
  mozCancelFullScreen?: () => Promise<void> | void;
  msExitFullscreen?: () => Promise<void> | void;
}

interface FullscreenElement extends HTMLElement {
  webkitRequestFullscreen?: (options?: unknown) => Promise<void> | void;
  webkitRequestFullScreen?: (options?: unknown) => Promise<void> | void;
  mozRequestFullScreen?: (options?: unknown) => Promise<void> | void;
  msRequestFullscreen?: (options?: unknown) => Promise<void> | void;
}

/** Whether the browser supports the native Fullscreen API on elements. */
export function isFullscreenSupported(): boolean {
  if (typeof document === 'undefined') return false;
  const doc = document as FullscreenDocument;
  const docEl = document.documentElement as FullscreenElement;
  return Boolean(
    doc.fullscreenEnabled ||
      doc.webkitFullscreenEnabled ||
      doc.mozFullScreenEnabled ||
      doc.msFullscreenEnabled ||
      typeof docEl.requestFullscreen === 'function' ||
      typeof docEl.webkitRequestFullscreen === 'function' ||
      typeof docEl.webkitRequestFullScreen === 'function' ||
      typeof docEl.mozRequestFullScreen === 'function' ||
      typeof docEl.msRequestFullscreen === 'function',
  );
}

/** Whether the document is currently in fullscreen mode. */
export function isFullscreenActive(): boolean {
  if (typeof document === 'undefined') return false;
  const doc = document as FullscreenDocument;
  return Boolean(
    doc.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.mozFullScreenElement ||
      doc.msFullscreenElement,
  );
}

/** Detects whether the current device is running iOS (iPhone, iPad, iPod). */
export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

/** Whether the web app is running in standalone PWA / Home Screen mode. */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = navigator as unknown as { standalone?: boolean };
  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    nav.standalone === true
  );
}

/**
 * Toggles fullscreen mode across desktop and mobile browsers.
 * Falls back gracefully when arbitrary element fullscreen is restricted (e.g. iPhone Safari).
 */
export async function toggleFullscreen(): Promise<FullscreenResult> {
  if (typeof document === 'undefined') return 'unsupported';
  const doc = document as FullscreenDocument;
  const docEl = document.documentElement as FullscreenElement;

  if (isFullscreenActive()) {
    try {
      if (typeof doc.exitFullscreen === 'function') {
        await doc.exitFullscreen();
      } else if (typeof doc.webkitExitFullscreen === 'function') {
        await doc.webkitExitFullscreen();
      } else if (typeof doc.mozCancelFullScreen === 'function') {
        await doc.mozCancelFullScreen();
      } else if (typeof doc.msExitFullscreen === 'function') {
        await doc.msExitFullscreen();
      }
      return 'exited';
    } catch {
      return 'failed';
    }
  }

  try {
    if (typeof docEl.requestFullscreen === 'function') {
      await docEl.requestFullscreen({ navigationUI: 'hide' });
      return 'entered';
    }
    if (typeof docEl.webkitRequestFullscreen === 'function') {
      await docEl.webkitRequestFullscreen();
      return 'entered';
    }
    if (typeof docEl.webkitRequestFullScreen === 'function') {
      await docEl.webkitRequestFullScreen();
      return 'entered';
    }
    if (typeof docEl.mozRequestFullScreen === 'function') {
      await docEl.mozRequestFullScreen();
      return 'entered';
    }
    if (typeof docEl.msRequestFullscreen === 'function') {
      await docEl.msRequestFullscreen();
      return 'entered';
    }
  } catch (err) {
    console.warn('Fullscreen request rejected:', err);
    return 'failed';
  }

  // Fallback for browsers without arbitrary element fullscreen (e.g. iPhone Safari)
  if (typeof window !== 'undefined') {
    window.scrollTo(0, 1);
  }
  return 'unsupported';
}

/**
 * Listens for fullscreen changes and invokes callback with active state.
 * Returns an unsubscribe cleanup function.
 */
export function listenFullscreenChange(onChange: (active: boolean) => void): () => void {
  if (typeof document === 'undefined') return () => {};

  const handler = () => {
    onChange(isFullscreenActive());
  };

  const events = [
    'fullscreenchange',
    'webkitfullscreenchange',
    'mozfullscreenchange',
    'MSFullscreenChange',
  ];

  for (const evt of events) {
    document.addEventListener(evt, handler);
  }

  return () => {
    for (const evt of events) {
      document.removeEventListener(evt, handler);
    }
  };
}
