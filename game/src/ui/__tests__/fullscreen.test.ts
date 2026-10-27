import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  isFullscreenSupported,
  isFullscreenActive,
  isIOS,
  isStandalone,
  toggleFullscreen,
  listenFullscreenChange,
} from '../fullscreen';

describe('fullscreen utilities', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('isFullscreenSupported', () => {
    it('returns false when document is undefined', () => {
      vi.stubGlobal('document', undefined);
      expect(isFullscreenSupported()).toBe(false);
    });

    it('returns true when document.fullscreenEnabled is true', () => {
      vi.stubGlobal('document', {
        fullscreenEnabled: true,
        documentElement: {},
      });
      expect(isFullscreenSupported()).toBe(true);
    });

    it('returns true when webkitFullscreenEnabled is true', () => {
      vi.stubGlobal('document', {
        webkitFullscreenEnabled: true,
        documentElement: {},
      });
      expect(isFullscreenSupported()).toBe(true);
    });

    it('returns true when documentElement has requestFullscreen', () => {
      vi.stubGlobal('document', {
        documentElement: {
          requestFullscreen: vi.fn(),
        },
      });
      expect(isFullscreenSupported()).toBe(true);
    });

    it('returns true when documentElement has webkitRequestFullscreen', () => {
      vi.stubGlobal('document', {
        documentElement: {
          webkitRequestFullscreen: vi.fn(),
        },
      });
      expect(isFullscreenSupported()).toBe(true);
    });

    it('returns false when no fullscreen methods or properties exist', () => {
      vi.stubGlobal('document', {
        documentElement: {},
      });
      expect(isFullscreenSupported()).toBe(false);
    });
  });

  describe('isFullscreenActive', () => {
    it('returns false when document is undefined', () => {
      vi.stubGlobal('document', undefined);
      expect(isFullscreenActive()).toBe(false);
    });

    it('returns true when document.fullscreenElement is set', () => {
      vi.stubGlobal('document', {
        fullscreenElement: {},
      });
      expect(isFullscreenActive()).toBe(true);
    });

    it('returns true when webkitFullscreenElement is set', () => {
      vi.stubGlobal('document', {
        webkitFullscreenElement: {},
      });
      expect(isFullscreenActive()).toBe(true);
    });

    it('returns false when no element is fullscreen', () => {
      vi.stubGlobal('document', {
        fullscreenElement: null,
        webkitFullscreenElement: null,
      });
      expect(isFullscreenActive()).toBe(false);
    });
  });

  describe('toggleFullscreen', () => {
    it('returns unsupported when document is undefined', async () => {
      vi.stubGlobal('document', undefined);
      expect(await toggleFullscreen()).toBe('unsupported');
    });

    it('exits fullscreen when already active using standard API', async () => {
      const exitFn = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal('document', {
        fullscreenElement: {},
        exitFullscreen: exitFn,
        documentElement: {},
      });

      const res = await toggleFullscreen();
      expect(res).toBe('exited');
      expect(exitFn).toHaveBeenCalledTimes(1);
    });

    it('exits fullscreen using webkitExitFullscreen fallback', async () => {
      const webkitExitFn = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal('document', {
        webkitFullscreenElement: {},
        webkitExitFullscreen: webkitExitFn,
        documentElement: {},
      });

      const res = await toggleFullscreen();
      expect(res).toBe('exited');
      expect(webkitExitFn).toHaveBeenCalledTimes(1);
    });

    it('enters fullscreen using standard requestFullscreen', async () => {
      const requestFn = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal('document', {
        fullscreenElement: null,
        documentElement: {
          requestFullscreen: requestFn,
        },
      });

      const res = await toggleFullscreen();
      expect(res).toBe('entered');
      expect(requestFn).toHaveBeenCalledWith({ navigationUI: 'hide' });
    });

    it('enters fullscreen using webkitRequestFullscreen fallback', async () => {
      const webkitReqFn = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal('document', {
        fullscreenElement: null,
        documentElement: {
          webkitRequestFullscreen: webkitReqFn,
        },
      });

      const res = await toggleFullscreen();
      expect(res).toBe('entered');
      expect(webkitReqFn).toHaveBeenCalledTimes(1);
    });

    it('returns failed when requestFullscreen throws/rejects', async () => {
      const requestFn = vi.fn().mockRejectedValue(new Error('Permission denied'));
      vi.stubGlobal('document', {
        fullscreenElement: null,
        documentElement: {
          requestFullscreen: requestFn,
        },
      });

      const res = await toggleFullscreen();
      expect(res).toBe('failed');
    });

    it('returns unsupported and scrolls when no element fullscreen method is available', async () => {
      const scrollToFn = vi.fn();
      vi.stubGlobal('window', {
        scrollTo: scrollToFn,
      });
      vi.stubGlobal('document', {
        fullscreenElement: null,
        documentElement: {},
      });

      const res = await toggleFullscreen();
      expect(res).toBe('unsupported');
      expect(scrollToFn).toHaveBeenCalledWith(0, 1);
    });
  });

  describe('isIOS and isStandalone', () => {
    it('detects iPhone from user agent', () => {
      vi.stubGlobal('navigator', {
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
        platform: 'iPhone',
      });
      expect(isIOS()).toBe(true);
    });

    it('detects iPad with multitouch from platform and maxTouchPoints', () => {
      vi.stubGlobal('navigator', {
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        platform: 'MacIntel',
        maxTouchPoints: 5,
      });
      expect(isIOS()).toBe(true);
    });

    it('returns false for Android or desktop user agents', () => {
      vi.stubGlobal('navigator', {
        userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8)',
        platform: 'Linux armv8l',
        maxTouchPoints: 5,
      });
      expect(isIOS()).toBe(false);
    });

    it('detects standalone mode via matchMedia', () => {
      vi.stubGlobal('window', {
        matchMedia: vi.fn().mockReturnValue({ matches: true }),
      });
      vi.stubGlobal('navigator', {});
      expect(isStandalone()).toBe(true);
    });

    it('detects standalone mode via navigator.standalone', () => {
      vi.stubGlobal('window', {
        matchMedia: vi.fn().mockReturnValue({ matches: false }),
      });
      vi.stubGlobal('navigator', { standalone: true });
      expect(isStandalone()).toBe(true);
    });
  });

  describe('listenFullscreenChange', () => {
    it('attaches event listeners to document and invokes callback on event', () => {
      const listeners: Record<string, () => void> = {};
      const addSpy = vi.fn((event: string, handler: () => void) => {
        listeners[event] = handler;
      });
      const removeSpy = vi.fn();

      vi.stubGlobal('document', {
        addEventListener: addSpy,
        removeEventListener: removeSpy,
        fullscreenElement: null,
      });

      const callback = vi.fn();
      const cleanup = listenFullscreenChange(callback);

      expect(addSpy).toHaveBeenCalledWith('fullscreenchange', expect.any(Function));
      expect(addSpy).toHaveBeenCalledWith('webkitfullscreenchange', expect.any(Function));

      // Trigger standard fullscreenchange event
      listeners['fullscreenchange']?.();
      expect(callback).toHaveBeenCalledWith(false);

      cleanup();
      expect(removeSpy).toHaveBeenCalledWith('fullscreenchange', expect.any(Function));
      expect(removeSpy).toHaveBeenCalledWith('webkitfullscreenchange', expect.any(Function));
    });
  });
});
