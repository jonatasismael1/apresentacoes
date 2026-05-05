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
                  Baixar PDF
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
