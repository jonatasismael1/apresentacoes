import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  X, Play, Pause, RotateCcw, Plus, Minus, 
  Maximize2, Minimize2, FlipHorizontal, Eye, EyeOff, Smartphone
} from 'lucide-react';
import type { TeleprompterSettings } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';
import { useTeleprompterKeys } from '../../hooks/useTeleprompterKeys';

interface Props {
  text: string;
  settings: TeleprompterSettings;
  onExit: () => void;
  updateSettings: (settings: Partial<TeleprompterSettings>) => void;
}

const TeleprompterReader: React.FC<Props> = ({ text, settings, onExit, updateSettings }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [scrollPos, setScrollPos] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isRotatedCSS, setIsRotatedCSS] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [maxScroll, setMaxScroll] = useState(1);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>(0);
  const lastTimeRef = useRef<number | null>(null);
  const countdownRef = useRef<number | null>(null);
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const estimatedMinutes = Math.max(1, Math.ceil(wordCount / Math.max(90, 150 * Math.max(settings.speed, 0.5))));
  const progress = Math.min(100, Math.max(0, (scrollPos / maxScroll) * 100));

  useEffect(() => {
    const updateMaxScroll = () => {
      const contentHeight = scrollRef.current?.scrollHeight || 1;
      setMaxScroll(Math.max(1, contentHeight - window.innerHeight));
    };
    updateMaxScroll();
    window.addEventListener('resize', updateMaxScroll);
    return () => window.removeEventListener('resize', updateMaxScroll);
  }, [text, settings.width, settings.fontSize, settings.lineHeight]);

  useEffect(() => {
    const animate = (time: number) => {
      if (lastTimeRef.current !== null && isPlaying) {
        const deltaTime = time - lastTimeRef.current;
        const pixelsPerMs = (settings.speed * 50) / 1000;
        setScrollPos(prev => prev + pixelsPerMs * deltaTime);
      }
      lastTimeRef.current = time;
      requestRef.current = requestAnimationFrame(animate);
    };

    lastTimeRef.current = null;
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, [isPlaying, settings.speed]);

  // Ref estável para o estado de reprodução (evita recriar callbacks)
  const isPlayingRef = useRef(isPlaying);
  const settingsRef = useRef(settings);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // ─── Handlers para o controle Bluetooth ─────────────────────────────────────
  // Ação de RECUA (Seta pra cima, Esquerda, Volume +, etc)
  //   PAUSADO  → sobe o texto (recua)
  //   PLAYING  → diminui velocidade

  // ← (ArrowLeft) → comportamento depende do estado:
  //   PAUSADO  → sobe o texto (recua)
  //   PLAYING  → diminui velocidade
  const handleLeft = useCallback(() => {
    if (isPlayingRef.current) {
      // Diminui velocidade
      updateSettings({ speed: Math.max(0.1, settingsRef.current.speed - 0.5) });
    } else {
      // Sobe o texto (volta)
      setScrollPos(prev => Math.max(0, prev - 150));
    }
  }, [updateSettings]);

  // → (ArrowRight) → comportamento depende do estado:
  //   PAUSADO  → desce o texto (avança)
  //   PLAYING  → aumenta velocidade
  const handleRight = useCallback(() => {
    if (isPlayingRef.current) {
      // Aumenta velocidade
      updateSettings({ speed: Math.min(10, settingsRef.current.speed + 0.5) });
    } else {
      // Desce o texto (avança)
      setScrollPos(prev => prev + 150);
    }
  }, [updateSettings]);

  // Enter / Space / MediaPlayPause → play/pause
  const cancelCountdown = useCallback(() => {
    if (countdownRef.current !== null) {
      window.clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    setCountdown(null);
  }, []);

  const handleTogglePlay = useCallback(() => {
    if (countdown !== null) {
      cancelCountdown();
      return;
    }

    if (isPlayingRef.current) {
      setIsPlaying(false);
      return;
    }

    setCountdown(3);
    countdownRef.current = window.setInterval(() => {
      setCountdown(prev => {
        if (prev === null) return null;
        if (prev <= 1) {
          if (countdownRef.current !== null) {
            window.clearInterval(countdownRef.current);
            countdownRef.current = null;
          }
          setIsPlaying(true);
          return null;
        }
        return prev - 1;
      });
    }, 700);
  }, [cancelCountdown, countdown]);

  useEffect(() => () => cancelCountdown(), [cancelCountdown]);

  // Integra o hook de teclas — controle Bluetooth em modo HID
  // NOTA: ↑/↓ físicos do Ulanzi enviam VolumeUp/Down (SO intercepta no mobile).
  // Por isso mapeamos ←/→ contextualmente: pausado=scroll, rodando=velocidade.
  useTeleprompterKeys({
    active: true,
    containerRef,
    onActionBackward:  handleLeft,
    onActionForward:   handleRight,
    onTogglePlayPause: handleTogglePlay,
  });

  // ─── Fullscreen ──────────────────────────────────────────────────────────────
  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
        const orientation = screen.orientation as ScreenOrientation & {
          lock?: (orientation: OrientationLockType) => Promise<void>;
        };
        if (orientation.lock) {
          try { await orientation.lock('landscape'); } catch {
            // Some mobile browsers expose the API but block locking.
          }
        }
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
        if (screen.orientation && screen.orientation.unlock) {
          screen.orientation.unlock();
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleReset = () => {
    setScrollPos(0);
    setIsPlaying(false);
  };

  const handleToggleRotation = () => {
    setIsRotatedCSS(!isRotatedCSS);
  };

  // ─── Touch: scroll manual ───────────────────────────────────────────────────
  const touchStartY = useRef<number | null>(null);
  const initialScrollPos = useRef<number>(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    initialScrollPos.current = scrollPos;
    setIsPlaying(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const deltaY = touchStartY.current - e.touches[0].clientY;
    setScrollPos(Math.max(0, initialScrollPos.current + deltaY * 1.5));
  };

  const handleTouchEnd = () => {
    touchStartY.current = null;
  };

  return (
    <div 
      ref={containerRef}
      tabIndex={-1}
      className={`fixed z-50 flex flex-col select-none overflow-hidden outline-none ${!isRotatedCSS ? 'inset-0' : ''}`}
      style={{ 
        backgroundColor: settings.bgColor, 
        color: settings.textColor,
        ...(isRotatedCSS ? {
          width: '100vh',
          height: '100vw',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%) rotate(90deg)'
        } : {})
      }}
    >
      <div className="absolute top-0 left-0 right-0 h-1 bg-zinc-900 z-20">
        <div className="h-full bg-dbe-blue transition-all" style={{ width: `${progress}%` }} />
      </div>

      <div className="absolute top-4 left-4 z-20 flex gap-2 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
        <span className="px-3 py-1 rounded-full bg-zinc-900/70 border border-zinc-800 backdrop-blur">
          {estimatedMinutes} min estimado
        </span>
        <span className="px-3 py-1 rounded-full bg-zinc-900/70 border border-zinc-800 backdrop-blur">
          {Math.round(progress)}%
        </span>
      </div>

      {countdown !== null && (
        <div className="absolute inset-0 z-40 bg-black/65 backdrop-blur-sm flex items-center justify-center">
          <div className="text-8xl font-black text-white tabular-nums">{countdown}</div>
        </div>
      )}

      {/* Guia de Leitura Central */}
      <div className="absolute top-1/2 left-0 w-full h-1 bg-dbe-blue/30 -translate-y-1/2 z-10 pointer-events-none" />
      <div className="absolute top-1/2 left-2 -translate-y-1/2 z-10 pointer-events-none">
        <div className="w-0 h-0 border-t-[10px] border-t-transparent border-b-[10px] border-b-transparent border-l-[15px] border-l-dbe-blue" />
      </div>

      {/* Área do Texto */}
      <div 
        className="flex-1 flex flex-col items-center overflow-hidden cursor-pointer touch-none"
        onClick={() => {
          if (touchStartY.current === null) {
            handleTogglePlay();
          }
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div 
          ref={scrollRef}
          style={{ 
            width: `${settings.width}%`,
            fontSize: `${settings.fontSize}px`,
            lineHeight: settings.lineHeight,
            transform: `translateY(${-scrollPos}px) ${settings.isMirrored ? 'scaleX(-1)' : ''}`,
            paddingTop: '50vh',
            paddingBottom: '50vh',
            textAlign: 'center',
            fontWeight: 600,
            transition: isPlaying ? 'none' : 'transform 0.1s ease-out'
          }}
          className="whitespace-pre-wrap font-sans"
        >
          {text}
          
          <div className="mt-32 pb-[50vh] flex justify-center w-full">
            <button 
              onClick={onExit}
              className="px-8 py-4 bg-zinc-900 border border-zinc-800 text-zinc-500 rounded-full text-sm font-bold uppercase tracking-widest hover:bg-zinc-800 hover:text-white transition-all shadow-xl shadow-black/50"
            >
              Fim — Voltar ao Menu
            </button>
          </div>
        </div>
      </div>


      {/* Controles Flutuantes */}
      <AnimatePresence>
        {showControls && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 z-20 w-auto max-w-[95vw]"
          >
            <div className="flex flex-wrap justify-center items-center gap-1.5 sm:gap-3 bg-zinc-900/95 backdrop-blur-xl p-2 sm:p-2 rounded-2xl border border-zinc-800 shadow-2xl">
              <button 
                onClick={handleReset}
                className="p-2 sm:p-3 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-white"
                title="Reiniciar (R)"
              >
                <RotateCcw size={18} />
              </button>

              <div className="w-[1px] h-6 sm:h-8 bg-zinc-800 mx-0.5" />

              <button 
                onClick={handleLeft}
                className="p-2 sm:p-3 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-white"
                title="Voltar / Diminuir velocidade (←)"
              >
                <Minus size={18} />
              </button>

              <button 
                onClick={handleTogglePlay}
                className="w-12 h-12 sm:w-14 sm:h-14 bg-dbe-blue hover:bg-blue-600 rounded-full flex items-center justify-center text-white transition-all active:scale-90 shadow-lg shadow-dbe-blue/40"
              >
                {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
              </button>

              <button 
                onClick={handleRight}
                className="p-2 sm:p-3 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-white"
                title="Avançar / Aumentar velocidade (→)"
              >
                <Plus size={18} />
              </button>

              <div className="w-[1px] h-6 sm:h-8 bg-zinc-800 mx-0.5" />


              <button 
                onClick={() => updateSettings({ isMirrored: !settings.isMirrored })}
                className={`p-2 sm:p-3 rounded-full transition-colors ${settings.isMirrored ? 'text-dbe-blue bg-dbe-blue/10' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
                title="Espelhar (M)"
              >
                <FlipHorizontal size={18} />
              </button>

              <button 
                onClick={toggleFullscreen}
                className="p-2 sm:p-3 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-white"
                title="Tela Cheia (F)"
              >
                {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
              </button>

              <button 
                onClick={handleToggleRotation}
                className={`p-2 sm:p-3 rounded-full transition-colors ${isRotatedCSS ? 'text-dbe-blue bg-dbe-blue/10' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
                title="Girar Tela (Fallback)"
              >
                <Smartphone size={18} className={isRotatedCSS ? 'rotate-90' : ''} />
              </button>


              <button 
                onClick={onExit}
                className="p-2 sm:p-3 hover:bg-red-500/20 hover:text-red-500 rounded-full transition-colors text-zinc-400"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-3 py-1 bg-black/60 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-zinc-400 border border-zinc-800 backdrop-blur-sm">
              {settings.speed.toFixed(1)}x | {settings.fontSize}px | {estimatedMinutes} min
              {isPlaying && <span className="ml-2 text-amber-400 animate-pulse">● REPRODUZINDO</span>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Botão de Visibilidade dos Controles */}
      <button 
        onClick={() => setShowControls(!showControls)}
        className="absolute bottom-4 right-4 sm:bottom-8 sm:right-8 p-4 bg-zinc-900/50 rounded-full text-zinc-500 hover:text-white transition-all z-20 backdrop-blur-md"
      >
        {showControls ? <EyeOff size={24} /> : <Eye size={24} />}
      </button>
    </div>
  );
};

export default TeleprompterReader;
