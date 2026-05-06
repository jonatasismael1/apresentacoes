import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStorage } from '../hooks/useStorage';
import { useToast } from '../components/toastContext';
import {
  Archive,
  ArchiveRestore,
  Copy,
  Edit2,
  Eye,
  FileText,
  List,
  Monitor,
  Plus,
  RefreshCw,
  Search,
  Table2,
  Trash2,
  Undo2,
  Zap,
} from 'lucide-react';
import { motion } from 'framer-motion';
import DBELogo from '../components/DBELogo';
import type { ApprovalStatus, Presentation, SyncStatus } from '../types';
import { PRESENTATION_STATUSES, PRESENTATION_STATUS_LABELS } from '../constants/presentationStatus';

type ViewMode = 'cards' | 'table';
type DashboardTab = 'active' | 'archived';

const SYNC_LABELS: Record<SyncStatus, string> = {
  local: 'Local',
  syncing: 'Sincronizando',
  synced: 'Sincronizado',
  pending: 'Pendente',
  error: 'Erro',
};

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const {
    presentations,
    archivePresentation,
    restorePresentation,
    deletePresentation,
    duplicatePresentation,
    updateApprovalStatus,
    isLoading,
    syncError,
    syncStatusById,
    refresh,
    manualRefresh,
  } = useStorage();
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [clientFilter, setClientFilter] = useState('all');
  const [tab, setTab] = useState<DashboardTab>('active');
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [pendingArchive, setPendingArchive] = useState<Presentation | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<Presentation | null>(null);

  const clients = useMemo(() => (
    Array.from(new Set(presentations.map(item => item.clientName).filter(Boolean))).sort()
  ), [presentations]);

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return presentations
      .filter(item => tab === 'archived' ? Boolean(item.archivedAt) : !item.archivedAt)
      .filter(item => clientFilter === 'all' || item.clientName === clientFilter)
      .filter(item => {
        if (!term) return true;
        const haystack = [
          item.clientName,
          item.title,
          item.clientSegment,
          item.responsible,
          item.objective,
          ...item.scripts.flatMap(script => [script.title, script.theme, script.tone, script.cta]),
        ].join(' ').toLowerCase();
        return haystack.includes(term);
      })
      .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
  }, [presentations, searchTerm, clientFilter, tab]);

  const handleArchive = (presentation: Presentation) => {
    archivePresentation(presentation.id);
    setPendingArchive(presentation);
    showToast('Apresentação arquivada.', 'info');
  };

  const handleUndoArchive = () => {
    if (!pendingArchive) return;
    restorePresentation(pendingArchive.id);
    setPendingArchive(null);
    showToast('Apresentação restaurada.', 'success');
  };

  const handleDuplicate = (id: string) => {
    const newId = duplicatePresentation(id);
    if (newId) {
      showToast('Apresentação duplicada.', 'success');
    }
  };

  const handleDeletePermanently = () => {
    if (!deleteCandidate) return;
    deletePresentation(deleteCandidate.id);
    showToast('Apresentação excluída definitivamente.', 'success');
    setDeleteCandidate(null);
  };

  return (
    <div className="min-h-screen p-3 md:p-10 max-w-7xl mx-auto">
      <header className="flex flex-col xl:flex-row xl:items-end justify-between gap-4 mb-5 md:mb-8">
        <div>
          <DBELogo className="h-11 md:h-16 mb-3 md:mb-4" />
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-zinc-400 text-sm">Gerencie roteiros, clientes e entregas.</p>
            {isLoading ? (
              <span className="flex items-center gap-1.5 text-xs text-dbe-blue font-bold animate-pulse">
                <span className="w-2 h-2 bg-dbe-blue rounded-full" />
                Sincronizando...
              </span>
            ) : (
              <button
                onClick={() => manualRefresh()}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-dbe-blue hover:bg-dbe-blue/10 transition-all"
                title="Forçar sincronização com a nuvem"
              >
                <RefreshCw size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <button onClick={() => navigate('/teleprompter-rapido')} className="btn-secondary border border-dbe-blue/30 text-dbe-blue hover:bg-dbe-blue/10 text-sm px-3 py-2">
            <Zap size={16} fill="currentColor" />
            <span className="hidden sm:inline">Teleprompter rápido</span>
            <span className="sm:hidden">Rápido</span>
          </button>
          <button onClick={() => navigate('/teleprompter')} className="btn-secondary text-sm px-3 py-2">
            <Monitor size={16} />
            <span className="hidden sm:inline">Teleprompter</span>
          </button>
          <button onClick={() => navigate('/novo')} className="btn-primary">
            <Plus size={20} />
            Nova apresentação
          </button>
        </div>
      </header>

      {syncError && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-red-400 uppercase tracking-wider">Erro de sincronização</p>
            <p className="text-xs text-zinc-400 mt-0.5 truncate max-w-xs">{syncError}</p>
          </div>
          <button onClick={() => manualRefresh()} className="flex items-center gap-1.5 text-xs font-bold text-red-400 hover:text-white bg-red-500/20 hover:bg-red-500/40 px-3 py-1.5 rounded-lg transition-all shrink-0">
            <RefreshCw size={12} />
            Tentar novamente
          </button>
        </div>
      )}

      {pendingArchive && (
        <div className="mb-4 p-3 bg-dbe-blue/10 border border-dbe-blue/30 rounded-xl flex items-center justify-between gap-3">
          <p className="text-sm text-zinc-300">"{pendingArchive.clientName}" foi arquivada.</p>
          <button onClick={handleUndoArchive} className="btn-secondary text-xs">
            <Undo2 size={14} />
            Desfazer
          </button>
        </div>
      )}

      <section className="mb-6 grid grid-cols-1 lg:grid-cols-[1fr_auto_auto] gap-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
          <input
            type="text"
            placeholder="Buscar por cliente, título, CTA, tema, responsável..."
            className="input-field pl-12 py-3"
            value={searchTerm}
            onChange={event => setSearchTerm(event.target.value)}
          />
        </div>
        <select value={clientFilter} onChange={event => setClientFilter(event.target.value)} className="input-field lg:w-56">
          <option value="all">Todos os clientes</option>
          {clients.map(client => <option key={client} value={client}>{client}</option>)}
        </select>
        <div className="flex gap-2">
          <button onClick={() => setViewMode('cards')} className={`btn-secondary px-3 ${viewMode === 'cards' ? 'text-dbe-blue bg-dbe-blue/10' : ''}`} title="Cards">
            <List size={16} />
          </button>
          <button onClick={() => setViewMode('table')} className={`btn-secondary px-3 ${viewMode === 'table' ? 'text-dbe-blue bg-dbe-blue/10' : ''}`} title="Tabela">
            <Table2 size={16} />
          </button>
        </div>
      </section>

      <div className="mb-6 flex gap-2">
        <button onClick={() => setTab('active')} className={`btn-secondary text-sm ${tab === 'active' ? 'text-dbe-blue bg-dbe-blue/10' : ''}`}>
          Ativas ({presentations.filter(item => !item.archivedAt).length})
        </button>
        <button onClick={() => setTab('archived')} className={`btn-secondary text-sm ${tab === 'archived' ? 'text-dbe-blue bg-dbe-blue/10' : ''}`}>
          Arquivadas ({presentations.filter(item => item.archivedAt).length})
        </button>
      </div>

      {isLoading && presentations.length === 0 ? (
        <EmptyState title="Carregando apresentações da nuvem..." loading />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={tab === 'archived' ? 'Nenhuma apresentação arquivada' : 'Nenhuma apresentação encontrada'}
          description={presentations.length === 0 ? 'Crie sua primeira apresentação ou sincronize novamente.' : 'Ajuste o cliente selecionado ou a busca.'}
          onRefresh={() => refresh()}
        />
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((presentation, index) => (
            <PresentationCard
              key={presentation.id}
              presentation={presentation}
              index={index}
              syncStatus={syncStatusById[presentation.id]}
              onView={() => navigate(`/visualizar/${presentation.id}`)}
              onEdit={() => navigate(`/editar/${presentation.id}`)}
              onTeleprompter={() => navigate(`/teleprompter/${presentation.id}`)}
              onDuplicate={() => handleDuplicate(presentation.id)}
              onStatusChange={status => updateApprovalStatus(presentation.id, status)}
              onArchive={() => handleArchive(presentation)}
              onRestore={() => restorePresentation(presentation.id)}
              onDelete={() => setDeleteCandidate(presentation)}
            />
          ))}
        </div>
      ) : (
        <PresentationTable
          presentations={filtered}
          syncStatusById={syncStatusById}
          onView={presentation => navigate(`/visualizar/${presentation.id}`)}
          onEdit={presentation => navigate(`/editar/${presentation.id}`)}
          onArchive={handleArchive}
          onRestore={presentation => restorePresentation(presentation.id)}
        />
      )}

      <footer className="mt-20 text-center text-zinc-600 text-sm">
        <p>DBE - Dos Bastidores ao Espetáculo</p>
      </footer>

      {deleteCandidate && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-red-500/30 rounded-2xl p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white">Excluir definitivamente?</h2>
            <p className="text-sm text-zinc-400 mt-2">
              Esta ação remove "{deleteCandidate.clientName}" da lista local e envia a exclusão para a nuvem.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setDeleteCandidate(null)} className="btn-secondary">Cancelar</button>
              <button onClick={handleDeletePermanently} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2">
                <Trash2 size={16} />
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function EmptyState({ title, description, loading, onRefresh }: { title: string; description?: string; loading?: boolean; onRefresh?: () => void }) {
  return (
    <div className="text-center py-20 card bg-zinc-900/50 space-y-4">
      {loading ? (
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-dbe-blue mx-auto" />
      ) : (
        <FileText size={48} className="mx-auto text-zinc-700" />
      )}
      <p className="text-zinc-400 text-lg font-semibold">{title}</p>
      {description && <p className="text-zinc-600 text-sm">{description}</p>}
      {onRefresh && (
        <button onClick={onRefresh} className="btn-secondary mx-auto">
          <RefreshCw size={16} />
          Sincronizar novamente
        </button>
      )}
    </div>
  );
}

interface PresentationCardProps {
  presentation: Presentation;
  index: number;
  syncStatus?: SyncStatus;
  onView: () => void;
  onEdit: () => void;
  onTeleprompter: () => void;
  onDuplicate: () => void;
  onStatusChange: (status: ApprovalStatus) => void;
  onArchive: () => void;
  onRestore: () => void;
  onDelete: () => void;
}

function PresentationCard({
  presentation,
  index,
  syncStatus,
  onView,
  onEdit,
  onTeleprompter,
  onDuplicate,
  onStatusChange,
  onArchive,
  onRestore,
  onDelete,
}: PresentationCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="card group"
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-dbe-green mb-1 block">
              {presentation.clientSegment || 'Geral'}
            </span>
            <h3 className="text-lg font-bold text-white group-hover:text-dbe-blue transition-colors leading-tight">
              {presentation.clientName}
            </h3>
            <p className="text-zinc-400 text-sm mt-1 line-clamp-2">{presentation.title}</p>
          </div>
          <StatusBadges presentation={presentation} syncStatus={syncStatus} />
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs text-zinc-500 mb-4">
          <Metric label="Roteiros" value={String(presentation.scripts.length)} />
          <Metric label="Atualizado" value={formatDate(presentation.updatedAt || presentation.createdAt)} />
          <Metric label="Criado" value={formatDate(presentation.createdAt)} />
        </div>

        <label className="block mb-3">
          <span className="text-[10px] uppercase tracking-wider text-zinc-600 font-bold">Status</span>
          <select
            value={presentation.approvalStatus || 'sent'}
            onChange={event => onStatusChange(event.target.value as ApprovalStatus)}
            className="input-field mt-1 py-2 text-xs"
          >
            {PRESENTATION_STATUSES.map(status => (
              <option key={status.value} value={status.value}>{status.label}</option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <button onClick={onView} className="btn-secondary py-2 text-xs">
            <Eye size={14} />
            Visualizar
          </button>
          <button onClick={onEdit} className="btn-primary py-2 text-xs">
            <Edit2 size={14} />
            Editar
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button onClick={onTeleprompter} className="btn-ghost px-2 py-2 border border-zinc-800 text-[11px]" title="Teleprompter">
            <Monitor size={14} />
            <span>Teleprompter</span>
          </button>
          <button onClick={onDuplicate} className="btn-ghost px-2 py-2 border border-zinc-800 text-[11px]" title="Duplicar">
            <Copy size={14} />
            <span>Duplicar</span>
          </button>
          {presentation.archivedAt ? (
            <>
              <button onClick={onRestore} className="btn-ghost px-2 py-2 border border-zinc-800 text-[11px] text-dbe-green" title="Restaurar">
                <ArchiveRestore size={14} />
                <span>Restaurar</span>
              </button>
              <button onClick={onDelete} className="btn-ghost px-2 py-2 border border-zinc-800 text-[11px] hover:text-red-400" title="Excluir definitivamente">
                <Trash2 size={14} />
                <span>Excluir</span>
              </button>
            </>
          ) : (
            <>
              <button onClick={onDelete} className="btn-ghost px-2 py-2 border border-zinc-800 text-[11px] hover:text-red-400" title="Excluir">
                <Trash2 size={14} />
                <span>Excluir</span>
              </button>
              <button onClick={onArchive} className="btn-ghost px-2 py-2 border border-zinc-800 text-[11px]" title="Arquivar">
                <Archive size={14} />
                <span>Arquivar</span>
              </button>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function PresentationTable({
  presentations,
  syncStatusById,
  onView,
  onEdit,
  onArchive,
  onRestore,
}: {
  presentations: Presentation[];
  syncStatusById: Record<string, SyncStatus>;
  onView: (presentation: Presentation) => void;
  onEdit: (presentation: Presentation) => void;
  onArchive: (presentation: Presentation) => void;
  onRestore: (presentation: Presentation) => void;
}) {
  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-zinc-950/70 text-zinc-500 uppercase text-xs">
          <tr>
            <th className="text-left p-4">Cliente</th>
            <th className="text-left p-4">Título</th>
            <th className="text-left p-4">Segmento</th>
            <th className="text-left p-4">Roteiros</th>
            <th className="text-left p-4">Última edição</th>
            <th className="text-left p-4">Status</th>
            <th className="text-right p-4">Ações</th>
          </tr>
        </thead>
        <tbody>
          {presentations.map(presentation => (
            <tr key={presentation.id} className="border-t border-zinc-800 hover:bg-zinc-900/60">
              <td className="p-4 font-semibold text-white">{presentation.clientName}</td>
              <td className="p-4 text-zinc-300">{presentation.title}</td>
              <td className="p-4 text-zinc-500">{presentation.clientSegment || 'Geral'}</td>
              <td className="p-4 text-zinc-500">{presentation.scripts.length}</td>
              <td className="p-4 text-zinc-500">{formatDate(presentation.updatedAt || presentation.createdAt)}</td>
              <td className="p-4"><StatusBadges presentation={presentation} syncStatus={syncStatusById[presentation.id]} /></td>
              <td className="p-4">
                <div className="flex justify-end gap-1">
                  <button onClick={() => onView(presentation)} className="btn-ghost p-2"><Eye size={14} /></button>
                  <button onClick={() => onEdit(presentation)} className="btn-ghost p-2"><Edit2 size={14} /></button>
                  {presentation.archivedAt
                    ? <button onClick={() => onRestore(presentation)} className="btn-ghost p-2 text-dbe-green"><ArchiveRestore size={14} /></button>
                    : <button onClick={() => onArchive(presentation)} className="btn-ghost p-2"><Archive size={14} /></button>}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadges({ presentation, syncStatus }: { presentation: Presentation; syncStatus?: SyncStatus }) {
  const approval = presentation.approvalStatus || 'sent';
  return (
    <div className="flex flex-col items-end gap-1">
      <span className="text-[10px] px-2 py-1 rounded-full bg-zinc-800 text-zinc-300 font-bold">
        {PRESENTATION_STATUS_LABELS[approval]}
      </span>
      {syncStatus && (
        <span className="text-[10px] px-2 py-1 rounded-full bg-dbe-blue/10 text-dbe-blue font-bold">
          {SYNC_LABELS[syncStatus]}
        </span>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-zinc-950 border border-zinc-800 p-2">
      <p className="text-[10px] uppercase tracking-wider text-zinc-600">{label}</p>
      <p className="text-zinc-300 font-bold mt-1">{value}</p>
    </div>
  );
}

function formatDate(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('pt-BR');
}

export default Dashboard;
