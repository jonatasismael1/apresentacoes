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
  const primaryColor = data.primaryColor || '#0090D0';
  
  return `
<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DBE - ${data.clientName}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&family=Inter:wght@300;400;500;700&display=swap" rel="stylesheet">
    <script>
      tailwind.config = {
        theme: {
          extend: {
            colors: {
              'dbe-blue': '#0090D0',
              'dbe-green': '#39FF14',
            },
            fontFamily: {
              'display': ['Outfit', 'sans-serif'],
              'sans': ['Inter', 'sans-serif'],
            }
          }
        }
      }
    </script>
    <style>
        body { 
          font-family: 'Inter', sans-serif; 
          background-color: #000000; 
          color: white; 
          -webkit-print-color-adjust: exact;
        }
        .bg-mesh {
          background-color: #000000;
          background-image: 
            radial-gradient(at 0% 0%, ${primaryColor}15 0px, transparent 50%),
            radial-gradient(at 100% 0%, ${primaryColor}10 0px, transparent 50%);
        }
        .glass {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        @media print {
            body { background: white !important; color: black !important; }
            .no-print { display: none !important; }
            .glass { background: white !important; border: 1px solid #eee !important; color: black !important; }
            .bg-mesh { background: white !important; }
            .page-break { page-break-after: always; }
        }
    </style>
</head>
<body class="bg-mesh min-h-screen">
    <!-- Capa Premium -->
    <div class="min-h-screen flex flex-col items-center justify-center p-8 relative overflow-hidden">
        <div class="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 pointer-events-none"></div>
        
        <div class="relative z-10 w-full max-w-4xl mx-auto text-center">
            <div class="mb-12 inline-block">
                <div class="flex items-center gap-4">
                  <div class="w-16 h-16 rounded-2xl flex items-center justify-center text-black font-black italic text-2xl" style="background-color: ${primaryColor}">
                    DBE
                  </div>
                  <div class="text-left">
                    <div class="text-xs font-black tracking-[0.3em] uppercase text-zinc-500">Dos Bastidores</div>
                    <div class="text-xs font-black tracking-[0.3em] uppercase text-zinc-500">Ao Espetáculo</div>
                  </div>
                </div>
            </div>

            <h1 class="text-6xl md:text-8xl font-display font-black mb-8 tracking-tighter leading-none italic uppercase">
                ${data.title}
            </h1>

            <div class="flex flex-wrap items-center justify-center gap-4 mb-16">
                <div class="px-6 py-2 rounded-full glass text-sm font-bold uppercase tracking-widest text-dbe-blue">
                    ${data.clientName}
                </div>
                <div class="px-6 py-2 rounded-full border border-zinc-800 text-sm font-bold uppercase tracking-widest text-zinc-400">
                    ${data.clientSegment}
                </div>
            </div>

            <div class="glass p-10 rounded-[2rem] max-w-2xl mx-auto relative group transition-all duration-500 hover:border-dbe-blue/30">
                <div class="absolute -top-4 left-1/2 -translate-x-1/2 px-6 py-1 bg-dbe-blue rounded-full text-[10px] font-black uppercase tracking-[0.2em]">
                    Objetivo da Campanha
                </div>
                <p class="text-2xl font-medium text-zinc-200 leading-relaxed italic">
                    "${data.objective}"
                </p>
            </div>
        </div>

        <div class="absolute bottom-12 left-0 w-full flex justify-center gap-12 text-[10px] text-zinc-500 font-black uppercase tracking-[0.3em]">
            <div class="flex items-center gap-2"><div class="w-1.5 h-1.5 bg-dbe-blue rounded-full"></div> ${data.responsible}</div>
            <div class="flex items-center gap-2"><div class="w-1.5 h-1.5 bg-zinc-700 rounded-full"></div> ${data.date}</div>
            <div class="flex items-center gap-2"><div class="w-1.5 h-1.5 bg-zinc-700 rounded-full"></div> ${data.format}</div>
        </div>
    </div>

    <!-- Conteúdo -->
    <div class="max-w-6xl mx-auto px-6 py-32">
        ${data.scripts.map((script, index) => `
            <div class="mb-40 relative group">
                <!-- Número de Fundo -->
                <div class="absolute -left-20 -top-10 text-[15rem] font-display font-black opacity-[0.03] select-none italic" style="color: ${primaryColor}">
                    ${(index + 1).toString().padStart(2, '0')}
                </div>

                <div class="relative z-10">
                    <header class="mb-16 border-b border-zinc-800/50 pb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div>
                            <div class="flex items-center gap-4 mb-4">
                                <span class="w-12 h-12 rounded-2xl flex items-center justify-center text-black font-black italic text-xl" style="background-color: ${primaryColor}">
                                    ${index + 1}
                                </span>
                                <h2 class="text-4xl md:text-5xl font-display font-black tracking-tight uppercase italic">${script.title}</h2>
                            </div>
                            <div class="flex flex-wrap gap-6 text-zinc-500">
                                <div class="flex items-center gap-2">
                                    <span class="w-1 h-1 bg-zinc-700 rounded-full"></span>
                                    <span class="text-[10px] font-bold uppercase tracking-widest">Tema:</span>
                                    <span class="text-zinc-300 font-medium">${script.theme}</span>
                                </div>
                                <div class="flex items-center gap-2">
                                    <span class="w-1 h-1 bg-zinc-700 rounded-full"></span>
                                    <span class="text-[10px] font-bold uppercase tracking-widest">Público:</span>
                                    <span class="text-zinc-300 font-medium">${script.audience}</span>
                                </div>
                            </div>
                        </div>
                        <div class="glass px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-dbe-blue">
                            Tonalidade: ${script.tone}
                        </div>
                    </header>

                    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        <!-- Coluna Principal -->
                        <div class="lg:col-span-7 space-y-8">
                            <div class="glass p-8 rounded-[2rem] border-l-4 border-l-dbe-green transition-all hover:translate-x-1">
                                <h3 class="text-[10px] font-black uppercase tracking-[0.3em] text-dbe-green mb-6 flex items-center gap-2">
                                    <div class="w-2 h-2 bg-dbe-green rounded-full animate-pulse"></div>
                                    Gancho (Hook)
                                </h3>
                                <p class="text-2xl font-display font-bold text-white leading-tight">
                                    ${script.hook}
                                </p>
                            </div>

                            <div class="glass p-8 rounded-[2rem] transition-all hover:translate-x-1">
                                <h3 class="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 mb-6">Desenvolvimento</h3>
                                <div class="text-lg text-zinc-300 leading-relaxed font-medium">
                                    ${script.development.split('\n').map(p => `<p class="mb-4">${p}</p>`).join('')}
                                </div>
                            </div>
                        </div>

                        <!-- Coluna CTA / Info -->
                        <div class="lg:col-span-5 space-y-8">
                            <div class="p-8 rounded-[2rem] text-black shadow-[0_20px_50px_rgba(0,144,208,0.2)] transition-all hover:-translate-y-1" style="background-color: ${primaryColor}">
                                <h3 class="text-[10px] font-black uppercase tracking-[0.3em] text-black/50 mb-6">Call to Action</h3>
                                <p class="text-3xl font-display font-black leading-none uppercase italic">
                                    ${script.cta}
                                </p>
                            </div>

                            ${script.notes ? `
                            <div class="glass p-8 rounded-[2rem] border-dashed border-zinc-800">
                                <h3 class="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600 mb-4 italic">Observações</h3>
                                <p class="text-sm text-zinc-400 italic font-medium leading-relaxed">${script.notes}</p>
                            </div>` : ''}

                            ${script.referenceLink ? `
                            <a href="${script.referenceLink}" target="_blank" class="block glass p-6 rounded-[1.5rem] border-zinc-800 hover:border-dbe-blue/50 transition-all group">
                                <h3 class="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600 mb-2">Referência</h3>
                                <div class="text-xs text-dbe-blue font-bold truncate group-hover:underline">${script.referenceLink}</div>
                            </a>` : ''}
                        </div>
                    </div>
                </div>
                ${index < data.scripts.length - 1 ? '<div class="page-break"></div>' : ''}
            </div>
        `).join('')}
    </div>

    <!-- Rodapé Premium -->
    <footer class="py-32 px-8 text-center border-t border-zinc-900 relative overflow-hidden">
        <div class="absolute inset-0 bg-dbe-blue/5 blur-[120px] rounded-full -bottom-1/2"></div>
        <div class="relative z-10">
            <div class="mb-6 opacity-30">
                <div class="w-10 h-10 rounded-lg bg-white mx-auto"></div>
            </div>
            <p class="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-600">
                Dos Bastidores ao Espetáculo &copy; 2026
            </p>
        </div>
    </footer>
</body>
</html>
  `;
};

export default ViewPresentation;
