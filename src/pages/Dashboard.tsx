import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStorage } from '../hooks/useStorage';
import { useToast } from '../components/Toast';
import { Plus, Edit2, Copy, Trash2, Eye, Search, FileText, Monitor, Zap, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import DBELogo from '../components/DBELogo';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { presentations, deletePresentation, duplicatePresentation, isLoading, syncError, refresh, manualRefresh } = useStorage();
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = presentations.filter(p => 
    p.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.title.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Tem certeza que deseja excluir a apresentação para "${name}"?`)) {
      deletePresentation(id);
      showToast('Apresentação excluída com sucesso', 'success');
    }
  };

  const handleDuplicate = (id: string) => {
    const newId = duplicatePresentation(id);
    if (newId) {
      showToast('Apresentação duplicada com sucesso', 'success');
    }
  };

  return (
    <div className="min-h-screen p-6 md:p-12 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <DBELogo className="h-16 mb-4" />
          <div className="flex items-center gap-3">
            <p className="text-zinc-400 text-sm">Gerencie seus roteiros profissionais.</p>
            <div className="flex items-center gap-2">
              {isLoading && (
                <span className="flex items-center gap-1.5 text-xs text-dbe-blue font-bold animate-pulse">
                  <div className="w-2 h-2 bg-dbe-blue rounded-full"></div>
                  Sincronizando...
                </span>
              )}
              {!isLoading && (
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
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => navigate('/teleprompter-rapido')} className="btn-secondary flex border border-dbe-blue/30 text-dbe-blue hover:bg-dbe-blue/10 text-sm px-3 py-2">
            <Zap size={16} fill="currentColor" />
            <span className="hidden sm:inline">Teleprompter Rápido</span>
            <span className="sm:hidden">Rápido</span>
          </button>
          <button onClick={() => navigate('/teleprompter')} className="btn-secondary flex text-sm px-3 py-2">
            <Monitor size={16} />
            <span className="hidden sm:inline">Teleprompter</span>
          </button>
          <button 
            onClick={() => navigate('/novo')}
            className="btn-primary"
          >
            <Plus size={20} />
            Nova Apresentação
          </button>
        </div>
      </header>

      {syncError && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-red-400 uppercase tracking-wider">Erro de sincronização</p>
            <p className="text-xs text-zinc-400 mt-0.5 truncate max-w-xs">{syncError}</p>
          </div>
          <button 
            onClick={() => manualRefresh()} 
            className="flex items-center gap-1.5 text-xs font-bold text-red-400 hover:text-white bg-red-500/20 hover:bg-red-500/40 px-3 py-1.5 rounded-lg transition-all shrink-0"
          >
            <RefreshCw size={12} />
            Tentar novamente
          </button>
        </div>
      )}

      <div className="mb-8 relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
        <input 
          type="text" 
          placeholder="Buscar por cliente ou título..." 
          className="input-field pl-12 py-3"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {isLoading && presentations.length === 0 ? (
        <div className="text-center py-20 card bg-zinc-900/50">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-dbe-blue mx-auto mb-4"></div>
          <p className="text-zinc-400 text-lg">Carregando apresentações da nuvem...</p>
        </div>
      ) : !isLoading && filtered.length === 0 ? (
        <div className="text-center py-20 card bg-zinc-900/50 space-y-4">
          <FileText size={48} className="mx-auto text-zinc-700" />
          {presentations.length === 0 ? (
            <>
              <p className="text-zinc-400 text-lg font-semibold">Nenhuma apresentação na nuvem</p>
              <p className="text-zinc-600 text-sm">Crie sua primeira apresentação ou verifique a conexão com a nuvem.</p>
              <button onClick={() => refresh()} className="btn-secondary mx-auto">
                <RefreshCw size={16} />
                Sincronizar Novamente
              </button>
            </>
          ) : (
            <p className="text-zinc-500 text-lg">Nenhuma apresentação encontrada para "{searchTerm}".</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((presentation, index) => (
            <motion.div 
              key={presentation.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="card group"
            >
              <div className="p-5">
                <div className="mb-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-dbe-green mb-1 block">
                    {presentation.clientSegment || 'Geral'}
                  </span>
                  <h3 className="text-lg font-bold text-white group-hover:text-dbe-blue transition-colors leading-tight">
                    {presentation.clientName}
                  </h3>
                  <p className="text-zinc-400 text-sm mt-1 line-clamp-2">
                    {presentation.title}
                  </p>
                </div>

                {/* Action buttons - always visible */}
                <div className="flex items-center gap-1 mb-4">
                  <button 
                    onClick={() => navigate(`/teleprompter/${presentation.id}`)} 
                    className="btn-ghost p-2 rounded-lg border border-zinc-800 flex-1 flex items-center justify-center gap-1 text-xs"
                    title="Abrir no Teleprompter"
                  >
                    <Monitor size={14} />
                    <span className="hidden sm:inline">Prompter</span>
                  </button>
                  <button 
                    onClick={() => navigate(`/visualizar/${presentation.id}`)} 
                    className="btn-ghost p-2 rounded-lg border border-zinc-800 flex-1 flex items-center justify-center gap-1 text-xs text-dbe-blue"
                    title="Visualizar"
                  >
                    <Eye size={14} />
                    <span className="hidden sm:inline">Ver</span>
                  </button>
                  <button 
                    onClick={() => handleDuplicate(presentation.id)}
                    className="btn-ghost p-2 rounded-lg border border-zinc-800 flex-1 flex items-center justify-center gap-1 text-xs" 
                    title="Duplicar"
                  >
                    <Copy size={14} />
                  </button>
                  <button 
                    onClick={() => handleDelete(presentation.id, presentation.clientName)}
                    className="btn-ghost p-2 rounded-lg border border-zinc-800 flex-1 flex items-center justify-center gap-1 text-xs hover:text-red-400 hover:border-red-400/30" 
                    title="Excluir"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-600">
                    {new Date(presentation.createdAt).toLocaleDateString('pt-BR')}
                  </span>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => navigate(`/visualizar/${presentation.id}`)}
                      className="btn-secondary py-1.5 px-3 text-xs"
                    >
                      <Eye size={13} />
                      Visualizar
                    </button>
                    <button 
                      onClick={() => navigate(`/editar/${presentation.id}`)}
                      className="btn-primary py-1.5 px-3 text-xs"
                    >
                      <Edit2 size={13} />
                      Editar
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <footer className="mt-20 text-center text-zinc-600 text-sm">
        <p>DBE — Dos Bastidores ao Espetáculo</p>
      </footer>
    </div>
  );
};

export default Dashboard;
