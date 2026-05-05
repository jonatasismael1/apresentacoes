import { useEffect, useCallback, useRef } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// SOBRE CONTROLES BLUETOOTH EM MOBILE (Android/iOS)
// ─────────────────────────────────────────────────────────────────────────────
// ⚠️  IMPORTANTE: Teclas de Volume (VolumeUp/Down) e Media (MediaTrackNext/
// Previous, MediaPlayPause) são interceptadas pelo SISTEMA OPERACIONAL antes
// de chegar ao browser. É uma limitação do Android/iOS — não é possível
// capturá-las nem com preventDefault().
//
// Teclas que SIM chegam ao browser mobile:
//   - ArrowUp / ArrowDown / ArrowLeft / ArrowRight
//   - PageUp / PageDown
//   - Enter / Space
//   - F5, F8 (alguns modelos)
//
// O Ulanzi em modo "Page" envia PageUp/PageDown (use este modo se disponível).
// O Ulanzi em modo "Arrow" envia ArrowUp/ArrowDown.
// O botão central tipicamente envia Enter ou Space.
// ─────────────────────────────────────────────────────────────────────────────

export const KEY_MAP = {
  scrollUp: [
    'ArrowUp',
    'PageUp',
    // Volume keys: NÃO funcionam em mobile (interceptadas pelo SO)
    // Deixadas aqui para desktop/PWA instalado como app
    'AudioVolumeUp',
    'VolumeUp',
  ],
  scrollDown: [
    'ArrowDown',
    'PageDown',
    'AudioVolumeDown',
    'VolumeDown',
  ],
  speedDecrease: [
    'ArrowLeft',
    'MediaTrackPrevious',
  ],
  speedIncrease: [
    'ArrowRight',
    'MediaTrackNext',
  ],
  togglePlayPause: [
    'Enter',
    ' ',               // Space
    'MediaPlayPause',
    'MediaPlay',
    'MediaPause',
    'MediaStop',
    'F5',
    'F8',
    'AudioPlay',
  ],
} as const;

// KeyCodes numéricos — fallback para dispositivos que deixam event.key vazio
// Funciona em browsers desktop e em PWA instalado
export const KEYCODE_MAP: Record<number, keyof typeof KEY_MAP> = {
  38: 'scrollUp',       // ArrowUp
  33: 'scrollUp',       // PageUp
  175: 'scrollUp',      // VolumeUp (Windows/desktop)
  40: 'scrollDown',     // ArrowDown
  34: 'scrollDown',     // PageDown
  174: 'scrollDown',    // VolumeDown (Windows/desktop)
  37: 'speedDecrease',  // ArrowLeft
  39: 'speedIncrease',  // ArrowRight
  13: 'togglePlayPause', // Enter
  32: 'togglePlayPause', // Space
  179: 'togglePlayPause', // MediaPlayPause (Windows)
  116: 'togglePlayPause', // F5
  119: 'togglePlayPause', // F8
};

export type TeleprompterAction = keyof typeof KEY_MAP;

export interface UseTeleprompterKeysOptions {
  /** O teleprompter está ativo? Atalhos só atuam quando true. */
  active: boolean;
  onScrollUp?: () => void;
  onScrollDown?: () => void;
  onSpeedDecrease?: () => void;
  onSpeedIncrease?: () => void;
  onTogglePlayPause?: () => void;
  /** Callback para o painel de debug */
  onKeyDebug?: (info: KeyDebugInfo) => void;
  /** Container que deve receber foco para capturar eventos de teclado */
  containerRef?: React.RefObject<HTMLElement | null>;
}

export interface KeyDebugInfo {
  key: string;
  code: string;
  keyCode: number;
  type: 'keydown' | 'keyup';
  action: TeleprompterAction | null;
  timestamp: number;
  source: 'key' | 'keycode';
}

function isTypingTarget(el: EventTarget | null): boolean {
  if (!el || !(el instanceof HTMLElement)) return false;
  const tag = el.tagName.toLowerCase();
  if (['input', 'textarea', 'select'].includes(tag)) return true;
  if (el.isContentEditable) return true;
  return false;
}

function resolveActionByKey(key: string): TeleprompterAction | null {
  if (!key || key === 'Unidentified') return null;
  for (const [action, keys] of Object.entries(KEY_MAP)) {
    if ((keys as readonly string[]).includes(key)) {
      return action as TeleprompterAction;
    }
  }
  return null;
}

function resolveActionByKeyCode(keyCode: number): TeleprompterAction | null {
  return KEYCODE_MAP[keyCode] ?? null;
}

export function useTeleprompterKeys(options: UseTeleprompterKeysOptions) {
  const {
    active,
    onScrollUp,
    onScrollDown,
    onSpeedDecrease,
    onSpeedIncrease,
    onTogglePlayPause,
    onKeyDebug,
    containerRef,
  } = options;

  const cbRef = useRef({
    onScrollUp,
    onScrollDown,
    onSpeedDecrease,
    onSpeedIncrease,
    onTogglePlayPause,
    onKeyDebug,
  });
  cbRef.current = { onScrollUp, onScrollDown, onSpeedDecrease, onSpeedIncrease, onTogglePlayPause, onKeyDebug };

  const activeRef = useRef(active);
  activeRef.current = active;

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!activeRef.current) return;
    if (isTypingTarget(e.target)) return;

    let action = resolveActionByKey(e.key);
    let source: KeyDebugInfo['source'] = 'key';

    if (!action && e.keyCode) {
      action = resolveActionByKeyCode(e.keyCode);
      if (action) source = 'keycode';
    }

    cbRef.current.onKeyDebug?.({
      key: e.key || '(vazio)',
      code: e.code || '(vazio)',
      keyCode: e.keyCode,
      type: 'keydown',
      action,
      timestamp: Date.now(),
      source,
    });

    if (!action) return;

    // Bloqueia comportamentos padrão (scroll de página, etc.)
    // Nota: NÃO bloqueia Volume/Media no mobile — SO os intercepta antes
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    switch (action) {
      case 'scrollUp':        cbRef.current.onScrollUp?.();        break;
      case 'scrollDown':      cbRef.current.onScrollDown?.();      break;
      case 'speedDecrease':   cbRef.current.onSpeedDecrease?.();   break;
      case 'speedIncrease':   cbRef.current.onSpeedIncrease?.();   break;
      case 'togglePlayPause': cbRef.current.onTogglePlayPause?.(); break;
    }
  }, []);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (!activeRef.current) return;
    if (isTypingTarget(e.target)) return;

    let action = resolveActionByKey(e.key);
    let source: KeyDebugInfo['source'] = 'key';
    if (!action && e.keyCode) {
      action = resolveActionByKeyCode(e.keyCode);
      if (action) source = 'keycode';
    }

    cbRef.current.onKeyDebug?.({
      key: e.key || '(vazio)',
      code: e.code || '(vazio)',
      keyCode: e.keyCode,
      type: 'keyup',
      action,
      timestamp: Date.now(),
      source,
    });
  }, []);

  // Registra em window e document com capture:true
  useEffect(() => {
    const opts = { capture: true, passive: false } as AddEventListenerOptions;
    window.addEventListener('keydown', handleKeyDown, opts);
    window.addEventListener('keyup',   handleKeyUp,   opts);
    document.addEventListener('keydown', handleKeyDown, opts);
    document.addEventListener('keyup',   handleKeyUp,   opts);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, opts);
      window.removeEventListener('keyup',   handleKeyUp,   opts);
      document.removeEventListener('keydown', handleKeyDown, opts);
      document.removeEventListener('keyup',   handleKeyUp,   opts);
    };
  }, [handleKeyDown, handleKeyUp]);

  // Foca o container quando ativo para garantir recebimento dos eventos
  useEffect(() => {
    if (!active) return;
    const el = containerRef?.current;
    if (el) {
      const tid = setTimeout(() => el.focus({ preventScroll: true }), 200);
      return () => clearTimeout(tid);
    }
  }, [active, containerRef]);
}
