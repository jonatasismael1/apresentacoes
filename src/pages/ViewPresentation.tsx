import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStorage } from '../hooks/useStorage';
import { useToast } from '../components/Toast';
import { ArrowLeft, Download, Printer, Copy, FileCode, Edit2, Monitor, X, Play, Pause, ChevronLeft, ChevronRight, Bug } from 'lucide-react';
import PresentationPreview from '../components/PresentationPreview';
import type { Presentation } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { dbeLogoBase64 } from '../constants/dbeLogo';
import { useTeleprompterKeys, type KeyDebugInfo } from '../hooks/useTeleprompterKeys';

const ViewPresentation: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getPresentation, duplicatePresentation } = useStorage();
  const { showToast } = useToast();
  const [data, setData] = useState<Presentation | null>(null);
  const [showTeleprompter, setShowTeleprompter] = useState(false);

  // ─── Estado do Teleprompter ───────────────────────────────────────────────
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(2); // px por frame (1–10)
  const [showDebug, setShowDebug] = useState(true);
  const [debugLog, setDebugLog] = useState<KeyDebugInfo[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const SPEED_MIN = 1;
  const SPEED_MAX = 10;

  // Scroll automático
  const tick = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop += speed * 0.5;
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [speed]);

  useEffect(() => {
    if (isPlaying) {
      rafRef.current = requestAnimationFrame(tick);
    } else {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    }
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, tick]);

  // Zera o estado ao fechar
  const closeTeleprompter = () => {
    setShowTeleprompter(false);
    setIsPlaying(false);
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
  };

  // Handlers de teclado
  const handleScrollUp   = () => { scrollRef.current && (scrollRef.current.scrollTop -= 80); };
  const handleScrollDown = () => { scrollRef.current && (scrollRef.current.scrollTop += 80); };
  const handleSpeedDec   = () => setSpeed(s => Math.max(SPEED_MIN, s - 1));
  const handleSpeedInc   = () => setSpeed(s => Math.min(SPEED_MAX, s + 1));
  const handleTogglePlay = () => setIsPlaying(p => !p);
  const handleKeyDebug   = (info: KeyDebugInfo) => {
    setDebugLog(prev => [info, ...prev].slice(0, 8));
  };

  useTeleprompterKeys({
    active: showTeleprompter,
    containerRef,
    onScrollUp:        handleScrollUp,
    onScrollDown:      handleScrollDown,
    onSpeedDecrease:   handleSpeedDec,
    onSpeedIncrease:   handleSpeedInc,
    onTogglePlayPause: handleTogglePlay,
    onKeyDebug:        handleKeyDebug,
  });

  useEffect(() => {
    if (id) {
      const p = getPresentation(id);
      if (p) setData(p);
    }
  }, [id, getPresentation]);

  const handlePrint = () => {
    if (!data) return;
    const htmlContent = generateStandaloneHTML(data);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      // Wait for resources if needed, then print
      printWindow.onload = () => {
        printWindow.print();
        // Option to close the window after print, but some browsers block it
        // printWindow.close();
      };
    }
  };

  const handleCopyContent = () => {
    if (!data) return;
    const text = data.scripts.map((s, i) => 
      `ROTEIRO ${i + 1}: ${s.title}\n` +
      `Gancho: ${s.hook}\n` +
      `Desenvolvimento: ${s.development}\n` +
      `CTA: ${s.cta}\n`
    ).join('\n---\n\n');
    
    navigator.clipboard.writeText(text);
    showToast('Conteúdo copiado para a área de transferência', 'success');
  };

  const handleDuplicate = () => {
    if (!id) return;
    const newId = duplicatePresentation(id);
    if (newId) {
      showToast('Apresentação duplicada!', 'success');
      navigate(`/editar/${newId}`);
    }
  };

  const handleDownloadHTML = () => {
    if (!data) return;
    
    const htmlContent = generateStandaloneHTML(data);
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `DBE-Apresentacao-${data.clientName.replace(/\s+/g, '-')}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showToast('Download do HTML iniciado', 'success');
  };

  if (!data) return null;

  const teleprompterText = data.scripts.map(s => 
    `${s.hook} ${s.development} ${s.cta}`
  ).join('\n\n');

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Floating Actions (no-print) */}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-zinc-900/80 backdrop-blur-md p-2 rounded-full border border-zinc-800 shadow-2xl no-print">
        <button onClick={() => navigate(`/editar/${id}`)} className="p-2.5 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-all" title="Voltar a editar">
          <ArrowLeft size={20} />
        </button>
        <div className="w-px h-6 bg-zinc-800 mx-1" />
        <button onClick={() => setShowTeleprompter(true)} className="flex items-center gap-2 px-4 py-2 hover:bg-zinc-800 rounded-full text-sm font-medium text-zinc-300 hover:text-white transition-all">
          <Monitor size={18} />
          <span className="hidden md:inline">Teleprompter</span>
        </button>
        <button onClick={handleDownloadHTML} className="flex items-center gap-2 px-4 py-2 hover:bg-zinc-800 rounded-full text-sm font-medium text-zinc-300 hover:text-white transition-all">
          <Download size={18} />
          <span className="hidden md:inline">Baixar HTML</span>
        </button>
        <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-dbe-blue hover:bg-blue-600 rounded-full text-sm font-medium text-white transition-all">
          <Printer size={18} />
          <span className="hidden md:inline">Imprimir / PDF</span>
        </button>
        <div className="w-px h-6 bg-zinc-800 mx-1" />
        <button onClick={handleCopyContent} className="p-2.5 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-all" title="Copiar texto">
          <Copy size={18} />
        </button>
        <button onClick={handleDuplicate} className="p-2.5 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-all" title="Duplicar">
          <FileCode size={18} />
        </button>
        <button onClick={() => navigate(`/editar/${id}`)} className="p-2.5 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-all" title="Editar">
          <Edit2 size={18} />
        </button>
      </div>

      <PresentationPreview data={data} />

      {/* Teleprompter Modal */}
      <AnimatePresence>
        {showTeleprompter && (
          <motion.div
            ref={containerRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black flex flex-col outline-none"
            tabIndex={-1}
            onKeyDown={(e) => e.stopPropagation()}
          >
            {/* ── Barra superior ── */}
            <div className="flex items-center justify-between px-5 py-3 bg-zinc-950/90 backdrop-blur border-b border-zinc-800 no-print shrink-0">
              <h2 className="text-lg font-black uppercase italic tracking-widest text-dbe-blue truncate">
                Teleprompter — {data.clientName}
              </h2>

              <div className="flex items-center gap-2">
                {/* Velocidade */}
                <div className="flex items-center gap-1 bg-zinc-900 rounded-full px-3 py-1.5 border border-zinc-800">
                  <button
                    id="tp-speed-dec"
                    onClick={handleSpeedDec}
                    className="text-zinc-400 hover:text-white transition-colors p-0.5"
                    title="Diminuir velocidade (←)"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-xs font-bold text-white w-10 text-center">
                    {speed}x
                  </span>
                  <button
                    id="tp-speed-inc"
                    onClick={handleSpeedInc}
                    className="text-zinc-400 hover:text-white transition-colors p-0.5"
                    title="Aumentar velocidade (→)"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>

                {/* Play / Pause */}
                <button
                  id="tp-play-pause"
                  onClick={handleTogglePlay}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${
                    isPlaying
                      ? 'bg-amber-500 hover:bg-amber-600 text-black'
                      : 'bg-dbe-blue hover:bg-blue-500 text-white'
                  }`}
                  title="Play / Pause (Enter · Space · MediaPlayPause)"
                >
                  {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                  {isPlaying ? 'Pausar' : 'Reproduzir'}
                </button>

                {/* Re-focar container (útil se o foco sair) */}
                <button
                  onClick={() => containerRef.current?.focus({ preventScroll: true })}
                  className="p-2 bg-zinc-900 rounded-full text-zinc-500 hover:text-white transition-all border border-zinc-700"
                  title="Re-focar teleprompter (necessário para o controle BT funcionar)"
                >
                  🎯
                </button>

                {/* Debug toggle */}
                <button
                  id="tp-debug-toggle"
                  onClick={() => setShowDebug(d => !d)}
                  className={`p-2 rounded-full transition-all ${
                    showDebug ? 'bg-violet-600 text-white' : 'bg-zinc-900 text-zinc-500 hover:text-white'
                  }`}
                  title="Painel de debug"
                >
                  <Bug size={16} />
                </button>

                {/* Copiar */}
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(teleprompterText);
                    showToast('Texto do teleprompter copiado!', 'success');
                  }}
                  className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-all"
                  title="Copiar texto"
                >
                  <Copy size={16} />
                </button>

                {/* Fechar */}
                <button
                  id="tp-close"
                  onClick={closeTeleprompter}
                  className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-all"
                  title="Fechar"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* ── Corpo principal ── */}
            <div className="flex flex-1 overflow-hidden">
              {/* Texto do teleprompter */}
              <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto px-8 md:px-24 py-12"
                style={{ scrollBehavior: 'auto' }}
              >
                <div className="max-w-3xl mx-auto pb-[60vh]">
                  <pre
                    className="whitespace-pre-wrap font-sans text-3xl md:text-5xl font-medium leading-[1.7] text-white"
                    style={{ textShadow: '0 2px 20px rgba(0,0,0,0.8)' }}
                  >
                    {teleprompterText}
                  </pre>
                </div>
              </div>

              {/* ── Painel de Debug ── */}
              <AnimatePresence>
                {showDebug && (
                  <motion.aside
                    initial={{ x: 320, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 320, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                    className="w-72 shrink-0 bg-zinc-950 border-l border-zinc-800 flex flex-col"
                  >
                    <div className="px-4 py-3 border-b border-zinc-800">
                      <p className="text-xs font-bold text-violet-400 uppercase tracking-widest">
                        🎮 Debug — Bluetooth HID
                      </p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">
                        Pressione qualquer tecla / botão do controle
                      </p>
                      <button
                        onClick={() => containerRef.current?.focus({ preventScroll: true })}
                        className="mt-2 w-full text-[10px] py-1 px-2 bg-violet-900/50 hover:bg-violet-800/60 text-violet-300 rounded border border-violet-700/50 transition-colors"
                      >
                        🎯 Clicar aqui se o controle não responder
                      </button>
                    </div>

                    {/* Última tecla em destaque */}
                    {debugLog[0] ? (
                      <div className="px-4 py-4 border-b border-zinc-800 bg-violet-950/30">
                        <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2">Última tecla</p>
                        <div className="space-y-1.5">
                          <div className="flex justify-between">
                            <span className="text-[11px] text-zinc-400">event.key</span>
                            <span className="text-[11px] font-mono font-bold text-violet-300">
                              {debugLog[0].key === ' ' ? 'Space' : debugLog[0].key}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[11px] text-zinc-400">event.code</span>
                            <span className="text-[11px] font-mono font-bold text-blue-300">{debugLog[0].code}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[11px] text-zinc-400">event.keyCode</span>
                            <span className="text-[11px] font-mono font-bold text-green-300">{debugLog[0].keyCode}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[11px] text-zinc-400">type</span>
                            <span className={`text-[11px] font-mono font-bold ${
                              debugLog[0].type === 'keydown' ? 'text-amber-300' : 'text-zinc-400'
                            }`}>{debugLog[0].type}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[11px] text-zinc-400">fonte</span>
                            <span className={`text-[11px] font-mono font-bold ${
                              debugLog[0].source === 'keycode' ? 'text-orange-300' : 'text-cyan-300'
                            }`}>{debugLog[0].source}</span>
                          </div>
                          {debugLog[0].action && (
                            <div className="flex justify-between">
                              <span className="text-[11px] text-zinc-400">ação</span>
                              <span className="text-[11px] font-mono font-bold text-emerald-400">{debugLog[0].action}</span>
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
                      <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-2">Histórico</p>
                      {debugLog.slice(1).map((entry, i) => (
                        <div key={i} className="py-1.5 border-b border-zinc-900 flex justify-between items-center">
                          <span className="text-[10px] font-mono text-zinc-400">
                            {entry.key === ' ' ? '"Space"' : `"${entry.key}"`}
                          </span>
                          <span className={`text-[10px] font-mono ${
                            entry.action ? 'text-emerald-500' : 'text-zinc-600'
                          }`}>
                            {entry.action ?? entry.code}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Mapa de teclas */}
                    <div className="px-4 py-3 border-t border-zinc-800">
                      <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2">Mapeamento ativo</p>
                      <div className="space-y-1">
                        {[
                          { label: '↑ Subir',      keys: 'ArrowUp' },
                          { label: '↓ Descer',     keys: 'ArrowDown' },
                          { label: '← Vel-',       keys: 'ArrowLeft' },
                          { label: '→ Vel+',       keys: 'ArrowRight' },
                          { label: '⏯ Play/Pause', keys: 'Enter / Space / Media' },
                        ].map(m => (
                          <div key={m.label} className="flex justify-between">
                            <span className="text-[10px] text-zinc-400">{m.label}</span>
                            <span className="text-[10px] font-mono text-violet-400">{m.keys}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.aside>
                )}
              </AnimatePresence>
            </div>

            {/* ── Barra de status inferior ── */}
            <div className="shrink-0 flex items-center justify-between px-5 py-2 bg-zinc-950/80 border-t border-zinc-800 text-[11px] text-zinc-600 no-print">
              <span>↑↓ Scroll manual &nbsp;·&nbsp; ←→ Velocidade &nbsp;·&nbsp; Enter/Space = Play/Pause</span>
              <span className={`font-bold ${
                isPlaying ? 'text-amber-400 animate-pulse' : 'text-zinc-600'
              }`}>
                {isPlaying ? '▶ REPRODUZINDO' : '⏸ PARADO'}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const generateStandaloneHTML = (data: Presentation) => {
  const clientLogo = data.clientLogo
    ? data.clientLogo.startsWith('data:')
      ? data.clientLogo
      : `data:image/png;base64,${data.clientLogo}`
    : '';
  
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>DBE - ${data.clientName}</title>
  <style>
    :root {
      --blue: #006f9f;
      --deep-blue: #004a72;
      --green: #00b851;
      --ink: #102331;
      --muted: #5e7180;
      --paper: #f4f9fb;
      --white: #ffffff;
      --line: #dce9ef;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      font-family: Arial, Helvetica, sans-serif;
      color: var(--ink);
      background:
        radial-gradient(circle at top left, rgba(0,184,81,.16), transparent 34%),
        radial-gradient(circle at top right, rgba(0,111,159,.18), transparent 30%),
        var(--paper);
      line-height: 1.55;
    }

    .page {
      width: min(1120px, calc(100% - 32px));
      margin: 0 auto;
      padding: 40px 0 60px;
    }

    .hero {
      background: linear-gradient(135deg, rgba(255,255,255,.96), rgba(242,249,252,.94));
      border: 1px solid var(--line);
      border-radius: 28px;
      padding: 34px;
      box-shadow: 0 24px 70px rgba(0, 74, 114, .12);
      display: grid;
      grid-template-columns: 220px 1fr;
      gap: 32px;
      align-items: center;
      margin-bottom: 28px;
    }

    .logo-wrap {
      background: var(--white);
      border-radius: 22px;
      padding: 22px;
      border: 1px solid var(--line);
      box-shadow: 0 14px 36px rgba(0, 74, 114, .10);
    }

    .logo {
      width: 100%;
      height: auto;
      display: block;
    }

    .eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-radius: 999px;
      background: rgba(0,184,81,.10);
      color: var(--deep-blue);
      font-size: 13px;
      font-weight: 700;
      margin-bottom: 12px;
      letter-spacing: .02em;
    }

    h1 {
      margin: 0;
      font-size: clamp(30px, 4vw, 54px);
      line-height: 1.02;
      color: var(--deep-blue);
      letter-spacing: -0.04em;
    }

    .subtitle {
      margin: 16px 0 0;
      color: var(--muted);
      font-size: 18px;
      max-width: 760px;
    }

    .client {
      margin-top: 22px;
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }

    .pill {
      padding: 10px 14px;
      border: 1px solid var(--line);
      border-radius: 999px;
      background: var(--white);
      color: var(--deep-blue);
      font-weight: 700;
      font-size: 14px;
    }

    .grid {
      display: grid;
      gap: 22px;
    }

    .card {
      background: rgba(255,255,255,.97);
      border: 1px solid var(--line);
      border-radius: 24px;
      padding: 28px;
      box-shadow: 0 18px 54px rgba(0, 74, 114, .10);
      break-inside: avoid;
    }

    .card-top {
      display: grid;
      grid-template-columns: 62px 1fr;
      gap: 18px;
      align-items: start;
      padding-bottom: 18px;
      border-bottom: 1px solid var(--line);
      margin-bottom: 20px;
    }

    .number {
      width: 62px;
      height: 62px;
      border-radius: 18px;
      display: grid;
      place-items: center;
      background: linear-gradient(135deg, var(--blue), var(--green));
      color: var(--white);
      font-weight: 800;
      font-size: 20px;
      box-shadow: 0 10px 24px rgba(0, 111, 159, .22);
    }

    h2 {
      margin: 0;
      color: var(--deep-blue);
      font-size: clamp(22px, 2.5vw, 32px);
      letter-spacing: -0.025em;
      line-height: 1.15;
    }

    .tone {
      margin: 8px 0 0;
      color: var(--muted);
      font-size: 15px;
      font-style: italic;
    }

    .script-block {
      padding: 16px 0;
      border-bottom: 1px solid rgba(220, 233, 239, .8);
    }

    .script-block:last-child {
      border-bottom: 0;
      padding-bottom: 0;
    }

    .block-label {
      color: var(--green);
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: .08em;
      font-size: 12px;
      margin-bottom: 8px;
    }

    p {
      margin: 0;
      font-size: 17px;
    }

    .footer {
      text-align: center;
      margin-top: 32px;
      color: var(--muted);
      font-size: 14px;
    }

    @media (max-width: 760px) {
      .page {
        width: min(100% - 22px, 1120px);
        padding: 22px 0 40px;
      }

      .hero {
        grid-template-columns: 1fr;
        padding: 24px;
        border-radius: 22px;
      }

      .logo-wrap {
        max-width: 210px;
      }

      .card {
        padding: 22px;
        border-radius: 20px;
      }

      .card-top {
        grid-template-columns: 50px 1fr;
        gap: 14px;
      }

      .number {
        width: 50px;
        height: 50px;
        border-radius: 14px;
        font-size: 17px;
      }

      p {
        font-size: 16px;
      }
    }

    @media print {
      body {
        background: var(--white);
      }

      .page {
        width: 100%;
        padding: 0;
      }

      .hero, .card {
        box-shadow: none;
      }

      .card {
        page-break-inside: avoid;
        margin-bottom: 18px;
      }
    }
  </style>
</head>
<body>
  <main class="page">
    <header class="hero">
      <div class="logo-wrap">
        <img class="logo" src="${dbeLogoBase64}" alt="Logo DBE" />
      </div>
      <div>
        <div class="eyebrow">Roteiros para aprovação</div>
        <h1>${data.title}</h1>
        <p class="subtitle">${data.objective}</p>
        <div class="client">
          <span class="pill">Cliente: ${data.clientName}</span>
          <span class="pill">Formato: ${data.format}</span>
          <span class="pill">Produção: DBE</span>
        </div>
      </div>
    </header>

    <section class="grid">
      ${data.scripts.map((script, index) => `
        <article class="card" id="roteiro-${index + 1}">
          <div class="card-top">
            <span class="number">${(index + 1).toString().padStart(2, '0')}</span>
            <div>
              <h2>${script.title}</h2>
              <p class="tone">Tonalidade: ${script.tone}</p>
            </div>
          </div>
          
          <section class="script-block">
            <div class="block-label">Gancho</div>
            <p>${script.hook.replace(/\n/g, '<br>')}</p>
          </section>
          
          <section class="script-block">
            <div class="block-label">Desenvolvimento</div>
            <p>${script.development.replace(/\n/g, '<br>')}</p>
          </section>
          
          <section class="script-block">
            <div class="block-label">CTA</div>
            <p>${script.cta.replace(/\n/g, '<br>')}</p>
          </section>
          
          ${script.notes ? `
          <section class="script-block">
            <div class="block-label">Observações</div>
            <p><i>${script.notes.replace(/\n/g, '<br>')}</i></p>
          </section>
          ` : ''}
          
          ${script.referenceLink ? `
          <section class="script-block">
            <div class="block-label">Referência</div>
            <p><a href="${script.referenceLink}" target="_blank" style="color: var(--blue); text-decoration: none;">${script.referenceLink}</a></p>
          </section>
          ` : ''}
        </article>
      `).join('')}
    </section>

    <footer class="footer">
      DBE — Dos Bastidores ao Espetáculo
      ${clientLogo ? `<br><img src="${clientLogo}" alt="Logo Cliente" style="max-height: 40px; margin-top: 10px; opacity: 0.5;">` : ''}
    </footer>
  </main>
</body>
</html>
  `;
};

export default ViewPresentation;
