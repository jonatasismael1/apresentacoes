import React, { useState } from 'react';
import type { Presentation, Script } from '../types';
import { Video, Target, User, Calendar, Play, MessageSquare, AlertCircle, ExternalLink, Copy, Check } from 'lucide-react';
import DBELogo from './DBELogo';

const CopyScriptButton = ({ script }: { script: Script }) => {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = () => {
    const text = `ROTEIRO: ${script.title || 'Sem título'}\n` +
      `Tema: ${script.theme || '—'}\n` +
      `Público: ${script.audience || '—'}\n` +
      `Tonalidade: ${script.tone || '—'}\n\n` +
      `Gancho:\n${script.hook || '—'}\n\n` +
      `Desenvolvimento:\n${script.development || '—'}\n\n` +
      `CTA:\n${script.cta || '—'}\n\n` +
      (script.notes ? `Observações:\n${script.notes}\n\n` : '') +
      (script.referenceLink ? `Referência:\n${script.referenceLink}\n` : '');
    
    navigator.clipboard.writeText(text.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button 
      onClick={handleCopy} 
      className="p-2 ml-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-500 hover:text-white no-print"
      title="Copiar roteiro completo"
    >
      {copied ? <Check size={24} className="text-green-500" /> : <Copy size={24} />}
    </button>
  );
};

interface PreviewProps {
  data: Presentation;
  isPrint?: boolean;
}

const PresentationPreview: React.FC<PreviewProps> = ({ data, isPrint = false }) => {
  const primaryColor = data.primaryColor || '#0047FF';
  
  return (
    <div className={`w-full mx-auto overflow-x-hidden ${isPrint ? 'bg-white text-black' : 'bg-zinc-950 text-white min-h-screen'}`}>
      {/* Cover */}
      <section className="relative min-h-[600px] flex flex-col items-center justify-center text-center p-8 overflow-hidden">
        {/* Background Accent */}
        {!isPrint && (
          <div 
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{ 
              background: `radial-gradient(circle at center, ${primaryColor} 0%, transparent 70%), linear-gradient(180deg, #000 0%, transparent 100%)` 
            }}
          />
        )}
        
        <div className="relative z-10 max-w-4xl w-full">
          <DBELogo className="h-24 mx-auto mb-12" />
          
          <h1 className="text-5xl md:text-8xl font-display font-black mb-6 tracking-tighter leading-none uppercase italic">
            {data.title || 'Título da Apresentação'}
          </h1>
          
          <div className="flex flex-wrap items-center justify-center gap-4 mb-12">
            <span className="px-4 py-1.5 rounded-full border border-zinc-800 text-sm font-medium uppercase tracking-wider" style={{ borderColor: isPrint ? '#eee' : undefined }}>
              {data.clientName || 'Nome do Cliente'}
            </span>
            <span className="px-4 py-1.5 rounded-full bg-zinc-900 text-sm font-medium uppercase tracking-wider" style={{ backgroundColor: isPrint ? '#f5f5f5' : undefined }}>
              {data.clientSegment || 'Segmento'}
            </span>
          </div>

          {data.objective && (
            <div className="max-w-2xl mx-auto p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10" style={{ borderColor: isPrint ? '#eee' : undefined }}>
              <div className="flex items-center justify-center gap-2 mb-3 text-sm font-bold uppercase tracking-widest" style={{ color: primaryColor }}>
                <Target size={16} />
                Objetivo da Campanha
              </div>
              <p className="text-xl text-zinc-300" style={{ color: isPrint ? '#444' : undefined }}>
                {data.objective}
              </p>
            </div>
          )}

          <div className="mt-16 flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-xs font-medium text-zinc-500">
            <div className="flex items-center gap-2">
              <User size={14} />
              {data.responsible || 'Responsável'}
            </div>
            <div className="flex items-center gap-2">
              <Calendar size={14} />
              {data.date || 'Data'}
            </div>
            <div className="flex items-center gap-2">
              <Video size={14} />
              {data.format || 'Formato'}
            </div>
          </div>
        </div>
      </section>

      {/* Scripts */}
      <div className="max-w-5xl mx-auto px-6 py-20 space-y-32">
        {data.scripts.map((script, index) => (
          <section key={script.id} className="relative">
            {/* Index Number */}
            <div 
              className="absolute -left-12 top-0 text-9xl font-black opacity-5 pointer-events-none select-none"
              style={{ color: primaryColor }}
            >
              {(index + 1).toString().padStart(2, '0')}
            </div>

            <div className="relative z-10">
              <header className="mb-12 border-b border-zinc-800 pb-8 flex justify-between items-start" style={{ borderColor: isPrint ? '#eee' : undefined }}>
                <div className="flex items-center gap-3 mb-4">
                  <span 
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black font-display"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {index + 1}
                  </span>
                  <h2 className="text-4xl font-display font-black tracking-tight uppercase italic flex items-center">
                    {script.title || `Roteiro ${index + 1}`}
                    <CopyScriptButton script={script} />
                  </h2>
                </div>
                <DBELogo className="h-8 opacity-50 hidden sm:block" />
              </header>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                  <div className="flex flex-col">
                    <span className="text-xs uppercase font-bold text-zinc-500 mb-1">Tema</span>
                    <span className="font-medium">{script.theme || '—'}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs uppercase font-bold text-zinc-500 mb-1">Público</span>
                    <span className="font-medium">{script.audience || '—'}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs uppercase font-bold text-zinc-500 mb-1">Tonalidade</span>
                    <span className="font-medium">{script.tone || '—'}</span>
                  </div>
                </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <div className="space-y-8">
                  {/* Hook */}
                  <div className="card p-6" style={{ backgroundColor: isPrint ? '#f9f9f9' : undefined }}>
                    <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-dbe-green mb-4">
                      <Play size={16} fill="currentColor" />
                      Gancho (Hook)
                    </h3>
                    <p className="text-lg leading-relaxed">{script.hook}</p>
                  </div>

                  {/* Development */}
                  <div className="p-6 border-l-2 border-zinc-800" style={{ borderColor: isPrint ? '#eee' : undefined }}>
                    <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-zinc-500 mb-4">
                      <MessageSquare size={16} />
                      Desenvolvimento
                    </h3>
                    <p className="text-lg leading-relaxed text-zinc-300" style={{ color: isPrint ? '#444' : undefined }}>
                      {script.development}
                    </p>
                  </div>
                </div>

                <div className="space-y-8">
                  {/* CTA */}
                  <div className="p-6 bg-dbe-blue/10 rounded-xl border border-dbe-blue/20" style={{ backgroundColor: isPrint ? '#f0f4ff' : undefined }}>
                    <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-dbe-blue mb-4">
                      <Target size={16} />
                      Call to Action (CTA)
                    </h3>
                    <p className="text-xl font-bold">{script.cta}</p>
                  </div>
                </div>
              </div>

              {/* Notes & Links */}
              <div className="mt-12 space-y-4">
                {script.notes && (
                  <div className="p-4 bg-zinc-900/50 rounded-lg flex gap-3 text-sm text-zinc-400 italic" style={{ backgroundColor: isPrint ? '#f5f5f5' : undefined }}>
                    <AlertCircle size={18} className="shrink-0 text-zinc-500" />
                    <p><strong>Observações de gravação:</strong> {script.notes}</p>
                  </div>
                )}
                
                {script.referenceLink && (
                  <div className="p-4 bg-zinc-900/50 rounded-lg flex gap-3 text-sm text-dbe-blue" style={{ backgroundColor: isPrint ? '#f0f9ff' : undefined }}>
                    <ExternalLink size={18} className="shrink-0" />
                    <a href={script.referenceLink} target="_blank" rel="noopener noreferrer" className="hover:underline break-all">
                      Referência: {script.referenceLink}
                    </a>
                  </div>
                )}
              </div>
            </div>
            
            {index < data.scripts.length - 1 && <div className="page-break" />}
          </section>
        ))}
      </div>

      {/* Footer */}
      <footer className="p-20 text-center border-t border-zinc-900 mt-20" style={{ borderColor: isPrint ? '#eee' : undefined }}>
        {data.clientLogo && <img src={data.clientLogo} alt="Client Logo" className="h-12 mx-auto mb-8 grayscale opacity-50" />}
        <p className="text-zinc-500 font-medium tracking-widest text-sm uppercase">
          DBE — DOS BASTIDORES AO ESPETÁCULO
        </p>
      </footer>
    </div>
  );
};

export default PresentationPreview;
