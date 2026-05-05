import { useEffect, useCallback, useRef } from 'react';

// ─── Mapeamento de teclas ───────────────────────────────────────────────────
// Altere este objeto para remapear qualquer ação sem mexer na lógica principal.
export const KEY_MAP = {
  scrollUp:        ['ArrowUp'],
  scrollDown:      ['ArrowDown'],
  speedDecrease:   ['ArrowLeft'],
  speedIncrease:   ['ArrowRight'],
  // Botão superior do Ulanzi – adicione aqui outras teclas candidatas
  // se o debug mostrar algo diferente de Enter/Space/MediaPlayPause.
  togglePlayPause: ['Enter', ' ', 'MediaPlayPause', 'MediaPlay', 'MediaStop'],
} as const;

export type TeleprompterAction = keyof typeof KEY_MAP;

export interface UseTeleprompterKeysOptions {
  /** O teleprompter está visível/ativo? Atalhos só atuam quando true. */
  active: boolean;
  onScrollUp?: () => void;
  onScrollDown?: () => void;
  onSpeedDecrease?: () => void;
  onSpeedIncrease?: () => void;
  onTogglePlayPause?: () => void;
  /** Callback chamado para todo keydown enquanto o teleprompter está ativo.
   *  Útil para o painel de debug. */
  onKeyDebug?: (info: KeyDebugInfo) => void;
}

export interface KeyDebugInfo {
  key: string;
  code: string;
  keyCode: number;
  type: 'keydown' | 'keyup';
  action: TeleprompterAction | null;
  timestamp: number;
}

/** Retorna true se o foco estiver em campo de digitação que deve ser ignorado. */
function isTypingTarget(el: EventTarget | null): boolean {
  if (!el || !(el instanceof HTMLElement)) return false;
  const tag = el.tagName.toLowerCase();
  if (['input', 'textarea', 'select'].includes(tag)) return true;
  if (el.isContentEditable) return true;
  return false;
}

/** Resolve qual ação (se houver) corresponde à tecla pressionada. */
function resolveAction(key: string): TeleprompterAction | null {
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
    onScrollUp,
    onScrollDown,
    onSpeedDecrease,
    onSpeedIncrease,
    onTogglePlayPause,
    onKeyDebug,
  } = options;

  // Refs para manter callbacks sempre atualizados sem re-registrar listeners
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

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!active) return;
    if (isTypingTarget(e.target)) return;

    const action = resolveAction(e.key);

    // Dispara debug para toda tecla enquanto ativo
    cbRef.current.onKeyDebug?.({
      key: e.key,
      code: e.code,
      keyCode: e.keyCode,
      type: 'keydown',
      action,
      timestamp: Date.now(),
    });

    if (!action) return;

    // Previne comportamentos padrão do navegador (scroll da página, etc.)
    e.preventDefault();
    e.stopPropagation();

    switch (action) {
      case 'scrollUp':        cbRef.current.onScrollUp?.();        break;
      case 'scrollDown':      cbRef.current.onScrollDown?.();      break;
      case 'speedDecrease':   cbRef.current.onSpeedDecrease?.();   break;
      case 'speedIncrease':   cbRef.current.onSpeedIncrease?.();   break;
      case 'togglePlayPause': cbRef.current.onTogglePlayPause?.(); break;
    }
  }, [active]);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (!active) return;
    if (isTypingTarget(e.target)) return;

    const action = resolveAction(e.key);

    cbRef.current.onKeyDebug?.({
      key: e.key,
      code: e.code,
      keyCode: e.keyCode,
      type: 'keyup',
      action,
      timestamp: Date.now(),
    });
  }, [active]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    window.addEventListener('keyup', handleKeyUp, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      window.removeEventListener('keyup', handleKeyUp, { capture: true });
    };
  }, [handleKeyDown, handleKeyUp]);
}
