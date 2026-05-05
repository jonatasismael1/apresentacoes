import { useEffect, useCallback, useRef } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// MAPEAMENTO DE TECLAS
// ─────────────────────────────────────────────────────────────────────────────
// Controles Bluetooth (como Ulanzi) em modo HID podem enviar teclas diferentes
// dependendo do modelo e firmware. O Ulanzi tipicamente envia:
//   - Scroll: VolumeUp / VolumeDown (AudioVolumeUp / AudioVolumeDown)
//   - Scroll alternativo: PageUp / PageDown ou ArrowUp / ArrowDown
//   - Play/Pause: Enter, Space, ou MediaPlayPause
//
// O painel de debug mostra exatamente qual tecla cada botão envia.
// Ajuste os arrays abaixo conforme necessário após identificar as teclas.
// ─────────────────────────────────────────────────────────────────────────────
export const KEY_MAP = {
  scrollUp: [
    'ArrowUp',
    'PageUp',
    'AudioVolumeUp',
    'VolumeUp',
    // keyCode fallbacks (alguns browsers antigos / mobile)
    'ChannelUp',
    'BrowserForward',
  ],
  scrollDown: [
    'ArrowDown',
    'PageDown',
    'AudioVolumeDown',
    'VolumeDown',
    'ChannelDown',
    'BrowserBack',
  ],
  speedDecrease: [
    'ArrowLeft',
    'MediaTrackPrevious',
    'BrowserRefresh',
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
    'F5',              // alguns controles genéricos enviam F5
    'F8',              // outros enviam F8 para play/pause
    'AudioPlay',
  ],
} as const;

// KeyCodes numéricos para compatibilidade com dispositivos que não preenchem event.key corretamente
// (alguns controles BT enviam keyCode mas deixam e.key vazio ou como 'Unidentified')
export const KEYCODE_MAP: Record<number, keyof typeof KEY_MAP> = {
  38: 'scrollUp',     // ArrowUp
  33: 'scrollUp',     // PageUp
  175: 'scrollUp',    // VolumeUp (Windows)
  73: 'scrollUp',     // Volume Up em alguns controles Android (keyCode 73)
  40: 'scrollDown',   // ArrowDown
  34: 'scrollDown',   // PageDown
  174: 'scrollDown',  // VolumeDown (Windows)
  74: 'scrollDown',   // Volume Down em alguns controles Android (keyCode 74)
  37: 'speedDecrease', // ArrowLeft
  39: 'speedIncrease', // ArrowRight
  13: 'togglePlayPause', // Enter
  32: 'togglePlayPause', // Space
  179: 'togglePlayPause', // MediaPlayPause (Windows)
  96: 'togglePlayPause',  // Numpad0 – alguns controles BT genéricos
  116: 'togglePlayPause', // F5
  119: 'togglePlayPause', // F8
};

export type TeleprompterAction = keyof typeof KEY_MAP;

export interface UseTeleprompterKeysOptions {
  /** O teleprompter está visível/ativo? Atalhos só atuam quando true. */
  active: boolean;
  onScrollUp?: () => void;
  onScrollDown?: () => void;
  onSpeedDecrease?: () => void;
  onSpeedIncrease?: () => void;
  onTogglePlayPause?: () => void;
  /** Callback chamado para todo evento de tecla enquanto o teleprompter está ativo. */
  onKeyDebug?: (info: KeyDebugInfo) => void;
  /** Ref do elemento container que deve receber foco para capturar teclas */
  containerRef?: React.RefObject<HTMLElement | null>;
}

export interface KeyDebugInfo {
  key: string;
  code: string;
  keyCode: number;
  type: 'keydown' | 'keyup';
  action: TeleprompterAction | null;
  timestamp: number;
  source: 'key' | 'keycode' | 'gamepad';
}

/** Retorna true se o foco estiver em campo de digitação que deve ser ignorado. */
function isTypingTarget(el: EventTarget | null): boolean {
  if (!el || !(el instanceof HTMLElement)) return false;
  const tag = el.tagName.toLowerCase();
  if (['input', 'textarea', 'select'].includes(tag)) return true;
  if (el.isContentEditable) return true;
  return false;
}

/** Resolve ação pelo valor de event.key */
function resolveActionByKey(key: string): TeleprompterAction | null {
  if (!key || key === 'Unidentified') return null;
  for (const [action, keys] of Object.entries(KEY_MAP)) {
    if ((keys as readonly string[]).includes(key)) {
      return action as TeleprompterAction;
    }
  }
  return null;
}

/** Resolve ação pelo keyCode numérico (fallback para dispositivos BT com event.key vazio) */
function resolveActionByKeyCode(keyCode: number): TeleprompterAction | null {
  return KEYCODE_MAP[keyCode] ?? null;
}

function dispatchAction(action: TeleprompterAction, callbacks: {
  onScrollUp?: () => void;
  onScrollDown?: () => void;
  onSpeedDecrease?: () => void;
  onSpeedIncrease?: () => void;
  onTogglePlayPause?: () => void;
}) {
  switch (action) {
    case 'scrollUp':        callbacks.onScrollUp?.();        break;
    case 'scrollDown':      callbacks.onScrollDown?.();      break;
    case 'speedDecrease':   callbacks.onSpeedDecrease?.();   break;
    case 'speedIncrease':   callbacks.onSpeedIncrease?.();   break;
    case 'togglePlayPause': callbacks.onTogglePlayPause?.(); break;
  }
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

  // Refs para manter callbacks atualizados sem re-registrar listeners
  const cbRef = useRef({
    onScrollUp,
    onScrollDown,
    onSpeedDecrease,
    onSpeedIncrease,
    onTogglePlayPause,
    onKeyDebug,
  });
  cbRef.current = {
    onScrollUp,
    onScrollDown,
    onSpeedDecrease,
    onSpeedIncrease,
    onTogglePlayPause,
    onKeyDebug,
  };

  const activeRef = useRef(active);
  activeRef.current = active;

  // ─── Handler principal de keydown ─────────────────────────────────────────
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!activeRef.current) return;
    if (isTypingTarget(e.target)) return;

    // Tenta resolver pelo valor da tecla primeiro
    let action = resolveActionByKey(e.key);
    let source: KeyDebugInfo['source'] = 'key';

    // Fallback: tenta pelo keyCode (para controles BT que não preenchem e.key)
    if (!action && e.keyCode) {
      action = resolveActionByKeyCode(e.keyCode);
      if (action) source = 'keycode';
    }

    // Envia para o painel de debug sempre (mesmo sem ação mapeada)
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

    // Bloqueia comportamento padrão do browser (scroll da página, volume do SO, etc.)
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    dispatchAction(action, cbRef.current);
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

  // ─── Registra listeners no window E no document (ambos) ───────────────────
  // Alguns dispositivos BT / browsers só disparam em um deles
  useEffect(() => {
    const opts = { capture: true, passive: false } as AddEventListenerOptions;

    window.addEventListener('keydown', handleKeyDown, opts);
    window.addEventListener('keyup', handleKeyUp, opts);
    document.addEventListener('keydown', handleKeyDown, opts);
    document.addEventListener('keyup', handleKeyUp, opts);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, opts);
      window.removeEventListener('keyup', handleKeyUp, opts);
      document.removeEventListener('keydown', handleKeyDown, opts);
      document.removeEventListener('keyup', handleKeyUp, opts);
    };
  }, [handleKeyDown, handleKeyUp]);

  // ─── Garante foco no container quando o teleprompter abre ─────────────────
  // Sem foco, eventos de teclado de dispositivos BT podem não ser entregues
  useEffect(() => {
    if (!active) return;
    const el = containerRef?.current;
    if (el) {
      // Foco com delay pequeno para aguardar a animação de abertura
      const tid = setTimeout(() => el.focus({ preventScroll: true }), 150);
      return () => clearTimeout(tid);
    }
  }, [active, containerRef]);

  // ─── Gamepad API como fallback para controles Bluetooth ───────────────────
  // Alguns controles se registram como gamepads em vez de teclados
  useEffect(() => {
    if (!active) return;

    let rafId: number;
    const pollGamepad = () => {
      if (!activeRef.current) return;
      const gamepads = navigator.getGamepads?.() ?? [];
      for (const gp of gamepads) {
        if (!gp) continue;
        // Botão 0 = A/Cross = play/pause
        if (gp.buttons[0]?.pressed) {
          cbRef.current.onTogglePlayPause?.();
          cbRef.current.onKeyDebug?.({
            key: 'Gamepad:Button0',
            code: 'Gamepad:Button0',
            keyCode: 0,
            type: 'keydown',
            action: 'togglePlayPause',
            timestamp: Date.now(),
            source: 'gamepad',
          });
        }
        // DPad up = scroll up
        if (gp.axes[1] < -0.5) cbRef.current.onScrollUp?.();
        // DPad down = scroll down
        if (gp.axes[1] > 0.5) cbRef.current.onScrollDown?.();
      }
      rafId = requestAnimationFrame(pollGamepad);
    };

    rafId = requestAnimationFrame(pollGamepad);
    return () => cancelAnimationFrame(rafId);
  }, [active]);
}
