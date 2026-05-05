import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  X, Play, Pause, RotateCcw, Plus, Minus, 
  Maximize2, Minimize2, FlipHorizontal, Eye, EyeOff, Smartphone, Bug
} from 'lucide-react';
import type { TeleprompterSettings } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';
import { useTeleprompterKeys, type KeyDebugInfo } from '../../hooks/useTeleprompterKeys';

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
  const [showDebug, setShowDebug] = useState(false);
  const [debugLog, setDebugLog] = useState<KeyDebugInfo[]>([]);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>(0);
  const lastTimeRef = useRef<number | null>(null);

  // ─── Animation Loop ─────────────────────────────────────────────────────────
  const animate = useCallback((time: number) => {
    if (lastTimeRef.current !== null && isPlaying) {
      const deltaTime = time - lastTimeRef.current;
      const pixelsPerMs = (settings.speed * 50) / 1000;
      setScrollPos(prev => prev + pixelsPerMs * deltaTime);
    }
    lastTimeRef.current = time;
    requestRef.current = requestAnimationFrame(animate);
  }, [isPlaying, settings.speed]);

  useEffect(() => {
    lastTimeRef.current = null;
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, [animate, isPlaying]);

  // ─── Handlers para o controle Bluetooth ─────────────────────────────────────
  // ArrowUp / PageUp → sobe o texto (recua o scrollPos)
  const handleScrollUp = useCallback(() => {
    setScrollPos(prev => Math.max(0, prev - 120));
  }, []);

  // ArrowDown / PageDown → desce o texto (avança o scrollPos)
  const handleScrollDown = useCallback(() => {
    setScrollPos(prev => prev + 120);
  }, []);

  // ArrowLeft → diminui velocidade
  const handleSpeedDec = useCallback(() => {
    updateSettings({ speed: Math.max(0.1, settings.speed - 0.5) });
  }, [settings.speed, updateSettings]);

  // ArrowRight → aumenta velocidade
  const handleSpeedInc = useCallback(() => {
    updateSettings({ speed: Math.min(10, settings.speed + 0.5) });
  }, [settings.speed, updateSettings]);

  // Enter / Space / MediaPlayPause → play/pause
  const handleTogglePlay = useCallback(() => {
    setIsPlaying(p => !p);
  }, []);

  // Debug
  const handleKeyDebug = useCallback((info: KeyDebugInfo) => {
    setDebugLog(prev => [info, ...prev].slice(0, 10));
  }, []);

  // Integra o hook de teclas — funciona para controle Bluetooth em modo HID
  useTeleprompterKeys({
    active: true, // sempre ativo enquanto TeleprompterReader está montado
    containerRef,
    onScrollUp:        handleScrollUp,
    onScrollDown:      handleScrollDown,
    onSpeedDecrease:   handleSpeedDec,
    onSpeedIncrease:   handleSpeedInc,
    onTogglePlayPause: handleTogglePlay,
    onKeyDebug:        handleKeyDebug,
  });

  // ─── Fullscreen ──────────────────────────────────────────────────────────────
  const [isPortrait, setIsPortrait] = useState(window.innerHeight > window.innerWidth);

  useEffect(() => {
    const handleResize = () => setIsPortrait(window.innerHeight > window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
        if (screen.orientation && (screen.orientation as any).lock) {
          try { await (screen.orientation as any).lock('landscape'); } catch {}
        }
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
        if (screen.orientation && (screen.orientation as any).unlock) {
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
    if (!isRotatedCSS) setIsPortrait(false);
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
      {/* Aviso de Orientação */}
      <AnimatePresence>
        {isPortrait && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-8 text-center"
          >
            <motion.div 
              animate={{ rotate: 90 }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            >
              <Maximize2 size={64} className="text-dbe-blue mb-8" />
            </motion.div>
            <h2 className="text-2xl font-bold mb-4">Gire seu celular</h2>
            <p className="text-zinc-400">O teleprompter funciona melhor em modo paisagem (horizontal).</p>
            <button 
              onClick={() => setIsPortrait(false)}
              className="mt-8 text-xs uppercase font-bold tracking-widest text-zinc-500 hover:text-white"
            >
              Ignorar e continuar assim
            </button>
          </motion.div>
        )}
      </AnimatePresence>

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
            setIsPlaying(!isPlaying);
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
        </div>
      </div>

      {/* ── Painel de Debug Bluetooth ── */}
      <AnimatePresence>
        {showDebug && (
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="absolute top-0 right-0 bottom-0 w-64 bg-black/95 border-l border-zinc-800 z-30 flex flex-col"
          >
            <div className="px-4 py-3 border-b border-zinc-800">
              <p className="text-xs font-bold text-violet-400 uppercase tracking-widest">
                🎮 Debug — Bluetooth HID
              </p>
              <p className="text-[10px] text-zinc-500 mt-1">
                Pressione botões do controle
              </p>
              <div className="mt-2 text-[9px] text-amber-400/80 bg-amber-950/40 border border-amber-800/40 rounded px-2 py-1.5 leading-relaxed">
                ⚠️ <strong>Mobile:</strong> Volume e Media keys são interceptadas pelo SO. Use setas (↑↓←→) ou Page Up/Down.
              </div>
            </div>

            {/* Última tecla */}
            {debugLog[0] ? (
              <div className="px-4 py-3 border-b border-zinc-800 bg-violet-950/30">
                <p className="text-[9px] text-zinc-500 uppercase tracking-wider mb-2">Última tecla recebida</p>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-[10px] text-zinc-400">event.key</span>
                    <span className="text-[10px] font-mono font-bold text-violet-300">
                      {debugLog[0].key === ' ' ? 'Space' : debugLog[0].key}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[10px] text-zinc-400">event.code</span>
                    <span className="text-[10px] font-mono font-bold text-blue-300">{debugLog[0].code}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[10px] text-zinc-400">event.keyCode</span>
                    <span className="text-[10px] font-mono font-bold text-green-300">{debugLog[0].keyCode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[10px] text-zinc-400">tipo</span>
                    <span className={`text-[10px] font-mono font-bold ${
                      debugLog[0].type === 'keydown' ? 'text-amber-300' : 'text-zinc-500'
                    }`}>{debugLog[0].type}</span>
                  </div>
                  {debugLog[0].action && (
                    <div className="flex justify-between pt-1 border-t border-zinc-800 mt-1">
                      <span className="text-[10px] text-zinc-400">ação</span>
                      <span className="text-[10px] font-mono font-bold text-emerald-400">{debugLog[0].action}</span>
                    </div>
                  )}
                  {!debugLog[0].action && (
                    <div className="flex justify-between pt-1 border-t border-zinc-800 mt-1">
                      <span className="text-[10px] text-zinc-400">ação</span>
                      <span className="text-[10px] font-mono text-red-400">não mapeada</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="px-4 py-6 text-center text-zinc-600 text-xs">
                Aguardando tecla...
              </div>
            )}

            {/* Histórico */}
            <div className="flex-1 overflow-y-auto px-4 py-2">
              <p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-2">Histórico</p>
              {debugLog.slice(1).map((entry, i) => (
                <div key={i} className="py-1 border-b border-zinc-900 flex justify-between items-center">
                  <span className="text-[9px] font-mono text-zinc-500">
                    {entry.key === ' ' ? '"Space"' : `"${entry.key}"`}
                  </span>
                  <span className={`text-[9px] font-mono ${
                    entry.action ? 'text-emerald-600' : 'text-red-700'
                  }`}>
                    {entry.action ?? 'sem ação'}
                  </span>
                </div>
              ))}
            </div>

            {/* Mapa de teclas ativas */}
            <div className="px-4 py-3 border-t border-zinc-800">
              <p className="text-[9px] text-zinc-500 uppercase tracking-wider mb-2">Mapeamento</p>
              <div className="space-y-1">
                {[
                  { label: '↑ Subir',      keys: 'ArrowUp / PageUp' },
                  { label: '↓ Descer',     keys: 'ArrowDown / PageDown' },
                  { label: '← Vel-',       keys: 'ArrowLeft' },
                  { label: '→ Vel+',       keys: 'ArrowRight' },
                  { label: '⏯ Play/Pause', keys: 'Enter / Space' },
                ].map(m => (
                  <div key={m.label} className="flex justify-between">
                    <span className="text-[9px] text-zinc-400">{m.label}</span>
                    <span className="text-[9px] font-mono text-violet-400">{m.keys}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
                onClick={handleSpeedDec}
                className="p-2 sm:p-3 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-white"
                title="Diminuir velocidade (←)"
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
                onClick={handleSpeedInc}
                className="p-2 sm:p-3 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-white"
                title="Aumentar velocidade (→)"
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

              {/* Botão de Debug */}
              <button 
                onClick={() => setShowDebug(d => !d)}
                className={`p-2 sm:p-3 rounded-full transition-colors ${showDebug ? 'text-violet-400 bg-violet-400/10' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
                title="Debug Bluetooth"
              >
                <Bug size={18} />
              </button>

              <button 
                onClick={onExit}
                className="p-2 sm:p-3 hover:bg-red-500/20 hover:text-red-500 rounded-full transition-colors text-zinc-400"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-3 py-1 bg-black/60 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-zinc-400 border border-zinc-800 backdrop-blur-sm">
              {settings.speed.toFixed(1)}x | {settings.fontSize}px
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
