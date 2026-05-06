import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStorage } from '../hooks/useStorage';
import { useToast } from '../components/toastContext';
import {
  ArrowLeft,
  CheckCircle,
  Copy,
  Download,
  Edit2,
  FileCode,
  FileText,
  MessageSquare,
  Monitor,
  Printer,
  Send,
  X,
} from 'lucide-react';
import PresentationPreview from '../components/PresentationPreview';
import type { ApprovalStatus, ExportOptions, Presentation } from '../types';
import {
  downloadDocxDocument,
  downloadHtmlDocument,
  generateStandaloneHTML,
  normalizeExportOptions,
} from '../lib/exportDocuments';

const APPROVAL_LABELS: Record<ApprovalStatus, string> = {
  draft: 'Rascunho',
  sent: 'Enviado',
  approved: 'Aprovado',
  changes_requested: 'Ajustes solicitados',
};

const ViewPresentation: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    getPresentation,
    duplicatePresentation,
    addApprovalComment,
    updateApprovalStatus,
  } = useStorage();
  const { showToast } = useToast();
  const data = id ? getPresentation(id) : undefined;
  const [showExport, setShowExport] = useState(false);
  const [comment, setComment] = useState('');
  const [exportOptions, setExportOptions] = useState<ExportOptions>(() =>
    normalizeExportOptions({ scriptIds: [] })
  );

  const selectedScriptsLabel = useMemo(() => {
    if (!data) return '';
    if (exportOptions.scriptIds.length === 0) return 'Todos os roteiros';
    return `${exportOptions.scriptIds.length} roteiro(s) selecionado(s)`;
  }, [data, exportOptions.scriptIds.length]);

  if (!data) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-500">
        Apresentação não encontrada.
      </div>
    );
  }

  const handlePrint = () => {
    const htmlContent = generateStandaloneHTML(data, exportOptions);
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('Não foi possível abrir a janela de impressão.', 'error');
      return;
    }
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.onload = () => printWindow.print();
  };

  const handleCopyContent = async () => {
    const text = data.scripts.map((script, index) =>
      `ROTEIRO ${index + 1}: ${script.title}\n` +
      `Gancho: ${script.hook}\n` +
      `Desenvolvimento: ${script.development}\n` +
      `CTA: ${script.cta}\n`
    ).join('\n---\n\n');

    try {
      await navigator.clipboard.writeText(text);
      showToast('Conteúdo copiado para a área de transferência', 'success');
    } catch {
      showToast('Não foi possível copiar o conteúdo.', 'error');
    }
  };

  const handleDuplicate = (sameClientOnly = false) => {
    if (!id) return;
    const newId = duplicatePresentation(id, sameClientOnly);
    if (newId) {
      showToast(sameClientOnly ? 'Novo projeto criado para o mesmo cliente.' : 'Apresentação duplicada.', 'success');
      navigate(`/editar/${newId}`);
    }
  };

  const handleComment = () => {
    if (!id || !comment.trim()) return;
    addApprovalComment(id, comment.trim());
    setComment('');
    showToast('Comentário registrado.', 'success');
  };

  const handleStatus = (approvalStatus: ApprovalStatus) => {
    if (!id) return;
    updateApprovalStatus(id, approvalStatus);
    showToast(`Status alterado para ${APPROVAL_LABELS[approvalStatus]}.`, 'success');
  };

  const handleScriptToggle = (scriptId: string) => {
    setExportOptions(prev => ({
      ...prev,
      scriptIds: prev.scriptIds.includes(scriptId)
        ? prev.scriptIds.filter(id => id !== scriptId)
        : [...prev.scriptIds, scriptId],
    }));
  };

  return (
    <div className="min-h-screen bg-zinc-950 overflow-x-hidden">
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-zinc-900/85 backdrop-blur-md p-2 rounded-full border border-zinc-800 shadow-2xl no-print">
        <button onClick={() => navigate(`/editar/${id}`)} className="p-2.5 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-all" title="Voltar a editar">
          <ArrowLeft size={20} />
        </button>
        <div className="w-px h-6 bg-zinc-800 mx-1" />
        <button onClick={() => navigate(`/teleprompter/${id}`)} className="flex items-center gap-2 px-4 py-2 hover:bg-zinc-800 rounded-full text-sm font-medium text-zinc-300 hover:text-white transition-all">
          <Monitor size={18} />
          <span className="hidden md:inline">Teleprompter</span>
        </button>
        <button onClick={() => setShowExport(true)} className="flex items-center gap-2 px-4 py-2 hover:bg-zinc-800 rounded-full text-sm font-medium text-zinc-300 hover:text-white transition-all">
          <Download size={18} />
          <span className="hidden md:inline">Exportar</span>
        </button>
        <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-dbe-blue hover:bg-blue-600 rounded-full text-sm font-medium text-white transition-all">
          <Printer size={18} />
          <span className="hidden md:inline">PDF</span>
        </button>
        <div className="w-px h-6 bg-zinc-800 mx-1" />
        <button onClick={handleCopyContent} className="p-2.5 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-all" title="Copiar texto">
          <Copy size={18} />
        </button>
        <button onClick={() => handleDuplicate()} className="p-2.5 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-all" title="Duplicar">
          <FileCode size={18} />
        </button>
        <button onClick={() => handleDuplicate(true)} className="p-2.5 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-all" title="Novo projeto para o mesmo cliente">
          <FileText size={18} />
        </button>
        <button onClick={() => navigate(`/editar/${id}`)} className="p-2.5 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-all" title="Editar">
          <Edit2 size={18} />
        </button>
      </div>

      <div className="fixed top-24 right-6 z-40 w-72 bg-zinc-900/90 border border-zinc-800 rounded-xl p-4 shadow-2xl backdrop-blur no-print hidden xl:block">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Aprovação</span>
          <span className="text-xs text-dbe-blue font-bold">{APPROVAL_LABELS[data.approvalStatus || 'draft']}</span>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <button onClick={() => handleStatus('sent')} className="btn-secondary text-xs py-2">
            <Send size={13} />
            Enviado
          </button>
          <button onClick={() => handleStatus('approved')} className="btn-secondary text-xs py-2 text-dbe-green">
            <CheckCircle size={13} />
            Aprovado
          </button>
        </div>
        <textarea
          value={comment}
          onChange={event => setComment(event.target.value)}
          className="input-field text-xs min-h-20"
          placeholder="Comentário de aprovação ou ajuste..."
        />
        <button onClick={handleComment} disabled={!comment.trim()} className="btn-primary w-full mt-2 text-xs py-2">
          <MessageSquare size={13} />
          Registrar comentário
        </button>
      </div>

      <PresentationPreview data={data} />

      {showExport && (
        <ExportModal
          data={data}
          options={exportOptions}
          selectedScriptsLabel={selectedScriptsLabel}
          onClose={() => setShowExport(false)}
          onChange={setExportOptions}
          onToggleScript={handleScriptToggle}
          onAllScripts={() => setExportOptions(prev => ({ ...prev, scriptIds: [] }))}
          onHtml={() => downloadHtmlDocument(data, exportOptions)}
          onDocx={() => void downloadDocxDocument(data, exportOptions)}
          onPdf={handlePrint}
        />
      )}
    </div>
  );
};

interface ExportModalProps {
  data: Presentation;
  options: ExportOptions;
  selectedScriptsLabel: string;
  onClose: () => void;
  onChange: (options: ExportOptions) => void;
  onToggleScript: (scriptId: string) => void;
  onAllScripts: () => void;
  onHtml: () => void;
  onDocx: () => void;
  onPdf: () => void;
}

const ExportModal: React.FC<ExportModalProps> = ({
  data,
  options,
  selectedScriptsLabel,
  onClose,
  onChange,
  onToggleScript,
  onAllScripts,
  onHtml,
  onDocx,
  onPdf,
}) => (
  <div className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 no-print">
    <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
      <div className="flex items-center justify-between p-5 border-b border-zinc-800">
        <div>
          <h2 className="font-bold text-lg">Opções de exportação</h2>
          <p className="text-xs text-zinc-500 mt-1">{selectedScriptsLabel}</p>
        </div>
        <button onClick={onClose} className="btn-ghost p-2 rounded-full"><X size={18} /></button>
      </div>

      <div className="p-5 space-y-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            ['includeCover', 'Capa'],
            ['includeObjective', 'Objetivo'],
            ['includeScripts', 'Roteiros'],
            ['includeComments', 'Comentários'],
          ].map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm">
              <input
                type="checkbox"
                checked={Boolean(options[key as keyof ExportOptions])}
                onChange={event => onChange({ ...options, [key]: event.target.checked })}
                className="accent-dbe-blue"
              />
              {label}
            </label>
          ))}
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Roteiros selecionados</p>
            <button onClick={onAllScripts} className="text-xs text-dbe-blue hover:text-white">Todos</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-56 overflow-y-auto">
            {data.scripts.map((script, index) => (
              <label key={script.id} className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm">
                <input
                  type="checkbox"
                  checked={options.scriptIds.length === 0 || options.scriptIds.includes(script.id)}
                  onChange={() => onToggleScript(script.id)}
                  className="accent-dbe-blue"
                />
                <span className="truncate">{index + 1}. {script.title || 'Sem título'}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="p-5 border-t border-zinc-800 bg-zinc-950/50 flex flex-wrap justify-end gap-2">
        <button onClick={onHtml} className="btn-secondary">
          <Download size={16} />
          HTML
        </button>
        <button onClick={onDocx} className="btn-secondary">
          <FileText size={16} />
          DOCX
        </button>
        <button onClick={onPdf} className="btn-primary">
          <Printer size={16} />
          PDF
        </button>
      </div>
    </div>
  </div>
);

export default ViewPresentation;
