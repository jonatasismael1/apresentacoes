import React, { useState } from 'react';
import { X, Check, FileText, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';
import type { Script } from '../types';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (scripts: Script[]) => void;
}

interface ParsedScriptPreview {
  script: Script;
  warnings: string[];
}

/**
 * Structural parser for bulk script import.
 *
 * Rules:
 *  1. Scripts are delimited by lines matching /^Roteiro\s+\d+\s*$/i
 *  2. The script number is extracted from that header line.
 *  3. The title comes from the line starting with "Título:" or "Titulo:".
 *  4. Paragraphs are groups of consecutive non-empty lines separated by blank lines.
 *  5. Gancho  = first paragraph after the title line (positional, not prefix-based).
 *  6. CTA     = last paragraph of the script (positional).
 *  7. Development = all paragraphs between gancho and CTA, joined by "\n\n".
 *  8. "---" separator lines are stripped and do not affect paragraph detection.
 */
function parseRawText(rawText: string): ParsedScriptPreview[] {
  // Split the full text into lines preserving blank lines for paragraph detection.
  const allLines = rawText.split('\n');

  // Locate the indices of "Roteiro X" header lines.
  const ROTEIRO_RE = /^Roteiro\s+(\d+)\s*$/i;

  const scriptStartIndices: Array<{ lineIndex: number; numero: number }> = [];
  allLines.forEach((line, i) => {
    const m = line.match(ROTEIRO_RE);
    if (m) scriptStartIndices.push({ lineIndex: i, numero: parseInt(m[1], 10) });
  });

  // If no "Roteiro X" header found, treat the whole text as a single script (fallback).
  if (scriptStartIndices.length === 0) {
    scriptStartIndices.push({ lineIndex: 0, numero: 1 });
  }

  const results: ParsedScriptPreview[] = [];

  scriptStartIndices.forEach(({ lineIndex, numero }, idx) => {
    // Collect lines belonging to this script.
    const endIndex =
      idx + 1 < scriptStartIndices.length
        ? scriptStartIndices[idx + 1].lineIndex
        : allLines.length;

    const scriptLines = allLines
      .slice(lineIndex, endIndex)
      // Remove the "Roteiro X" header itself.
      .filter((l, i) => !(i === 0 && ROTEIRO_RE.test(l)))
      // Remove "---" separator lines.
      .filter(l => !/^---+\s*$/.test(l.trim()));

    // Extract title.
    let title = `Roteiro ${numero}`;
    let titleLineIdx = -1;
    for (let i = 0; i < scriptLines.length; i++) {
      if (/^t[ií]tulo\s*:/i.test(scriptLines[i].trim())) {
        title = scriptLines[i].replace(/^t[ií]tulo\s*:\s*/i, '').trim();
        titleLineIdx = i;
        break;
      }
    }

    // Work with lines after the title.
    const bodyLines = titleLineIdx >= 0 ? scriptLines.slice(titleLineIdx + 1) : scriptLines;

    // Split into paragraphs: groups of non-empty lines separated by blank lines.
    const paragraphs: string[] = [];
    let currentParagraph: string[] = [];

    for (const line of bodyLines) {
      if (line.trim() === '') {
        if (currentParagraph.length > 0) {
          paragraphs.push(currentParagraph.join('\n'));
          currentParagraph = [];
        }
      } else {
        currentParagraph.push(line.trim());
      }
    }
    if (currentParagraph.length > 0) {
      paragraphs.push(currentParagraph.join('\n'));
    }

    // Assign fields structurally.
    let hook = '';
    let cta = '';
    let development = '';

    if (paragraphs.length === 0) {
      // No body at all
    } else if (paragraphs.length === 1) {
      // Only one paragraph — treat as gancho
      hook = paragraphs[0];
    } else if (paragraphs.length === 2) {
      // Two paragraphs — first is gancho, second is CTA
      hook = paragraphs[0];
      cta = paragraphs[1];
    } else {
      // Three or more: first = gancho, last = CTA, middle = development
      hook = paragraphs[0];
      cta = paragraphs[paragraphs.length - 1];
      development = paragraphs.slice(1, paragraphs.length - 1).join('\n\n');
    }

    // Build warnings for missing fields.
    const warnings: string[] = [];
    if (!title || title === `Roteiro ${numero}`) warnings.push('Título não encontrado');
    if (!hook) warnings.push('Gancho não identificado');
    if (!development) warnings.push('Desenvolvimento vazio');
    if (!cta) warnings.push('CTA não identificado');

    results.push({
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
    });
  });

  return results;
}

const BulkImportModal: React.FC<BulkImportModalProps> = ({ isOpen, onClose, onImport }) => {
  const [rawText, setRawText] = useState('');
  const [previews, setPreviews] = useState<ParsedScriptPreview[]>([]);
  const [step, setStep] = useState<1 | 2>(1);

  const handleParse = () => {
    if (!rawText.trim()) return;
    const parsed = parseRawText(rawText);
    setPreviews(parsed);
    setStep(2);
  };

  const handleImport = () => {
    onImport(previews.map(p => p.script));
    setRawText('');
    setPreviews([]);
    setStep(1);
    onClose();
  };

  const handleBack = () => {
    setStep(1);
  };

  if (!isOpen) return null;

  const totalWarnings = previews.reduce((acc, p) => acc + p.warnings.length, 0);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-zinc-800">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <FileText className="text-dbe-blue" />
              Importação em Massa
            </h2>
            <button onClick={onClose} className="btn-ghost p-2 rounded-full">
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6">
            {step === 1 ? (
              <div className="space-y-4">
                <p className="text-zinc-400 text-sm">
                  Cole vários roteiros abaixo. Cada roteiro deve começar com{' '}
                  <code className="bg-zinc-800 px-1 rounded text-zinc-200">Roteiro X</code> (onde X é
                  o número). O separador <code className="bg-zinc-800 px-1 rounded text-zinc-200">---</code>{' '}
                  é opcional. O <strong>gancho</strong> será o primeiro parágrafo após o título e o{' '}
                  <strong>CTA</strong> será o último parágrafo do roteiro.
                </p>
                <textarea
                  className="input-field min-h-[400px] font-mono text-sm leading-relaxed"
                  placeholder={`Roteiro 7\nTítulo: Autoridade para empresas maiores\n\nNo Lucro Real, achismo não é erro. É prejuízo.\n\nEmpresa que joga o jogo grande não pode ter contabilidade genérica.\n\nSe é desse nível que você precisa, clica no link da bio.\n\n---\n\nRoteiro 8\nTítulo: Troca de contador\n\nSe você vai trocar de contador e tá procurando só o honorário mais barato... cuidado.\n\nO barato sai muito caro quando ninguém te avisa.\n\nNa Assertiva SC, você tem nome. Clica no link da bio.`}
                  value={rawText}
                  onChange={e => setRawText(e.target.value)}
                />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Summary banner */}
                <div className="bg-dbe-blue/10 border border-dbe-blue/30 text-dbe-blue p-4 rounded-lg flex items-center gap-3">
                  <Check size={20} />
                  <strong>{previews.length} roteiro(s) identificado(s).</strong>{' '}
                  Verifique se a extração está correta antes de confirmar.
                </div>

                {/* Warning banner */}
                {totalWarnings > 0 && (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 p-4 rounded-lg flex items-start gap-3">
                    <AlertTriangle size={20} className="mt-0.5 shrink-0" />
                    <span className="text-sm">
                      Alguns roteiros têm campos não identificados. Verifique os avisos nos cards abaixo
                      e, se necessário, volte e ajuste o formato do texto.
                    </span>
                  </div>
                )}

                {/* Script preview cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {previews.map(({ script, warnings }, idx) => (
                    <div
                      key={idx}
                      className={`bg-zinc-950 border rounded-xl p-4 space-y-3 ${
                        warnings.length > 0 ? 'border-yellow-700/50' : 'border-zinc-800'
                      }`}
                    >
                      {/* Card header */}
                      <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                        <span className="font-bold text-sm">{script.title}</span>
                        <span className="text-xs bg-zinc-800 px-2 py-1 rounded text-zinc-400">
                          #{idx + 1}
                        </span>
                      </div>

                      {/* Warnings */}
                      {warnings.length > 0 && (
                        <div className="text-xs text-yellow-400 flex flex-wrap gap-1">
                          {warnings.map((w, wi) => (
                            <span key={wi} className="bg-yellow-500/10 px-2 py-0.5 rounded-full border border-yellow-500/20">
                              ⚠ {w}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Gancho */}
                      {script.hook ? (
                        <div>
                          <span className="text-[10px] uppercase font-bold text-dbe-green">Gancho</span>
                          <p className="text-xs text-zinc-300 line-clamp-2">{script.hook}</p>
                        </div>
                      ) : (
                        <div>
                          <span className="text-[10px] uppercase font-bold text-zinc-600">Gancho</span>
                          <p className="text-xs text-zinc-600 italic">não identificado</p>
                        </div>
                      )}

                      {/* Development */}
                      {script.development ? (
                        <div>
                          <span className="text-[10px] uppercase font-bold text-zinc-500">Desenvolvimento</span>
                          <p className="text-xs text-zinc-300 line-clamp-3">{script.development}</p>
                        </div>
                      ) : (
                        <div>
                          <span className="text-[10px] uppercase font-bold text-zinc-600">Desenvolvimento</span>
                          <p className="text-xs text-zinc-600 italic">não identificado</p>
                        </div>
                      )}

                      {/* CTA */}
                      {script.cta ? (
                        <div>
                          <span className="text-[10px] uppercase font-bold text-dbe-blue">CTA</span>
                          <p className="text-xs text-zinc-300 line-clamp-2">{script.cta}</p>
                        </div>
                      ) : (
                        <div>
                          <span className="text-[10px] uppercase font-bold text-zinc-600">CTA</span>
                          <p className="text-xs text-zinc-600 italic">não identificado</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-zinc-800 flex justify-between bg-zinc-950/50">
            {step === 1 ? (
              <>
                <button onClick={onClose} className="btn-ghost">
                  Cancelar
                </button>
                <button onClick={handleParse} disabled={!rawText.trim()} className="btn-primary">
                  Identificar Roteiros
                </button>
              </>
            ) : (
              <>
                <button onClick={handleBack} className="btn-ghost">
                  Voltar e Editar
                </button>
                <button onClick={handleImport} className="btn-primary">
                  Importar {previews.length} Roteiro(s)
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
