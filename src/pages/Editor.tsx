import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStorage } from '../hooks/useStorage';
import { useToast } from '../components/toastContext';
import type { ApprovalStatus, Presentation, Script } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { 
  ArrowLeft, Save, Plus, Trash2, 
  Copy, Layout, Eye, Settings, GripVertical, FileText, ChevronDown, ChevronRight,
  CheckCircle, AlertTriangle, BookOpen, UserPlus, History
} from 'lucide-react';
import LogoUpload from '../components/LogoUpload';
import PresentationPreview from '../components/PresentationPreview';
import BulkImportModal from '../components/BulkImportModal';
import { motion, AnimatePresence } from 'framer-motion';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { SCRIPT_TEMPLATES } from '../constants/scriptTemplates';
import { PRESENTATION_STATUSES } from '../constants/presentationStatus';

const Editor: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    presentations,
    clientProfiles,
    getPresentation,
    savePresentation,
    savePresentationLocal,
    createClientProfileFromPresentation,
  } = useStorage();
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
    updatedAt: new Date().toISOString(),
    approvalStatus: 'sent',
    comments: [],
    history: [],
  });

  const [activeTab, setActiveTab] = useState<'dados' | 'roteiros'>('dados');
  const [showPreview, setShowPreview] = useState(true);
  const [showBulkImport, setShowBulkImport] = useState(false);

  const [saveState, setSaveState] = useState<'idle' | 'local' | 'syncing' | 'synced'>('idle');
  const [collapsedScripts, setCollapsedScripts] = useState<Set<string>>(new Set());
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [showScriptNav, setShowScriptNav] = useState(false);

  useEffect(() => {
    if (id && !hasLoaded.current) {
      const existing = getPresentation(id);
      if (existing) {
        const loadTimer = window.setTimeout(() => {
          setFormData(existing);
          hasLoaded.current = true;
          setIsLoading(false);
        }, 0);
        return () => window.clearTimeout(loadTimer);
      } else if (presentations.length > 0) {
        // Se a lista já carregou e não achou, para de carregar
        const stopTimer = window.setTimeout(() => setIsLoading(false), 0);
        return () => window.clearTimeout(stopTimer);
      }
    } else {
      const newTimer = window.setTimeout(() => {
        setIsLoading(false);
        hasLoaded.current = true;
      }, 0);
      return () => window.clearTimeout(newTimer);
    }
  }, [id, getPresentation, presentations.length]);

  // Auto-save debounce effect
  useEffect(() => {
    if (!hasLoaded.current || isLoading) return; // Only auto-save after initial load

    const timer = setTimeout(() => {
      setSaveState('local');
      savePresentationLocal(formData);
      setTimeout(() => setSaveState('synced'), 800);
    }, 1500);

    return () => clearTimeout(timer);
  }, [formData, savePresentationLocal, isLoading]);

  const validation = {
    clientName: !formData.clientName.trim(),
    title: !formData.title.trim(),
  };
  const missingFields = [
    validation.clientName ? 'cliente' : '',
    validation.title ? 'título' : '',
    !formData.objective.trim() ? 'objetivo' : '',
    formData.scripts.length === 0 ? 'roteiros' : '',
  ].filter(Boolean);
  const completedItems = 4 - missingFields.length;

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

  const handleStatusChange = (approvalStatus: ApprovalStatus) => {
    setFormData(prev => {
      const next = { ...prev, approvalStatus };
      if (approvalStatus === 'finalized') {
        return { ...next, archivedAt: prev.archivedAt || new Date().toISOString() };
      }

      const { archivedAt: _archivedAt, ...activePresentation } = next;
      void _archivedAt;
      return activePresentation;
    });
  };

  const handleSave = () => {
    if (!formData.clientName || !formData.title) {
      showToast('Nome do cliente e título são obrigatórios', 'error');
      return;
    }
    setSaveState('syncing');
    const saved = savePresentation(formData);
    setFormData(saved);
    setTimeout(() => setSaveState('synced'), 1000);
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

  const addScriptFromTemplate = () => {
    const template = SCRIPT_TEMPLATES.find(item => item.id === selectedTemplateId);
    if (!template) return;
    const newScript: Script = { ...template.script, id: uuidv4() };
    setFormData(prev => ({ ...prev, scripts: [...prev.scripts, newScript] }));
    setSelectedTemplateId('');
    setActiveTab('roteiros');
    showToast(`Template "${template.name}" adicionado`, 'success');
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

  const toggleScriptCollapsed = (scriptId: string) => {
    setCollapsedScripts(prev => {
      const next = new Set(prev);
      if (next.has(scriptId)) next.delete(scriptId);
      else next.add(scriptId);
      return next;
    });
  };

  const applyClientProfile = (profileId: string) => {
    const profile = clientProfiles.find(item => item.id === profileId);
    if (!profile) return;
    setFormData(prev => ({
      ...prev,
      clientProfileId: profile.id,
      clientName: profile.name,
      clientSegment: profile.segment,
      clientLogo: profile.logo || prev.clientLogo,
      primaryColor: profile.primaryColor || prev.primaryColor,
      secondaryColor: profile.secondaryColor || prev.secondaryColor,
    }));
  };

  const saveClientProfile = () => {
    if (!formData.clientName.trim()) {
      showToast('Informe o nome do cliente antes de salvar o perfil.', 'error');
      return;
    }
    const profile = createClientProfileFromPresentation(formData);
    setFormData(prev => ({ ...prev, clientProfileId: profile.id }));
    showToast('Perfil de cliente salvo.', 'success');
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
      <header className="min-h-16 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-2 px-3 py-2 md:px-6 bg-dbe-dark shrink-0">
        <div className="flex min-w-0 items-center gap-2 md:gap-4">
          <button onClick={() => navigate('/')} className="btn-ghost px-2 md:px-4">
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-bold hidden md:block">
            {id ? 'Editar Apresentação' : 'Nova Apresentação'}
          </h1>
          {saveState !== 'idle' && (
            <span className="text-[11px] md:text-xs font-bold text-dbe-blue bg-dbe-blue/10 px-2 py-1 rounded flex items-center gap-1 whitespace-nowrap">
              {saveState === 'synced' ? <CheckCircle size={12} /> : <RefreshDot />}
              {saveState === 'local' && 'Salvo localmente'}
              {saveState === 'syncing' && 'Sincronizando'}
              {saveState === 'synced' && 'Sincronizado'}
            </span>
          )}
        </div>
        
        <div className="flex flex-1 items-center justify-end gap-2 md:gap-3">
          <select
            value={formData.approvalStatus || 'sent'}
            onChange={event => handleStatusChange(event.target.value as ApprovalStatus)}
            className="input-field h-10 max-w-[145px] px-2 py-1 text-xs md:max-w-[180px]"
            aria-label="Status da apresentacao"
          >
            {PRESENTATION_STATUSES.map(status => (
              <option key={status.value} value={status.value}>{status.label}</option>
            ))}
          </select>
          <button onClick={() => setShowBulkImport(true)} className="btn-secondary px-3" title="Importar roteiros">
            <FileText size={18} />
            <span className="hidden sm:inline">Importar</span>
          </button>
          <button 
            onClick={() => setShowPreview(!showPreview)} 
            className={`btn-secondary hidden lg:flex ${showPreview ? 'bg-dbe-blue/20 text-dbe-blue' : ''}`}
          >
            <Eye size={18} />
            Preview
          </button>
          <button onClick={() => navigate(`/visualizar/${formData.id}`)} className="btn-secondary hidden sm:flex" disabled={!id}>
            <Layout size={18} />
            Visualizar
          </button>
          <button onClick={handleSave} className="btn-primary px-3 md:px-4">
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
                <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-sm font-bold">
                      {missingFields.length === 0 ? <CheckCircle size={16} className="text-dbe-green" /> : <AlertTriangle size={16} className="text-yellow-400" />}
                      Progresso da apresentação
                    </div>
                    <span className="text-xs text-zinc-500">{completedItems}/4</span>
                  </div>
                  <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                    <div className="h-full bg-dbe-blue transition-all" style={{ width: `${(completedItems / 4) * 100}%` }} />
                  </div>
                  {missingFields.length > 0 && (
                    <p className="text-xs text-zinc-500 mt-2">Faltando: {missingFields.join(', ')}.</p>
                  )}
                </div>

                <div className="space-y-3">
                  <label className="label">Perfil do cliente</label>
                  <div className="flex gap-2">
                    <select
                      value={formData.clientProfileId || ''}
                      onChange={event => applyClientProfile(event.target.value)}
                      className="input-field flex-1"
                    >
                      <option value="">Selecionar perfil salvo...</option>
                      {clientProfiles.map(profile => (
                        <option key={profile.id} value={profile.id}>{profile.name}</option>
                      ))}
                    </select>
                    <button onClick={saveClientProfile} className="btn-secondary px-3" title="Salvar perfil do cliente">
                      <UserPlus size={16} />
                    </button>
                  </div>
                </div>

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
                      className={`input-field ${validation.clientName ? 'border-red-500/50' : ''}`}
                      placeholder="Ex: Coca-Cola"
                    />
                    {validation.clientName && <p className="text-xs text-red-400 mt-1">Nome do cliente é obrigatório.</p>}
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
                      className={`input-field ${validation.title ? 'border-red-500/50' : ''}`}
                      placeholder="Ex: Campanha Verão 2026"
                    />
                    {validation.title && <p className="text-xs text-red-400 mt-1">Título é obrigatório.</p>}
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
                  {formData.history && formData.history.length > 0 && (
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                      <div className="flex items-center gap-2 text-sm font-bold mb-3">
                        <History size={16} className="text-dbe-blue" />
                        Histórico de versões
                      </div>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {formData.history.slice(0, 6).map(version => (
                          <div key={version.id} className="flex items-center justify-between text-xs border border-zinc-800 rounded-lg p-2">
                            <span className="text-zinc-300">{version.label}</span>
                            <span className="text-zinc-500">{new Date(version.createdAt).toLocaleString('pt-BR')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-bold">
                    <BookOpen size={16} className="text-dbe-blue" />
                    Tipo de conteudo
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={selectedTemplateId}
                      onChange={event => setSelectedTemplateId(event.target.value)}
                      className="input-field flex-1"
                    >
                      <option value="">Escolher tipo...</option>
                      {SCRIPT_TEMPLATES.map(template => (
                        <option key={template.id} value={template.id}>{template.name}</option>
                      ))}
                    </select>
                    <button onClick={addScriptFromTemplate} disabled={!selectedTemplateId} className="btn-secondary px-3">
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                {formData.scripts.length > 0 && (
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">Navegação dos roteiros</p>
                    <button
                      type="button"
                      onClick={() => setShowScriptNav(prev => !prev)}
                      className="mb-2 w-full flex items-center justify-between rounded-lg border border-zinc-800 px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-zinc-400"
                    >
                      <span>{showScriptNav ? 'Ocultar lista' : 'Mostrar lista'}</span>
                      {showScriptNav ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>
                    {showScriptNav && (
                    <div className="space-y-1 max-h-44 overflow-y-auto">
                      {formData.scripts.map((script, index) => (
                        <button
                          key={script.id}
                          onClick={() => toggleScriptCollapsed(script.id)}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-zinc-900 text-xs text-zinc-300 flex items-center justify-between"
                        >
                          <span className="truncate">{index + 1}. {script.title || 'Sem título'}</span>
                          {collapsedScripts.has(script.id) ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                        </button>
                      ))}
                    </div>
                    )}
                  </div>
                )}

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
                                      <button onClick={() => toggleScriptCollapsed(script.id)} className="btn-ghost p-1">
                                        {collapsedScripts.has(script.id) ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                                      </button>
                                      <button onClick={() => duplicateScript(script)} className="btn-ghost p-1"><Copy size={14} /></button>
                                      <button onClick={() => deleteScript(script.id)} className="btn-ghost p-1 hover:text-red-500"><Trash2 size={14} /></button>
                                    </div>
                                  </div>

                                  {!collapsedScripts.has(script.id) && <div className="space-y-3">
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
                                  </div>}
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
        templates={SCRIPT_TEMPLATES}
      />
    </div>
  );
};

function RefreshDot() {
  return <span className="w-2 h-2 rounded-full bg-dbe-blue animate-pulse" />;
}

export default Editor;
