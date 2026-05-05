import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStorage } from '../hooks/useStorage';
import { useToast } from '../components/Toast';
import type { Presentation, Script } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { 
  ArrowLeft, Save, Plus, Trash2, 
  Copy, Layout, Eye, Settings, GripVertical, FileText
} from 'lucide-react';
import LogoUpload from '../components/LogoUpload';
import PresentationPreview from '../components/PresentationPreview';
import BulkImportModal from '../components/BulkImportModal';
import { motion, AnimatePresence } from 'framer-motion';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';

const Editor: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getPresentation, savePresentation, savePresentationLocal } = useStorage();
  const { showToast } = useToast();
  const hasLoaded = useRef(false);

  const [isLoading, setIsLoading] = useState(!!id);
  const [formData, setFormData] = useState<Presentation>({
    id: uuidv4(),
    clientName: '',
    clientSegment: '',
    title: '',
    objective: '',
    format: '',
    responsible: '',
    date: new Date().toLocaleDateString('pt-BR'),
    scripts: [],
    createdAt: new Date().toISOString(),
  });

  const [activeTab, setActiveTab] = useState<'dados' | 'roteiros'>('dados');
  const [showPreview, setShowPreview] = useState(true);
  const [showBulkImport, setShowBulkImport] = useState(false);

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (id && !hasLoaded.current) {
      const existing = getPresentation(id);
      if (existing) {
        setFormData(existing);
        hasLoaded.current = true;
        setIsLoading(false);
      } else if (getPresentation.length > 0) {
        // Se a lista já carregou e não achou, para de carregar
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, [id, getPresentation]);

  // Auto-save debounce effect
  useEffect(() => {
    if (!hasLoaded.current || isLoading) return; // Only auto-save after initial load

    const timer = setTimeout(() => {
      setIsSaving(true);
      savePresentationLocal(formData);
      setTimeout(() => setIsSaving(false), 800); // Visual cue duration
    }, 1500);

    return () => clearTimeout(timer);
  }, [formData, savePresentationLocal, isLoading]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-dbe-darker">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-dbe-blue"></div>
      </div>
    );
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    if (!formData.clientName || !formData.title) {
      showToast('Nome do cliente e título são obrigatórios', 'error');
      return;
    }
    savePresentation(formData);
    showToast('Salvo localmente. Sincronização enviada!', 'success');
    if (!id) navigate(`/editar/${formData.id}`);
  };

  const addScript = () => {
    const newScript: Script = {
      id: uuidv4(),
      title: '',
      theme: '',
      audience: '',
      tone: '',
      hook: '',
      development: '',
      cta: '',
      notes: '',
      referenceLink: '',
    };
    setFormData(prev => ({
      ...prev,
      scripts: [...prev.scripts, newScript]
    }));
    setActiveTab('roteiros');
    showToast('Roteiro adicionado', 'info');
  };

  const updateScript = (scriptId: string, updates: Partial<Script>) => {
    setFormData(prev => ({
      ...prev,
      scripts: prev.scripts.map(s => s.id === scriptId ? { ...s, ...updates } : s)
    }));
  };

  const deleteScript = (scriptId: string) => {
    setFormData(prev => ({
      ...prev,
      scripts: prev.scripts.filter(s => s.id !== scriptId)
    }));
    showToast('Roteiro removido', 'info');
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;

    if (sourceIndex === destinationIndex) return;

    setFormData(prev => {
      const newScripts = Array.from(prev.scripts);
      const [movedScript] = newScripts.splice(sourceIndex, 1);
      newScripts.splice(destinationIndex, 0, movedScript);
      return { ...prev, scripts: newScripts };
    });
  };

  const duplicateScript = (script: Script) => {
    const duplicated: Script = { ...script, id: uuidv4(), title: `${script.title} (Cópia)` };
    setFormData(prev => ({ ...prev, scripts: [...prev.scripts, duplicated] }));
    showToast('Roteiro duplicado', 'info');
  };

  const handleBulkImport = (newScripts: Script[]) => {
    setFormData(prev => ({
      ...prev,
      scripts: [...prev.scripts, ...newScripts]
    }));
    showToast(`${newScripts.length} roteiros importados com sucesso!`, 'success');
  };

  return (
    <div className="flex flex-col h-screen bg-dbe-darker">
      {/* Header */}
      <header className="h-16 border-b border-zinc-800 flex items-center justify-between px-6 bg-dbe-dark shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="btn-ghost">
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-bold hidden md:block">
            {id ? 'Editar Apresentação' : 'Nova Apresentação'}
          </h1>
          {isSaving && (
            <span className="text-xs font-bold text-dbe-blue ml-2 animate-pulse bg-dbe-blue/10 px-2 py-1 rounded">
              Salvando...
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowPreview(!showPreview)} 
            className={`btn-secondary hidden lg:flex ${showPreview ? 'bg-dbe-blue/20 text-dbe-blue' : ''}`}
          >
            <Eye size={18} />
            Preview
          </button>
          <button onClick={() => navigate(`/visualizar/${formData.id}`)} className="btn-secondary" disabled={!id}>
            <Layout size={18} />
            Visualizar
          </button>
          <button onClick={handleSave} className="btn-primary">
            <Save size={18} />
            Salvar
          </button>
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden">
        {/* Sidebar / Form */}
        <div className={`flex flex-col w-full lg:w-[450px] border-r border-zinc-800 bg-dbe-dark shrink-0 ${showPreview ? 'hidden lg:flex' : 'flex'}`}>
          <div className="flex border-b border-zinc-800">
            <button 
              onClick={() => setActiveTab('dados')}
              className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-colors ${activeTab === 'dados' ? 'text-dbe-blue border-b-2 border-dbe-blue' : 'text-zinc-500'}`}
            >
              Dados Gerais
            </button>
            <button 
              onClick={() => setActiveTab('roteiros')}
              className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-colors ${activeTab === 'roteiros' ? 'text-dbe-blue border-b-2 border-dbe-blue' : 'text-zinc-500'}`}
            >
              Roteiros ({formData.scripts.length})
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
            {activeTab === 'dados' ? (
              <div className="space-y-6">
                <div className="space-y-4">
                  <label className="label">Logo do Cliente (Opcional)</label>
                  <LogoUpload 
                    label="Subir Logo Cliente" 
                    value={formData.clientLogo || ''} 
                    onChange={(val) => setFormData(p => ({ ...p, clientLogo: val }))} 
                  />
                </div>

                <div className="space-y-4">
                  <div className="group">
                    <label className="label">Nome do Cliente</label>
                    <input 
                      name="clientName"
                      value={formData.clientName}
                      onChange={handleInputChange}
                      className="input-field"
                      placeholder="Ex: Coca-Cola"
                    />
                  </div>
                  <div className="group">
                    <label className="label">Segmento</label>
                    <input 
                      name="clientSegment"
                      value={formData.clientSegment}
                      onChange={handleInputChange}
                      className="input-field"
                      placeholder="Ex: Bebidas / Varejo"
                    />
                  </div>
                  <div className="group">
                    <label className="label">Título da Apresentação</label>
                    <input 
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      className="input-field"
                      placeholder="Ex: Campanha Verão 2026"
                    />
                  </div>
                  <div className="group">
                    <label className="label">Objetivo da Campanha</label>
                    <textarea 
                      name="objective"
                      value={formData.objective}
                      onChange={handleInputChange}
                      className="input-field min-h-[100px]"
                      placeholder="Qual o objetivo principal?"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="group">
                      <label className="label">Formato</label>
                      <input 
                        name="format"
                        value={formData.format}
                        onChange={handleInputChange}
                        className="input-field"
                        placeholder="Ex: Reels"
                      />
                    </div>
                    <div className="group">
                      <label className="label">Data</label>
                      <input 
                        name="date"
                        value={formData.date}
                        onChange={handleInputChange}
                        className="input-field"
                      />
                    </div>
                  </div>
                  <div className="group">
                    <label className="label">Responsável DBE</label>
                    <input 
                      name="responsible"
                      value={formData.responsible}
                      onChange={handleInputChange}
                      className="input-field"
                      placeholder="Nome do consultor"
                    />
                  </div>
                  <div className="group">
                    <label className="label">Cor do Cliente (Primária)</label>
                    <div className="flex gap-3">
                      <input 
                        type="color"
                        name="primaryColor"
                        value={formData.primaryColor || '#0047FF'}
                        onChange={handleInputChange}
                        className="h-10 w-20 bg-transparent border-none cursor-pointer"
                      />
                      <input 
                        type="text"
                        name="primaryColor"
                        value={formData.primaryColor || '#0047FF'}
                        onChange={handleInputChange}
                        className="input-field flex-1"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <button onClick={addScript} className="btn-secondary w-full py-3 border-dashed border-2 border-zinc-800 bg-transparent hover:bg-zinc-900">
                  <Plus size={18} />
                  Adicionar Roteiro
                </button>

                <DragDropContext onDragEnd={onDragEnd}>
                  <Droppable droppableId="scripts-list">
                    {(provided) => (
                      <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                        <AnimatePresence>
                          {formData.scripts.map((script, index) => (
                            <Draggable key={script.id} draggableId={script.id} index={index}>
                              {(provided, snapshot) => (
                                <motion.div 
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  className={`card p-4 border-zinc-700 space-y-4 ${snapshot.isDragging ? 'shadow-2xl border-dbe-blue/50 ring-2 ring-dbe-blue/20 bg-zinc-900/90 backdrop-blur-xl' : ''}`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <div 
                                        {...provided.dragHandleProps}
                                        className="cursor-grab active:cursor-grabbing p-1 hover:bg-zinc-800 rounded text-zinc-500"
                                      >
                                        <GripVertical size={16} />
                                      </div>
                                      <span className="text-xs font-bold bg-zinc-800 px-2 py-1 rounded text-zinc-400">#{index + 1}</span>
                                    </div>
                                    <div className="flex gap-1">
                                      <button onClick={() => duplicateScript(script)} className="btn-ghost p-1"><Copy size={14} /></button>
                                      <button onClick={() => deleteScript(script.id)} className="btn-ghost p-1 hover:text-red-500"><Trash2 size={14} /></button>
                                    </div>
                                  </div>

                                  <div className="space-y-3">
                                    <input 
                                      placeholder="Título do roteiro" 
                                      className="input-field py-1 px-2 text-sm font-bold"
                                      value={script.title}
                                      onChange={(e) => updateScript(script.id, { title: e.target.value })}
                                    />
                                    <div className="grid grid-cols-2 gap-2">
                                      <input 
                                        placeholder="Tema" 
                                        className="input-field py-1 px-2 text-xs"
                                        value={script.theme}
                                        onChange={(e) => updateScript(script.id, { theme: e.target.value })}
                                      />
                                      <input 
                                        placeholder="Tonalidade" 
                                        className="input-field py-1 px-2 text-xs"
                                        value={script.tone}
                                        onChange={(e) => updateScript(script.id, { tone: e.target.value })}
                                      />
                                    </div>
                                    <textarea 
                                      placeholder="Gancho (Hook)" 
                                      className="input-field text-xs min-h-[60px]"
                                      value={script.hook}
                                      onChange={(e) => updateScript(script.id, { hook: e.target.value })}
                                    />
                                    <textarea 
                                      placeholder="Desenvolvimento" 
                                      className="input-field text-xs min-h-[80px]"
                                      value={script.development}
                                      onChange={(e) => updateScript(script.id, { development: e.target.value })}
                                    />
                                    <input 
                                      placeholder="CTA" 
                                      className="input-field py-1 px-2 text-xs font-bold"
                                      value={script.cta}
                                      onChange={(e) => updateScript(script.id, { cta: e.target.value })}
                                    />
                                    <textarea 
                                      placeholder="Observações de gravação" 
                                      className="input-field text-xs min-h-[40px] italic"
                                      value={script.notes}
                                      onChange={(e) => updateScript(script.id, { notes: e.target.value })}
                                    />
                                    <input 
                                      placeholder="Link de Referência (Opcional)" 
                                      className="input-field py-1 px-2 text-xs"
                                      value={script.referenceLink || ''}
                                      onChange={(e) => updateScript(script.id, { referenceLink: e.target.value })}
                                    />
                                  </div>
                                </motion.div>
                              )}
                            </Draggable>
                          ))}
                        </AnimatePresence>
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
                
                {formData.scripts.length > 0 && (
                  <div className="flex gap-2">
                    <button onClick={addScript} className="btn-secondary flex-1 py-3">
                      <Plus size={18} />
                      Adicionar Outro Roteiro
                    </button>
                    <button onClick={() => setShowBulkImport(true)} className="btn-secondary py-3 px-4" title="Importação em Massa">
                      <FileText size={18} />
                    </button>
                  </div>
                )}
                {formData.scripts.length === 0 && (
                  <div className="flex justify-end">
                     <button onClick={() => setShowBulkImport(true)} className="btn-ghost flex items-center gap-2 text-dbe-blue text-xs uppercase tracking-wider">
                      <FileText size={14} /> Importar em massa
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Preview Area */}
        <div className={`flex-1 bg-zinc-900 overflow-y-auto relative ${showPreview ? 'block' : 'hidden lg:block'}`}>
          <div className="sticky top-4 right-4 z-10 flex justify-end p-4 pointer-events-none">
            <div className="bg-dbe-blue/90 text-white px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm pointer-events-auto">
              MODO PREVIEW REAL-TIME
            </div>
          </div>
          <PresentationPreview data={formData} />
          
          <button 
            onClick={() => setShowPreview(false)}
            className="lg:hidden fixed bottom-6 right-6 w-14 h-14 bg-dbe-blue rounded-full shadow-2xl flex items-center justify-center text-white"
          >
            <Settings size={24} />
          </button>
        </div>
      </main>

      <BulkImportModal 
        isOpen={showBulkImport} 
        onClose={() => setShowBulkImport(false)} 
        onImport={handleBulkImport} 
      />
    </div>
  );
};

export default Editor;
