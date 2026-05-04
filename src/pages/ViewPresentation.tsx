import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStorage } from '../hooks/useStorage';
import { useToast } from '../components/Toast';
import { ArrowLeft, Download, Printer, Copy, FileCode, Edit2, Monitor, X } from 'lucide-react';
import PresentationPreview from '../components/PresentationPreview';
import type { Presentation } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

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
  // We'll use a simplified version of the Tailwind styles to ensure it looks good offline
  return `
<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DBE - Apresentação para ${data.clientName}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Inter', sans-serif; background-color: #09090b; color: white; }
        .bg-gradient { background: radial-gradient(circle at center, ${data.primaryColor || '#0047FF'}15 0%, transparent 70%); }
        @media print {
            body { background: white !important; color: black !important; }
            .no-print { display: none !important; }
            .page-break { page-break-after: always; }
        }
    </style>
</head>
<body>
    <div class="bg-gradient min-h-screen">
        <!-- Capa -->
        <div class="h-screen flex flex-col items-center justify-center text-center p-8">
            <div style="height: 100px; margin-bottom: 48px;">
              <img src="logo-dbe.png" alt="DBE" style="height: 100%; width: auto; object-fit: contain;" onerror="this.style.display='none'">
              <!-- Fallback caso a imagem não esteja na mesma pasta -->
              <h2 id="fallback-logo" class="text-2xl font-bold tracking-tighter" style="display:none;"><span style="color: #0090D0">DBE</span> — DOS BASTIDORES AO ESPETÁCULO</h2>
              <script>
                document.querySelector('img').onerror = function() {
                  this.style.display='none';
                  document.getElementById('fallback-logo').style.display='block';
                };
              </script>
            </div>
            <h1 class="text-5xl md:text-7xl font-bold mb-6 tracking-tight leading-tight">${data.title}</h1>
            <div class="flex flex-wrap items-center justify-center gap-4 mb-12">
                <span class="px-4 py-1.5 rounded-full border border-zinc-800 text-sm font-medium uppercase tracking-wider">${data.clientName}</span>
                <span class="px-4 py-1.5 rounded-full bg-zinc-900 text-sm font-medium uppercase tracking-wider">${data.clientSegment}</span>
            </div>
            <div class="max-w-2xl mx-auto p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10">
                <div class="text-sm font-bold uppercase tracking-widest mb-3" style="color: ${data.primaryColor || '#0047FF'}">Objetivo da Campanha</div>
                <p class="text-xl text-zinc-300">${data.objective}</p>
            </div>
            <div class="absolute bottom-8 w-full flex justify-center gap-8 text-xs text-zinc-500 font-medium">
                <span>${data.responsible}</span>
                <span>${data.date}</span>
                <span>${data.format}</span>
            </div>
        </div>

        <!-- Roteiros -->
        <div class="max-w-5xl mx-auto px-6 py-20">
            ${data.scripts.map((script, index) => `
                <div class="mb-32 relative">
                    <div class="absolute -left-12 top-0 text-9xl font-black opacity-5 pointer-events-none select-none" style="color: ${data.primaryColor || '#0047FF'}">${(index + 1).toString().padStart(2, '0')}</div>
                    <div class="relative z-10">
                        <header class="mb-12 border-b border-zinc-800 pb-8">
                            <div class="flex items-center gap-3 mb-4">
                                <span class="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style="background-color: ${data.primaryColor || '#0047FF'}">${index + 1}</span>
                                <h2 class="text-3xl font-bold tracking-tight">${script.title}</h2>
                            </div>
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div><span class="text-xs uppercase font-bold text-zinc-500 block mb-1">Tema</span><span class="font-medium">${script.theme}</span></div>
                                <div><span class="text-xs uppercase font-bold text-zinc-500 block mb-1">Público</span><span class="font-medium">${script.audience}</span></div>
                                <div><span class="text-xs uppercase font-bold text-zinc-500 block mb-1">Tonalidade</span><span class="font-medium">${script.tone}</span></div>
                            </div>
                        </header>
                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-12">
                            <div class="space-y-8">
                                <div class="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
                                    <h3 class="text-xs font-bold uppercase tracking-wider text-green-400 mb-4">Gancho (Hook)</h3>
                                    <p class="text-lg">${script.hook}</p>
                                </div>
                                <div class="p-6 border-l-2 border-zinc-800">
                                    <h3 class="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-4">Desenvolvimento</h3>
                                    <p class="text-lg text-zinc-300">${script.development}</p>
                                </div>
                            </div>
                            <div class="space-y-8">
                                <div class="p-6 bg-blue-500/10 rounded-xl border border-blue-500/20">
                                    <h3 class="text-xs font-bold uppercase tracking-wider text-blue-400 mb-4">Call to Action (CTA)</h3>
                                    <p class="text-xl font-bold">${script.cta}</p>
                                </div>
                            </div>
                        </div>
                        <div class="mt-12 space-y-4">
                            ${script.notes ? `
                            <div class="p-4 bg-zinc-900/50 rounded-lg flex gap-3 text-sm text-zinc-400 italic">
                                <p><strong>Observações de gravação:</strong> ${script.notes}</p>
                            </div>` : ''}
                            
                            ${script.referenceLink ? `
                            <div class="p-4 bg-zinc-900/50 rounded-lg flex gap-3 text-sm text-blue-400">
                                <a href="${script.referenceLink}" target="_blank" style="color: ${data.primaryColor || '#0047FF'}">Referência: ${script.referenceLink}</a>
                            </div>` : ''}
                        </div>
                    </div>
                </div>
                ${index < data.scripts.length - 1 ? '<div class="page-break"></div>' : ''}
            `).join('')}
        </div>

        <!-- Footer -->
        <footer class="p-20 text-center border-t border-zinc-900">
            <p class="text-zinc-500 font-medium tracking-widest text-sm uppercase">DBE — DOS BASTIDORES AO ESPETÁCULO</p>
        </footer>
    </div>
</body>
</html>
  `;
};

export default ViewPresentation;
