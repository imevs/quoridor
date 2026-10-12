import { describe, it, expect, vi, afterEach } from 'vitest';
import { generateQrSvg, downloadQrSvg, downloadQrPng } from '../qr';

describe('QR Code Generation', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('generates a valid SVG string for a P2P invite link', () => {
    const inviteUrl = 'https://quoridors.app/?p2p=test1234';
    const svg = generateQrSvg(inviteUrl);

    expect(svg).toContain('<svg');
    expect(svg).toContain('viewBox=');
    expect(svg).toContain('</svg>');
    expect(svg).toContain('fill="#ffffff"');
    expect(svg).toContain('fill="#1d3319"');
    expect(svg).toContain('<path');
  });

  it('respects custom error correction and color options', () => {
    const url = 'http://localhost:5173/?p2p=room-xyz';
    const svg = generateQrSvg(url, {
      ecc: 'H',
      border: 4,
      blackColor: '#004400',
      whiteColor: '#fefefe',
    });

    expect(svg).toContain('fill="#fefefe"');
    expect(svg).toContain('fill="#004400"');
  });

  it('handles empty text gracefully', () => {
    const svg = generateQrSvg('');
    expect(svg).toBe('');
  });

  it('handles node environment gracefully when document is undefined', async () => {
    expect(() => downloadQrSvg('<svg></svg>')).not.toThrow();
    await expect(downloadQrPng('<svg></svg>')).resolves.toBeUndefined();
  });

  it('triggers downloadQrSvg in browser environment', () => {
    const clickSpy = vi.fn();
    const mockAnchor = {
      href: '',
      download: '',
      click: clickSpy,
    };
    const appendSpy = vi.fn();
    const removeSpy = vi.fn();

    vi.stubGlobal('document', {
      body: {
        appendChild: appendSpy,
        removeChild: removeSpy,
      },
      createElement: vi.fn().mockReturnValue(mockAnchor),
    });

    const createUrlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test-url');
    const revokeUrlSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    downloadQrSvg('<svg></svg>', 'test-invite.svg');

    expect(createUrlSpy).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeUrlSpy).toHaveBeenCalledWith('blob:test-url');
    expect(mockAnchor.download).toBe('test-invite.svg');
  });

  it('handles downloadQrPng via canvas conversion in browser environment', async () => {
    const createUrlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test-url');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    class MockImage {
      onload: (() => void) | null = null;
      onerror: ((e: unknown) => void) | null = null;
      set src(_val: string) {
        setTimeout(() => {
          this.onload?.();
        }, 0);
      }
    }
    vi.stubGlobal('Image', MockImage);

    const fillRectSpy = vi.fn();
    const drawImageSpy = vi.fn();
    const clickSpy = vi.fn();
    const appendSpy = vi.fn();
    const removeSpy = vi.fn();

    const mockCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn().mockReturnValue({
        fillStyle: '',
        fillRect: fillRectSpy,
        drawImage: drawImageSpy,
      }),
      toBlob: vi.fn((cb: (b: Blob | null) => void) => {
        cb(new Blob(['fake-png']));
      }),
    };

    const mockAnchor = {
      href: '',
      download: '',
      click: clickSpy,
    };

    vi.stubGlobal('document', {
      body: {
        appendChild: appendSpy,
        removeChild: removeSpy,
      },
      createElement: vi.fn().mockImplementation((tagName: string) => {
        if (tagName === 'canvas') return mockCanvas;
        if (tagName === 'a') return mockAnchor;
        return {};
      }),
    });

    await downloadQrPng('<svg></svg>', 'test-invite.png');

    expect(createUrlSpy).toHaveBeenCalled();
    expect(fillRectSpy).toHaveBeenCalled();
    expect(drawImageSpy).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
  });
});
