import { useEffect, useCallback, useRef } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// SOBRE CONTROLES BLUETOOTH EM MOBILE (Android/iOS)
// ─────────────────────────────────────────────────────────────────────────────
// Muitos controles Bluetooth (como Ulanzi) atuam de duas formas no celular:
// 1. HID Keyboard: enviam teclas como ArrowUp, PageDown, etc.
// 2. Gamepad: se conectam como um controle de jogo (joystick).
//
// O Android/iOS muitas vezes INTERCEPTA teclas de volume e mídia, impedindo
// que cheguem ao navegador como eventos de teclado.
// Por isso, combinamos Keyboard Events + Gamepad API para garantir que
// qualquer clique chegue ao app, independentemente do modo do controle.
// ─────────────────────────────────────────────────────────────────────────────

export const KEY_MAP = {
  actionBackward: [
    'ArrowUp',
    'ArrowLeft',
    'PageUp',
    // Fallbacks para Desktop:
    'AudioVolumeUp',
    'VolumeUp',
    'MediaTrackPrevious'
  ],
  actionForward: [
    'ArrowDown',
    'ArrowRight',
    'PageDown',
    // Fallbacks para Desktop:
    'AudioVolumeDown',
    'VolumeDown',
    'MediaTrackNext'
  ],
  togglePlayPause: [
    'Enter',
    ' ',               // Space
    'MediaPlayPause',
    'MediaPlay',
    'F5',
    'F8',
    'AudioPlay',
  ],
} as const;

export const KEYCODE_MAP: Record<number, keyof typeof KEY_MAP> = {
  38: 'actionBackward', // ArrowUp
  37: 'actionBackward', // ArrowLeft
  33: 'actionBackward', // PageUp
  175: 'actionBackward', // VolumeUp
  40: 'actionForward',  // ArrowDown
  39: 'actionForward',  // ArrowRight
  34: 'actionForward',  // PageDown
  174: 'actionForward', // VolumeDown
  13: 'togglePlayPause',// Enter
  32: 'togglePlayPause',// Space
  179: 'togglePlayPause',// MediaPlayPause
};

export type TeleprompterAction = keyof typeof KEY_MAP;

export interface UseTeleprompterKeysOptions {
  active: boolean;
  onActionBackward?: () => void;
  onActionForward?: () => void;
  onTogglePlayPause?: () => void;
  onKeyDebug?: (info: KeyDebugInfo) => void;
  containerRef?: React.RefObject<HTMLElement | null>;
}

export interface KeyDebugInfo {
  key: string;
  code: string;
  keyCode: number | string; // string for gamepad buttons
  type: 'keydown' | 'keyup' | 'gamepad';
  action: TeleprompterAction | null;
  timestamp: number;
  source: 'key' | 'keycode' | 'gamepad';
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

export function useTeleprompterKeys(options: UseTeleprompterKeysOptions) {
  const {
    active,
    onActionBackward,
    onActionForward,
    onTogglePlayPause,
    onKeyDebug,
    containerRef,
  } = options;

  const cbRef = useRef({
    onActionBackward,
    onActionForward,
    onTogglePlayPause,
    onKeyDebug,
  });

  const activeRef = useRef(active);

  useEffect(() => {
    cbRef.current = { onActionBackward, onActionForward, onTogglePlayPause, onKeyDebug };
  }, [onActionBackward, onActionForward, onTogglePlayPause, onKeyDebug]);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  const triggerAction = useCallback((action: TeleprompterAction) => {
    switch (action) {
      case 'actionBackward':   cbRef.current.onActionBackward?.();   break;
      case 'actionForward':    cbRef.current.onActionForward?.();    break;
      case 'togglePlayPause':  cbRef.current.onTogglePlayPause?.();  break;
    }
  }, []);

  // ─── 1. Keyboard API ────────────────────────────────────────────────────────
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!activeRef.current) return;
    if (isTypingTarget(e.target)) return;

    let action = resolveActionByKey(e.key);
    let source: KeyDebugInfo['source'] = 'key';

    if (!action && e.keyCode) {
      action = KEYCODE_MAP[e.keyCode] ?? null;
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

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    triggerAction(action);
  }, [triggerAction]);

  useEffect(() => {
    const opts = { capture: true, passive: false } as AddEventListenerOptions;
    window.addEventListener('keydown', handleKeyDown, opts);
    document.addEventListener('keydown', handleKeyDown, opts);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, opts);
      document.removeEventListener('keydown', handleKeyDown, opts);
    };
  }, [handleKeyDown]);

  // Foco inicial garantido
  useEffect(() => {
    if (!active) return;
    const el = containerRef?.current;
    if (el) {
      const tid = setTimeout(() => el.focus({ preventScroll: true }), 200);
      return () => clearTimeout(tid);
    }
  }, [active, containerRef]);

  // ─── 2. Gamepad API (Fallback Poderoso) ─────────────────────────────────────
  useEffect(() => {
    if (!active) return;
    let animationFrameId: number;
    // Armazena o estado anterior de cada botão para disparar apenas no momento do "press"
    const prevButtonStates = new Map<string, boolean | string>();

    const pollGamepads = () => {
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      for (const gp of gamepads) {
        if (!gp) continue;
        
        gp.buttons.forEach((btn, index) => {
          const isPressed = btn.pressed;
          const key = `${gp.index}-${index}`;
          const wasPressed = prevButtonStates.get(key) || false;

          if (isPressed && !wasPressed) {
            // Um botão foi pressionado!
            let action: TeleprompterAction | null = null;
            
            // Mapeamento genérico de botões de Gamepad
            // 0, 1, 2, 3 = A, B, X, Y
            // 12 = UP, 13 = DOWN, 14 = LEFT, 15 = RIGHT
            // 4, 5 = L1, R1
            // 9 = Start
            if ([12, 14, 4].includes(index)) action = 'actionBackward'; // Up, Left, L1
            if ([13, 15, 5].includes(index)) action = 'actionForward';  // Down, Right, R1
            if ([0, 1, 2, 3, 9].includes(index)) action = 'togglePlayPause'; // A,B,X,Y,Start

            cbRef.current.onKeyDebug?.({
              key: `Botão ${index}`,
              code: `Gamepad ${gp.index}`,
              keyCode: index,
              type: 'gamepad',
              action,
              timestamp: Date.now(),
              source: 'gamepad',
            });

            if (action) {
              triggerAction(action);
            }
          }
          prevButtonStates.set(key, isPressed);
        });

        // Eixos (Analógico)
        gp.axes.forEach((axisValue, index) => {
          const isPushed = Math.abs(axisValue) > 0.5;
          const direction = axisValue < -0.5 ? 'neg' : (axisValue > 0.5 ? 'pos' : 'center');
          const key = `axis-${gp.index}-${index}`;
          const prevDir = prevButtonStates.get(key) || 'center';

          if (isPushed && prevDir === 'center') {
            let action: TeleprompterAction | null = null;
            // Axis 0 = Esquerda/Direita, Axis 1 = Cima/Baixo
            if (index === 0) {
              action = direction === 'neg' ? 'actionBackward' : 'actionForward';
            } else if (index === 1) {
              action = direction === 'neg' ? 'actionBackward' : 'actionForward';
            }

            if (action) {
              cbRef.current.onKeyDebug?.({
                key: `Eixo ${index} ${direction}`,
                code: `Gamepad ${gp.index}`,
                keyCode: `axis${index}`,
                type: 'gamepad',
                action,
                timestamp: Date.now(),
                source: 'gamepad',
              });
              triggerAction(action);
            }
          }
          prevButtonStates.set(key, isPushed ? direction : 'center');
        });
      }
      animationFrameId = requestAnimationFrame(pollGamepads);
    };

    animationFrameId = requestAnimationFrame(pollGamepads);
    return () => cancelAnimationFrame(animationFrameId);
  }, [active, triggerAction]);
}
