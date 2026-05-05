import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  X, Play, Pause, RotateCcw, Plus, Minus, 
  Maximize2, Minimize2, FlipHorizontal, Eye, EyeOff, Smartphone
} from 'lucide-react';
import type { TeleprompterSettings } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';

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
  
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>(0);
  const lastTimeRef = useRef<number | null>(null);

  // Animation Loop
  const animate = useCallback((time: number) => {
    if (lastTimeRef.current !== null && isPlaying) {
      const deltaTime = time - lastTimeRef.current;
      // Normalizando a velocidade: 1x = ~50 pixels por segundo
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

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch(e.code) {
        case 'Space':
          e.preventDefault();
          setIsPlaying(p => !p);
          break;
        case 'ArrowUp':
          e.preventDefault();
          updateSettings({ speed: Math.min(10, settings.speed + 0.5) });
          break;
        case 'ArrowDown':
          e.preventDefault();
          updateSettings({ speed: Math.max(0.1, settings.speed - 0.5) });
          break;
        case 'KeyR':
          setScrollPos(0);
          setIsPlaying(false);
          break;
        case 'KeyF':
          toggleFullscreen();
          break;
        case 'KeyM':
          updateSettings({ isMirrored: !settings.isMirrored });
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [settings, updateSettings]);

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
        // Tentar travar na horizontal se possível (ex: Android Chrome)
        if (screen.orientation && (screen.orientation as any).lock) {
          try {
            await (screen.orientation as any).lock('landscape');
          } catch (e) {
            console.log('Orientation lock not supported');
          }
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
          setIsFullscreen(false);
          if (screen.orientation && (screen.orientation as any).unlock) {
            screen.orientation.unlock();
          }
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

  // Touch Support for Manual Scrolling
  const touchStartY = useRef<number | null>(null);
  const initialScrollPos = useRef<number>(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    initialScrollPos.current = scrollPos;
    setIsPlaying(false); // Pausa ao tocar para permitir ajuste manual
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const touchY = e.touches[0].clientY;
    const deltaY = touchStartY.current - touchY;
    // Sensibilidade do scroll: 1.5x para ser mais responsivo ao toque
    setScrollPos(Math.max(0, initialScrollPos.current + deltaY * 1.5));
  };

  const handleTouchEnd = () => {
    touchStartY.current = null;
  };

  const handleToggleRotation = () => {
    setIsRotatedCSS(!isRotatedCSS);
    if (!isRotatedCSS) setIsPortrait(false); // Hide portrait warning if user forces rotation
  };

  return (
    <div 
      className={`fixed z-50 flex flex-col select-none overflow-hidden ${!isRotatedCSS ? 'inset-0' : ''}`}
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
        ref={containerRef}
        className="flex-1 flex flex-col items-center overflow-hidden cursor-pointer touch-none"
        onClick={() => {
          // Só alterna o play se não estiver arrastando
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
          className="whitespace-pre-wrap font-sans transition-all duration-300"
        >
          {text}
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
                onClick={() => updateSettings({ speed: Math.max(0.1, settings.speed - 0.2) })}
                className="p-2 sm:p-3 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-white"
              >
                <Minus size={18} />
              </button>

              <button 
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-12 h-12 sm:w-14 sm:h-14 bg-dbe-blue hover:bg-blue-600 rounded-full flex items-center justify-center text-white transition-all active:scale-90 shadow-lg shadow-dbe-blue/40"
              >
                {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
              </button>

              <button 
                onClick={() => updateSettings({ speed: Math.min(10, settings.speed + 0.2) })}
                className="p-2 sm:p-3 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-white"
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
              {settings.speed.toFixed(1)}x | {settings.fontSize}px
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
