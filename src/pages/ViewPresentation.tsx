import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStorage } from '../hooks/useStorage';
import { useToast } from '../components/Toast';
import { ArrowLeft, Download, Printer, Copy, FileCode, Edit2, Monitor, X } from 'lucide-react';
import PresentationPreview from '../components/PresentationPreview';
import type { Presentation } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { dbeLogoBase64 } from '../constants/dbeLogo';

const ViewPresentation: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getPresentation, duplicatePresentation } = useStorage();
  const { showToast } = useToast();
  const [data, setData] = useState<Presentation | null>(null);
  const [showTeleprompter, setShowTeleprompter] = useState(false);

  useEffect(() => {
    if (id) {
      const p = getPresentation(id);
      if (p) setData(p);
    }
  }, [id, getPresentation]);

  const handlePrint = () => {
    window.print();
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black flex flex-col p-6 md:p-12"
          >
            <div className="flex items-center justify-between mb-8 no-print">
              <h2 className="text-2xl font-display font-black uppercase italic tracking-widest text-dbe-blue">
                Teleprompter — {data.clientName}
              </h2>
              <div className="flex gap-4">
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(teleprompterText);
                    showToast('Texto do teleprompter copiado!', 'success');
                  }}
                  className="btn-primary"
                >
                  <Copy size={18} />
                  Copiar Tudo
                </button>
                <button 
                  onClick={() => window.print()}
                  className="btn-secondary"
                >
                  <Printer size={18} />
                  Imprimir
                </button>
                <button onClick={() => setShowTeleprompter(false)} className="btn-ghost bg-zinc-900 rounded-full p-2">
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-zinc-900/30 rounded-3xl border border-zinc-800 p-8 md:p-16">
              <div className="max-w-3xl mx-auto">
                <pre className="whitespace-pre-wrap font-sans text-3xl md:text-5xl font-medium leading-[1.6] text-white">
                  {teleprompterText}
                </pre>
              </div>
            </div>
            
            <div className="mt-8 text-center text-zinc-600 font-medium tracking-widest text-xs uppercase no-print">
              DICA: USE O ATALHO CTRL+P PARA IMPRIMIR ESTA TELA
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Function to generate a standalone HTML file
const generateStandaloneHTML = (data: Presentation) => {
  const primaryColor = data.primaryColor || '#0090D0';
  const secondaryColor = data.secondaryColor || '#22C55E';
  const clientLogo = data.clientLogo
    ? data.clientLogo.startsWith('data:')
      ? data.clientLogo
      : `data:image/png;base64,${data.clientLogo}`
    : '';
  
  return `
<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DBE - ${data.clientName}</title>
    <style>
        /* CSS RESET & BASE */
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; 
          background-color: #000000; 
          color: #ffffff; 
          line-height: 1.5;
          -webkit-print-color-adjust: exact;
        }
        
        /* LAYOUT UTILS */
        .min-h-screen { min-height: 100vh; }
        .flex { display: flex; }
        .flex-col { flex-direction: column; }
        .items-center { align-items: center; }
        .justify-center { justify-content: center; }
        .text-center { text-align: center; }
        .relative { position: relative; }
        .overflow-hidden { overflow: hidden; }
        .w-full { width: 100%; }
        .max-w-4xl { max-width: 56rem; }
        .max-w-6xl { max-width: 72rem; }
        .mx-auto { margin-left: auto; margin-right: auto; }
        .p-8 { padding: 2rem; }
        .px-6 { padding-left: 1.5rem; padding-right: 1.5rem; }
        .py-32 { padding-top: 8rem; padding-bottom: 8rem; }
        .mb-8 { margin-bottom: 2rem; }
        .mb-12 { margin-bottom: 3rem; }
        .gap-4 { gap: 1rem; }
        
        /* PREMIUM STYLES */
        .bg-mesh {
          background-color: #000000;
          background-image: 
            radial-gradient(at 0% 0%, ${primaryColor}20 0px, transparent 50%),
            radial-gradient(at 100% 0%, ${primaryColor}15 0px, transparent 50%);
        }
        
        .glass {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 2rem;
        }

        .capsule {
          padding: 0.5rem 1.5rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        .tag-blue { background: ${secondaryColor}1a; color: ${secondaryColor}; border: 1px solid ${secondaryColor}33; }
        .tag-zinc { background: rgba(39, 39, 42, 0.5); color: #a1a1aa; border: 1px solid #27272a; }

        /* TYPOGRAPHY */
        .title-main {
          font-size: clamp(3rem, 10vw, 5rem);
          font-weight: 900;
          text-transform: uppercase;
          font-style: italic;
          letter-spacing: -0.05em;
          line-height: 0.9;
          margin-bottom: 2rem;
        }

        .script-card {
          margin-bottom: 10rem;
          position: relative;
        }

        .script-number {
          position: absolute;
          left: -2rem;
          top: -2rem;
          font-size: 12rem;
          font-weight: 900;
          font-style: italic;
          opacity: 0.05;
          color: ${primaryColor};
          pointer-events: none;
        }

        .script-header {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          margin-bottom: 3rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          padding-bottom: 2rem;
        }

        .index-box {
          width: 3.5rem;
          height: 3.5rem;
          background: ${primaryColor};
          color: #000;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          font-style: italic;
          font-size: 1.5rem;
          border-radius: 1rem;
        }

        .script-title {
          font-size: 2.5rem;
          font-weight: 900;
          text-transform: uppercase;
          font-style: italic;
        }

        .grid-container {
          display: grid;
          grid-template-columns: 1fr;
          gap: 2rem;
        }
        @media (min-width: 1024px) {
          .grid-container { grid-template-columns: 7fr 5fr; }
        }

        .content-block {
          padding: 2rem;
          margin-bottom: 2rem;
        }

        .hook-box {
          border-left: 4px solid #39FF14;
          background: rgba(57, 255, 20, 0.03);
        }
        .hook-label { color: #39FF14; font-size: 0.7rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.2em; margin-bottom: 1rem; display: block;}
        .hook-text { font-size: 1.5rem; font-weight: 700; }

        .cta-box {
          background: ${primaryColor};
          color: #000;
          padding: 2.5rem;
          border-radius: 2rem;
        }
        .cta-label { opacity: 0.5; font-size: 0.7rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.2em; margin-bottom: 1rem; display: block;}
        .cta-text { font-size: 2rem; font-weight: 900; text-transform: uppercase; font-style: italic; line-height: 1; }
        .logo-frame {
          width: 120px;
          height: 120px;
          border-radius: 28px;
          background: rgba(255,255,255,0.08);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1.5rem;
          box-shadow: 0 24px 60px rgba(0,0,0,0.25);
        }
        .logo-frame img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          border-radius: 18px;
        }
        .tagline {
          font-size: 0.75rem;
          font-weight: 900;
          letter-spacing: 0.25em;
          color: #999;
          text-transform: uppercase;
          margin-bottom: 1.5rem;
        }
        .cover {
          min-height: 100vh;
          padding: 5rem 2rem;
        }
        .content-section {
          padding: 4rem 0;
        }
        .title-main {
          font-size: clamp(2.5rem, 8vw, 4.5rem);
        }
        .glass {
          padding: 2rem;
        }
        .grid-container {
          grid-template-columns: 1fr;
        }

        @media (max-width: 768px) {
          .cover {
            padding: 3rem 1.25rem;
          }
          .logo-frame {
            width: 96px;
            height: 96px;
          }
          .tagline {
            font-size: 0.65rem;
            margin-bottom: 1rem;
          }
          .title-main {
            font-size: clamp(2rem, 12vw, 3.25rem);
          }
          .glass {
            padding: 1.5rem;
          }
          .grid-container {
            gap: 1.5rem;
          }
          .script-header {
            flex-wrap: wrap;
            gap: 1rem;
          }
          .index-box {
            width: 2.75rem;
            height: 2.75rem;
            font-size: 1.15rem;
          }
        }

        @media print {
          body { background: #fff; color: #000; }
          .bg-mesh { background: #fff; }
          .glass { border: 1px solid #ddd; background: #fff; color: #000; box-shadow: none; backdrop-filter: none; }
          .title-main { color: #000; }
          .cta-box { border: 2px solid #000; background: #fff; }
          .page-break { page-break-after: always; }
          .no-print { display: none; }
        }
    </style>
</head>
<body class="bg-mesh">
    <!-- Capa Premium -->
    <div class="cover flex flex-col items-center justify-center relative overflow-hidden text-center">
        <img src="${dbeLogoBase64}" alt="DBE" style="height: 6rem; margin-bottom: 3rem; opacity: 0.9;" />
        
        <h1 class="title-main">${data.title}</h1>

        <div class="flex items-center justify-center gap-4 mb-12">
            <div class="capsule tag-blue">${data.clientName}</div>
            <div class="capsule tag-zinc">${data.clientSegment}</div>
        </div>

        ${data.objective ? `
        <div class="glass" style="padding: 2rem; max-width: 600px; margin: 0 auto; position: relative;">
            <div style="position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: ${primaryColor}; padding: 4px 16px; border-radius: 20px; font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; color: #fff;">
                Objetivo da Campanha
            </div>
            <p style="font-size: 1.25rem; color: #ccc; line-height: 1.6;">
                ${data.objective}
            </p>
        </div>
        ` : ''}

        <div style="position: absolute; bottom: 3rem; width: 100%; display: flex; justify-center; gap: 3rem; font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.2em; color: #555; justify-content: center;">
            <span>${data.responsible}</span>
            <span>${data.date}</span>
            <span>${data.format}</span>
        </div>
    </div>

    <!-- Conteúdo -->
    <div class="max-w-6xl mx-auto px-6 py-32">
        ${data.scripts.map((script, index) => `
            <div class="script-card">
                <div class="script-number">${(index + 1).toString().padStart(2, '0')}</div>

                <div class="relative">
                    <header class="script-header" style="justify-content: space-between;">
                        <div class="flex items-center" style="gap: 1.5rem;">
                            <div class="index-box">${index + 1}</div>
                            <h2 class="script-title">${script.title}</h2>
                        </div>
                        <img src="${dbeLogoBase64}" alt="DBE" style="height: 2rem; opacity: 0.5;" />
                    </header>

                    <div class="grid-container">
                        <div class="flex flex-col gap-4">
                            <div class="glass content-block hook-box">
                                <span class="hook-label">Gancho (Hook)</span>
                                <p class="hook-text">${script.hook}</p>
                            </div>

                            <div class="glass content-block">
                                <span style="font-size: 0.7rem; font-weight: 900; text-transform: uppercase; color: #555; display: block; margin-bottom: 1rem;">Desenvolvimento</span>
                                <div style="font-size: 1.1rem; color: #bbb;">
                                    ${script.development.split('\n').map(p => `<p style="margin-bottom: 1rem;">${p}</p>`).join('')}
                                </div>
                            </div>
                        </div>

                        <div class="flex flex-col gap-4">
                            <div class="cta-box">
                                <span class="cta-label">Call to Action</span>
                                <p class="cta-text">${script.cta}</p>
                            </div>

                            ${script.notes ? `
                            <div class="glass content-block" style="border-style: dashed;">
                                <span style="font-size: 0.7rem; font-weight: 900; text-transform: uppercase; color: #444; display: block; margin-bottom: 0.5rem; font-style: italic;">Observações</span>
                                <p style="font-size: 0.9rem; color: #888; font-style: italic;">${script.notes}</p>
                            </div>` : ''}

                            ${script.referenceLink ? `
                            <div class="glass" style="padding: 1.5rem; border-radius: 1.5rem;">
                                <span style="font-size: 0.7rem; font-weight: 900; text-transform: uppercase; color: #444; display: block; margin-bottom: 0.5rem;">Referência</span>
                                <a href="${script.referenceLink}" target="_blank" style="color: ${primaryColor}; font-size: 0.75rem; text-decoration: none; font-weight: 700; word-break: break-all;">${script.referenceLink}</a>
                            </div>` : ''}
                        </div>
                    </div>
                </div>
                ${index < data.scripts.length - 1 ? '<div class="page-break"></div>' : ''}
            </div>
        `).join('')}
    </div>

    <!-- Rodapé -->
    <footer style="padding: 8rem 2rem; text-align: center; border-top: 1px solid #111;">
        ${clientLogo ? `<img src="${clientLogo}" alt="Logo do cliente" style="max-height: 56px; margin-bottom: 1.5rem; filter: grayscale(60%) opacity(0.65);" />` : ''}
        <p style="font-size: 10px; font-weight: 900; letter-spacing: 0.5em; color: #333; text-transform: uppercase;">
            Dos Bastidores ao Espetáculo &copy; 2026
        </p>
    </footer>
</body>
</html>
  `;
};

export default ViewPresentation;
