import React, { useState } from 'react';
import { X, Check, FileText, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';
import type { Script, ScriptTemplate } from '../types';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (scripts: Script[]) => void;
  templates?: ScriptTemplate[];
}

interface ParsedScriptPreview {
  script: Script;
  warnings: string[];
}

const EXAMPLES = [
  {
    label: 'Roteiro curto',
    text: `Roteiro 1
Título: Dor principal do cliente

Seu cliente não ignora sua oferta por falta de interesse. Ele ignora quando não entende o valor rápido o suficiente.

Mostre o problema, a consequência e a solução em frases simples. Depois prove com um exemplo real.

Se quer transformar essa ideia em conteúdo, chama a DBE.`,
  },
  {
    label: 'Múltiplos roteiros',
    text: `Roteiro 1
Título: Autoridade

Quem decide rápido precisa entender rápido.

Conteúdos de autoridade não são sobre falar difícil. São sobre tornar uma decisão mais clara.

Salve esse roteiro para revisar antes da gravação.

---

Roteiro 2
Título: Oferta direta

Se o seu conteúdo explica muito e vende pouco, talvez o problema esteja no CTA.

O público precisa saber qual é o próximo passo, por que ele importa e o que acontece depois do clique.

Clique no link da bio e fale com a DBE.`,
  },
];

function parseRawText(rawText: string): ParsedScriptPreview[] {
  const allLines = rawText.split('\n');
  const headerRegex = /^Roteiro\s+(\d+)\s*$/i;
  const scriptStartIndices: Array<{ lineIndex: number; number: number }> = [];

  allLines.forEach((line, index) => {
    const match = line.match(headerRegex);
    if (match) scriptStartIndices.push({ lineIndex: index, number: parseInt(match[1], 10) });
  });

  if (scriptStartIndices.length === 0) {
    scriptStartIndices.push({ lineIndex: 0, number: 1 });
  }

  return scriptStartIndices.map(({ lineIndex, number }, index) => {
    const endIndex = index + 1 < scriptStartIndices.length
      ? scriptStartIndices[index + 1].lineIndex
      : allLines.length;

    const scriptLines = allLines
      .slice(lineIndex, endIndex)
      .filter((line, lineOffset) => !(lineOffset === 0 && headerRegex.test(line)))
      .filter(line => !/^---+\s*$/.test(line.trim()));

    let title = `Roteiro ${number}`;
    let titleLineIndex = -1;
    for (let i = 0; i < scriptLines.length; i += 1) {
      if (/^t[ií]tulo\s*:/i.test(scriptLines[i].trim())) {
        title = scriptLines[i].replace(/^t[ií]tulo\s*:\s*/i, '').trim();
        titleLineIndex = i;
        break;
      }
    }

    const bodyLines = titleLineIndex >= 0 ? scriptLines.slice(titleLineIndex + 1) : scriptLines;
    const paragraphs: string[] = [];
    let currentParagraph: string[] = [];

    bodyLines.forEach(line => {
      if (line.trim() === '') {
        if (currentParagraph.length > 0) {
          paragraphs.push(currentParagraph.join('\n'));
          currentParagraph = [];
        }
      } else {
        currentParagraph.push(line.trim());
      }
    });
    if (currentParagraph.length > 0) paragraphs.push(currentParagraph.join('\n'));

    const hook = paragraphs[0] || '';
    const cta = paragraphs.length > 1 ? paragraphs[paragraphs.length - 1] : '';
    const development = paragraphs.length > 2 ? paragraphs.slice(1, -1).join('\n\n') : '';
    const warnings: string[] = [];
    if (!title || title === `Roteiro ${number}`) warnings.push('Título não encontrado');
    if (!hook) warnings.push('Gancho não identificado');
    if (!development) warnings.push('Desenvolvimento vazio');
    if (!cta) warnings.push('CTA não identificado');

    return {
      script: {
        id: uuidv4(),
        title,
        theme: '',
        audience: '',
        tone: '',
        hook,
        development,
        cta,
        notes: '',
        referenceLink: '',
      },
      warnings,
    };
  });
}

const BulkImportModal: React.FC<BulkImportModalProps> = ({ isOpen, onClose, onImport, templates = [] }) => {
  const [rawText, setRawText] = useState('');
  const [previews, setPreviews] = useState<ParsedScriptPreview[]>([]);
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  if (!isOpen) return null;

  const totalWarnings = previews.reduce((acc, preview) => acc + preview.warnings.length, 0);

  const handleParse = () => {
    if (!rawText.trim()) return;
    setPreviews(parseRawText(rawText));
    setStep(2);
  };

  const updatePreviewScript = (index: number, updates: Partial<Script>) => {
    setPreviews(prev => prev.map((item, itemIndex) => (
      itemIndex === index ? { ...item, script: { ...item.script, ...updates } } : item
    )));
  };

  const handleImport = () => {
    const template = templates.find(item => item.id === selectedTemplateId);
    const scripts = previews.map(preview => ({
      ...(template?.script || {}),
      ...preview.script,
      theme: preview.script.theme || template?.script.theme || '',
      audience: preview.script.audience || template?.script.audience || '',
      tone: preview.script.tone || template?.script.tone || '',
    }));
    onImport(scripts);
    setRawText('');
    setPreviews([]);
    setStep(1);
    setSelectedTemplateId('');
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
        >
          <div className="flex items-center justify-between p-6 border-b border-zinc-800">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <FileText className="text-dbe-blue" />
              Importação em massa
            </h2>
            <button onClick={onClose} className="btn-ghost p-2 rounded-full">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {step === 1 ? (
              <div className="space-y-4">
                <p className="text-zinc-400 text-sm">
                  Cole vários roteiros. Cada roteiro pode começar com <code className="bg-zinc-800 px-1 rounded text-zinc-200">Roteiro X</code>. O primeiro parágrafo vira gancho, o último vira CTA e o meio vira desenvolvimento.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Exemplos</label>
                    <div className="flex flex-wrap gap-2">
                      {EXAMPLES.map(example => (
                        <button key={example.label} onClick={() => setRawText(example.text)} className="btn-secondary text-xs">
                          {example.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="label">Template base</label>
                    <select value={selectedTemplateId} onChange={event => setSelectedTemplateId(event.target.value)} className="input-field">
                      <option value="">Sem template</option>
                      {templates.map(template => (
                        <option key={template.id} value={template.id}>{template.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <textarea
                  className="input-field min-h-[380px] font-mono text-sm leading-relaxed"
                  placeholder={EXAMPLES[0].text}
                  value={rawText}
                  onChange={event => setRawText(event.target.value)}
                />
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-dbe-blue/10 border border-dbe-blue/30 text-dbe-blue p-4 rounded-lg flex items-center gap-3">
                  <Check size={20} />
                  <strong>{previews.length} roteiro(s) identificado(s).</strong>
                  Revise e edite antes de importar.
                </div>

                {totalWarnings > 0 && (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 p-4 rounded-lg flex items-start gap-3">
                    <AlertTriangle size={20} className="mt-0.5 shrink-0" />
                    <span className="text-sm">Alguns campos não foram identificados automaticamente.</span>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {previews.map(({ script, warnings }, index) => (
                    <div key={script.id} className={`bg-zinc-950 border rounded-xl p-4 space-y-3 ${warnings.length > 0 ? 'border-yellow-700/50' : 'border-zinc-800'}`}>
                      <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                        <span className="font-bold text-sm">#{index + 1}</span>
                        {warnings.length > 0 && <span className="text-xs text-yellow-400">{warnings.length} aviso(s)</span>}
                      </div>

                      <Field label="Título" value={script.title} onChange={value => updatePreviewScript(index, { title: value })} />
                      <Area label="Gancho" value={script.hook} onChange={value => updatePreviewScript(index, { hook: value })} />
                      <Area label="Desenvolvimento" value={script.development} onChange={value => updatePreviewScript(index, { development: value })} minHeight="min-h-24" />
                      <Area label="CTA" value={script.cta} onChange={value => updatePreviewScript(index, { cta: value })} />
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
                <button onClick={handleParse} disabled={!rawText.trim()} className="btn-primary">Identificar roteiros</button>
              </>
            ) : (
              <>
                <button onClick={() => setStep(1)} className="btn-ghost">Voltar e editar</button>
                <button onClick={handleImport} className="btn-primary">Importar {previews.length} roteiro(s)</button>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase font-bold text-zinc-500">{label}</span>
      <input value={value} onChange={event => onChange(event.target.value)} className="input-field py-1 px-2 text-xs mt-1" />
    </label>
  );
}

function Area({ label, value, onChange, minHeight = 'min-h-16' }: { label: string; value: string; onChange: (value: string) => void; minHeight?: string }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase font-bold text-zinc-500">{label}</span>
      <textarea value={value} onChange={event => onChange(event.target.value)} className={`input-field text-xs mt-1 ${minHeight}`} />
    </label>
  );
}

export default BulkImportModal;
