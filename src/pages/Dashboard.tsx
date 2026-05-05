import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStorage } from '../hooks/useStorage';
import { useToast } from '../components/Toast';
import { Plus, Edit2, Copy, Trash2, Eye, Search, FileText, Monitor, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import DBELogo from '../components/DBELogo';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { presentations, deletePresentation, duplicatePresentation, isLoading } = useStorage();
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
            <p className="text-zinc-400">Gerencie seus roteiros profissionais.</p>
            {isLoading && (
              <span className="flex items-center gap-2 text-xs text-dbe-blue font-bold animate-pulse">
                <div className="w-2 h-2 bg-dbe-blue rounded-full"></div>
                Sincronizando com a nuvem...
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => navigate('/teleprompter-rapido')} className="btn-secondary hidden sm:flex border border-dbe-blue/30 text-dbe-blue hover:bg-dbe-blue/10">
            <Zap size={18} fill="currentColor" />
            Teleprompter Rápido
          </button>
          <button onClick={() => navigate('/teleprompter')} className="btn-secondary hidden sm:flex">
            <Monitor size={18} />
            Teleprompter
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

      {isLoading && filtered.length === 0 ? (
        <div className="text-center py-20 card bg-zinc-900/50">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-dbe-blue mx-auto mb-4"></div>
          <p className="text-zinc-400 text-lg">Carregando apresentações da nuvem...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 card bg-zinc-900/50">
          <FileText size={48} className="mx-auto mb-4 text-zinc-700" />
          <p className="text-zinc-500 text-lg">Nenhuma apresentação encontrada.</p>
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
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-dbe-green mb-1 block">
                      {presentation.clientSegment || 'Geral'}
                    </span>
                    <h3 className="text-xl font-bold text-white group-hover:text-dbe-blue transition-colors">
                      {presentation.clientName}
                    </h3>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => navigate(`/teleprompter/${presentation.id}`)} 
                      className="btn-ghost p-2"
                      title="Abrir no Teleprompter"
                    >
                      <Monitor size={18} />
                    </button>
                    <button 
                      onClick={() => navigate(`/visualizar/${presentation.id}`)} 
                      className="btn-ghost p-2 text-dbe-blue"
                      title="Visualizar"
                    >
                      <Eye size={18} />
                    </button>
                    <button 
                      onClick={() => handleDuplicate(presentation.id)}
                      className="btn-ghost" 
                      title="Duplicar"
                    >
                      <Copy size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(presentation.id, presentation.clientName)}
                      className="btn-ghost hover:text-red-400" 
                      title="Excluir"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                
                <p className="text-zinc-400 text-sm mb-6 line-clamp-2">
                  {presentation.title}
                </p>

                <div className="flex items-center justify-between mt-auto">
                  <span className="text-xs text-zinc-500">
                    {new Date(presentation.createdAt).toLocaleDateString('pt-BR')}
                  </span>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => navigate(`/visualizar/${presentation.id}`)}
                      className="btn-secondary py-1.5 px-3 text-xs"
                    >
                      <Eye size={14} />
                      Visualizar
                    </button>
                    <button 
                      onClick={() => navigate(`/editar/${presentation.id}`)}
                      className="btn-primary py-1.5 px-3 text-xs"
                    >
                      <Edit2 size={14} />
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
