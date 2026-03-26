'use client';

import * as React from 'react';
import { Camera, Clock, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ── helpers ─────────────────────────────────────────── */

function playBeep(freq = 880, durationMs = 80, volume = 0.08) {
  try {
    const ctx  = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = freq;
    osc.type            = 'square';
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + durationMs / 1000);
    ctx.close();
  } catch { /* audio unavailable */ }
}

const LS_KEY = 'wms-scan-history';

function loadHistory(): string[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]'); } catch { return []; }
}
function saveHistory(h: string[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(h.slice(0, 10))); } catch { /* noop */ }
}

/* ── types ───────────────────────────────────────────── */

type ScanState = 'idle' | 'focused' | 'success' | 'error';

export interface ScanInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onError' | 'onChange'> {
  /** Called with the scanned / submitted value */
  onScan: (value: string) => void;
  /** Called when scan results in an error (set scanState to error externally) */
  onScanError?: () => void;
  /** Override scan state from parent: 'success' or 'error' to flash rings */
  scanResult?: 'success' | 'error' | null;
  /** Clear input after scan  (default: true) */
  clearAfterScan?: boolean;
  /** Emit beep on scan (default: true) */
  beep?: boolean;
  /** Show recent scan history dropdown (default: true) */
  showHistory?: boolean;
  /** Show native camera barcode scanner button (default: true) */
  showCamera?: boolean;
  /** Controlled value */
  value?: string;
  onChange?: (value: string) => void;
}

/**
 * Barcode-scan-optimised input.
 *
 * - Emits a beep on Enter (Web Audio API, no assets required)
 * - Success / error flash ring with shake animation
 * - Stores last 10 scans in localStorage, shown in a dropdown
 * - Camera button opens native BarcodeDetector API on supported browsers
 * - Auto-clears after scan (configurable)
 */
export function ScanInput({
  onScan,
  onScanError,
  scanResult,
  clearAfterScan = true,
  beep = true,
  showHistory = true,
  showCamera = true,
  value: valueProp,
  onChange,
  className,
  ...props
}: ScanInputProps) {
  const isControlled              = valueProp !== undefined;
  const [internal, setInternal]   = React.useState('');
  const value                     = isControlled ? valueProp : internal;
  const setValue = (v: string) => {
    if (!isControlled) setInternal(v);
    onChange?.(v);
  };

  const [scanState, setScanState]   = React.useState<ScanState>('idle');
  const [showDrop,  setShowDrop]    = React.useState(false);
  const [history,   setHistory]     = React.useState<string[]>([]);
  const inputRef                    = React.useRef<HTMLInputElement>(null);
  const clearTimer                  = React.useRef<ReturnType<typeof setTimeout>>();

  /* Sync external scanResult */
  React.useEffect(() => {
    if (!scanResult) return;
    flash(scanResult);
  }, [scanResult]); // eslint-disable-line

  /* Load history */
  React.useEffect(() => { setHistory(loadHistory()); }, []);

  /* Cleanup timers */
  React.useEffect(() => () => clearTimeout(clearTimer.current), []);

  function flash(type: 'success' | 'error') {
    setScanState(type);
    clearTimeout(clearTimer.current);
    clearTimer.current = setTimeout(() => setScanState('idle'), 1600);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const v = value.trim();
    if (!v) return;

    if (beep) playBeep(880, 80);
    onScan(v);
    flash('success');

    /* Update history */
    const next = [v, ...history.filter((h) => h !== v)].slice(0, 10);
    setHistory(next);
    saveHistory(next);

    if (clearAfterScan) setValue('');
    setShowDrop(false);
  }

  /* Camera / BarcodeDetector API */
  async function openCamera() {
    const BD = (window as any).BarcodeDetector;
    if (!BD) {
      alert('BarcodeDetector API is not supported in this browser. Try Chrome on Android/desktop.');
      return;
    }
    try {
      const stream  = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      const video   = document.createElement('video');
      video.srcObject = stream;
      await video.play();
      const detector = new BD({ formats: ['qr_code', 'code_128', 'ean_13', 'code_39'] });
      const frame = document.createElement('canvas');
      frame.width  = video.videoWidth  || 640;
      frame.height = video.videoHeight || 480;
      const ctx = frame.getContext('2d')!;
      let found = false;
      const scan = async () => {
        if (found) return;
        ctx.drawImage(video, 0, 0);
        const codes = await detector.detect(frame);
        if (codes.length > 0) {
          found = true;
          stream.getTracks().forEach((t: MediaStreamTrack) => t.stop());
          const barcode = codes[0].rawValue as string;
          setValue(barcode);
          onScan(barcode);
          flash('success');
          if (beep) playBeep(880, 80);
        } else {
          requestAnimationFrame(scan);
        }
      };
      requestAnimationFrame(scan);
    } catch (err) {
      flash('error');
      onScanError?.();
    }
  }

  const ringClass = {
    idle:    '',
    focused: 'scan-focused',
    success: 'scan-success',
    error:   cn('scan-error', 'animate-scan-shake'),
  }[scanState];

  const filteredHistory = history.filter(
    (h) => h.toLowerCase().includes(value.toLowerCase()) && h !== value
  );

  return (
    <div className="relative">
      <div
        className={cn(
          'flex items-center gap-1.5 rounded-lg border border-input bg-transparent px-2.5 transition-all duration-150',
          ringClass,
          className
        )}
      >
        {/* Main input */}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => { setValue(e.target.value); setShowDrop(true); }}
          onFocus={() => { setScanState('focused'); setShowDrop(true); }}
          onBlur={() => {
            setScanState('idle');
            setTimeout(() => setShowDrop(false), 150);
          }}
          onKeyDown={handleKeyDown}
          className={cn(
            'h-9 flex-1 min-w-0 bg-transparent py-1 text-sm font-mono outline-none placeholder:text-muted-foreground',
          )}
          {...props}
        />

        {/* Clear button */}
        {value && (
          <button
            type="button"
            onClick={() => { setValue(''); inputRef.current?.focus(); }}
            className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Clear"
          >
            <X className="size-3.5" />
          </button>
        )}

        {/* Camera button */}
        {showCamera && (
          <button
            type="button"
            onClick={openCamera}
            className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Scan with camera"
          >
            <Camera className="size-3.5" />
          </button>
        )}
      </div>

      {/* History dropdown */}
      {showHistory && showDrop && filteredHistory.length > 0 && (
        <ul
          className="animate-fade-in absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-y-auto rounded-lg border border-border bg-popover shadow-md py-1"
          role="listbox"
        >
          <li className="flex items-center gap-1.5 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
            <Clock className="size-3" /> Recent scans
          </li>
          {filteredHistory.map((h) => (
            <li
              key={h}
              role="option"
              aria-selected={false}
              className="flex cursor-pointer items-center px-3 py-1.5 text-sm font-mono hover:bg-accent hover:text-accent-foreground transition-colors"
              onPointerDown={() => {
                setValue(h);
                setShowDrop(false);
                inputRef.current?.focus();
              }}
            >
              <span className="truncate">{h}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
