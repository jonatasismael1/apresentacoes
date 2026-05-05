import React, { useState } from 'react';
import { X, Check, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';
import type { Script } from '../types';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (scripts: Script[]) => void;
}

const BulkImportModal: React.FC<BulkImportModalProps> = ({ isOpen, onClose, onImport }) => {
  const [rawText, setRawText] = useState('');
  const [parsedScripts, setParsedScripts] = useState<Script[]>([]);
  const [step, setStep] = useState<1 | 2>(1);

  const parseText = () => {
    if (!rawText.trim()) return;

    // Simple heuristic parser
    const blocks = rawText.split(/(?:Roteiro\s*\d+|---|\*\*\*|___)/i).filter(b => b.trim().length > 0);
    
    const newScripts: Script[] = blocks.map((block, index) => {
      const lines = block.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      
      let title = `Roteiro ${index + 1}`;
      let hook = '';
      let development = '';
      let cta = '';
      let notes = '';

      // Try to extract known fields based on prefixes
      const remainingLines: string[] = [];
      
      lines.forEach(line => {
        const lowerLine = line.toLowerCase();
        if (lowerLine.startsWith('título:') || lowerLine.startsWith('titulo:')) {
          title = line.replace(/título:|titulo:/i, '').trim();
        } else if (lowerLine.startsWith('gancho:')) {
          hook = line.replace(/gancho:/i, '').trim();
        } else if (lowerLine.startsWith('desenvolvimento:')) {
          development = line.replace(/desenvolvimento:/i, '').trim();
        } else if (lowerLine.startsWith('cta:')) {
          cta = line.replace(/cta:/i, '').trim();
        } else if (lowerLine.startsWith('notas:') || lowerLine.startsWith('observações:')) {
          notes = line.replace(/notas:|observações:/i, '').trim();
        } else {
          remainingLines.push(line);
        }
      });

      // If development is empty, put everything unknown into development
      if (!development && remainingLines.length > 0) {
        development = remainingLines.join('\n');
      } else if (development && remainingLines.length > 0) {
        development += '\n' + remainingLines.join('\n');
      }

      return {
        id: uuidv4(),
        title,
        theme: '',
        audience: '',
        tone: '',
        hook,
        development,
        cta,
        notes,
        referenceLink: ''
      };
    });

    setParsedScripts(newScripts);
    setStep(2);
  };

  const handleImport = () => {
    onImport(parsedScripts);
    setRawText('');
    setParsedScripts([]);
    setStep(1);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
        >
          <div className="flex items-center justify-between p-6 border-b border-zinc-800">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <FileText className="text-dbe-blue" />
              Importação em Massa
            </h2>
            <button onClick={onClose} className="btn-ghost p-2 rounded-full">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {step === 1 ? (
              <div className="space-y-4">
                <p className="text-zinc-400">
                  Cole vários roteiros de uma vez. O sistema tentará identificar os blocos automaticamente separando por "Roteiro 1", "---" ou identificando termos como "Título:", "Gancho:" e "CTA:".
                </p>
                <textarea 
                  className="input-field min-h-[400px] font-mono text-sm leading-relaxed"
                  placeholder="Exemplo:&#10;&#10;Roteiro 1&#10;Título: Venda Mais&#10;Gancho: Você sabia que...&#10;Desenvolvimento: O mercado mudou...&#10;CTA: Clique no link...&#10;&#10;---&#10;&#10;Roteiro 2&#10;Título: Nova Estratégia..."
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                />
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-dbe-blue/10 border border-dbe-blue/30 text-dbe-blue p-4 rounded-lg flex items-center gap-3">
                  <Check size={20} />
                  <strong>{parsedScripts.length} roteiro(s) identificado(s).</strong> Verifique se a extração está correta antes de confirmar.
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {parsedScripts.map((script, idx) => (
                    <div key={idx} className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl space-y-3">
                      <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                        <span className="font-bold text-sm">{script.title}</span>
                        <span className="text-xs bg-zinc-800 px-2 py-1 rounded text-zinc-400">#{idx + 1}</span>
                      </div>
                      
                      {script.hook && (
                        <div>
                          <span className="text-[10px] uppercase font-bold text-dbe-green">Gancho</span>
                          <p className="text-xs text-zinc-300 truncate">{script.hook}</p>
                        </div>
                      )}
                      
                      {script.development && (
                        <div>
                          <span className="text-[10px] uppercase font-bold text-zinc-500">Desenvolvimento</span>
                          <p className="text-xs text-zinc-300 line-clamp-3">{script.development}</p>
                        </div>
                      )}
                      
                      {script.cta && (
                        <div>
                          <span className="text-[10px] uppercase font-bold text-dbe-blue">CTA</span>
                          <p className="text-xs text-zinc-300 truncate">{script.cta}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="p-6 border-t border-zinc-800 flex justify-between bg-zinc-950/50">
            {step === 1 ? (
              <>
                <button onClick={onClose} className="btn-ghost">Cancelar</button>
                <button 
                  onClick={parseText} 
                  disabled={!rawText.trim()}
                  className="btn-primary"
                >
                  Identificar Roteiros
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setStep(1)} className="btn-ghost">Voltar e Editar</button>
                <button onClick={handleImport} className="btn-primary">
                  Importar {parsedScripts.length} Roteiro(s)
                </button>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default BulkImportModal;
