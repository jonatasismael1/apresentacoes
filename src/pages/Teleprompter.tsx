import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStorage } from '../hooks/useStorage';
import { useToast } from '../components/Toast';
import { 
  ArrowLeft, Play, Settings as SettingsIcon, 
  FlipHorizontal, Sun, Moon, Layout
} from 'lucide-react';
import type { TeleprompterSettings } from '../types';
import DBELogo from '../components/DBELogo';
import TeleprompterReader from '../components/teleprompter/TeleprompterReader';

const DEFAULT_SETTINGS: TeleprompterSettings = {
  speed: 2,
  fontSize: 48,
  lineHeight: 1.5,
  width: 80,
  isMirrored: false,
  theme: 'dark',
  bgColor: '#000000',
  textColor: '#ffffff',
};

const PRESETS = {
  curto: { speed: 3, fontSize: 56, lineHeight: 1.2 },
  aula: { speed: 1.5, fontSize: 42, lineHeight: 1.6 },
  venda: { speed: 2.5, fontSize: 48, lineHeight: 1.4 },
  podcast: { speed: 1.2, fontSize: 38, lineHeight: 1.8 },
};

const Teleprompter: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { presentations } = useStorage();
  const { showToast } = useToast();

  const [selectedPresentationId, setSelectedPresentationId] = useState(id || '');
  const [selectedScriptId, setSelectedScriptId] = useState<string>('all');
  const [isStarted, setIsStarted] = useState(false);
  const [settings, setSettings] = useState<TeleprompterSettings>(() => {
    const stored = localStorage.getItem('dbe_tp_settings');
    return stored ? JSON.parse(stored) : DEFAULT_SETTINGS;
  });

  const presentation = presentations.find(p => p.id === selectedPresentationId);

  useEffect(() => {
    localStorage.setItem('dbe_tp_settings', JSON.stringify(settings));
  }, [settings]);

  const getCombinedText = () => {
    if (!presentation) return '';
    if (selectedScriptId === 'all') {
      return presentation.scripts.map(s => `${s.title}\n\n${s.hook}\n${s.development}\n${s.cta}`).join('\n\n---\n\n');
    }
    const script = presentation.scripts.find(s => s.id === selectedScriptId);
    return script ? `${script.title}\n\n${script.hook}\n${script.development}\n${script.cta}` : '';
  };

  const applyPreset = (preset: keyof typeof PRESETS) => {
    setSettings(prev => ({ ...prev, ...PRESETS[preset] }));
    showToast(`Preset "${preset}" aplicado`, 'success');
  };

  if (isStarted && presentation) {
    return (
      <TeleprompterReader 
        text={getCombinedText()} 
        settings={settings} 
        onExit={() => setIsStarted(false)}
        updateSettings={(newSettings) => setSettings({ ...settings, ...newSettings })}
      />
    );
  }

  return (
    <div className="min-h-screen bg-dbe-darker text-white p-6">
      <header className="max-w-6xl mx-auto flex items-center justify-between mb-12">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="btn-ghost">
            <ArrowLeft size={24} />
          </button>
          <DBELogo className="h-8" />
          <h1 className="text-2xl font-bold ml-4">Teleprompter</h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Seleção e Preview */}
        <div className="lg:col-span-2 space-y-6">
          <section className="card p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Layout size={20} className="text-dbe-blue" />
              Seleção de Conteúdo
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Campanha</label>
                <select 
                  className="input-field"
                  value={selectedPresentationId}
                  onChange={(e) => {
                    setSelectedPresentationId(e.target.value);
                    setSelectedScriptId('all');
                  }}
                >
                  <option value="">Selecione uma campanha...</option>
                  {presentations.map(p => (
                    <option key={p.id} value={p.id}>{p.clientName} - {p.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Roteiro</label>
                <select 
                  className="input-field"
                  value={selectedScriptId}
                  onChange={(e) => setSelectedScriptId(e.target.value)}
                  disabled={!selectedPresentationId}
                >
                  <option value="all">Todos os roteiros</option>
                  {presentation?.scripts.map(s => (
                    <option key={s.id} value={s.id}>{s.title}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <section className="card p-6 h-[400px] flex flex-col">
            <h2 className="text-lg font-bold mb-4">Preview do Texto</h2>
            <div className="flex-1 bg-black/50 rounded-lg p-6 overflow-y-auto whitespace-pre-wrap font-sans text-lg text-zinc-400 border border-zinc-800">
              {getCombinedText() || "Selecione uma campanha para visualizar o texto."}
            </div>
          </section>
        </div>

        {/* Configurações */}
        <div className="space-y-6">
          <section className="card p-6">
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
              <SettingsIcon size={20} className="text-dbe-blue" />
              Configurações
            </h2>

            <div className="space-y-6">
              {/* Presets */}
              <div>
                <label className="label mb-3">Presets Rápidos</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.keys(PRESETS).map((p) => (
                    <button 
                      key={p} 
                      onClick={() => applyPreset(p as any)}
                      className="text-xs py-2 bg-zinc-800 hover:bg-dbe-blue/20 border border-zinc-700 rounded-md uppercase font-bold tracking-wider transition-colors"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="group">
                  <div className="flex justify-between mb-2">
                    <label className="text-xs font-bold uppercase text-zinc-500">Velocidade</label>
                    <span className="text-xs font-bold text-dbe-blue">{settings.speed}x</span>
                  </div>
                  <input 
                    type="range" min="0.1" max="10" step="0.1"
                    value={settings.speed}
                    onChange={(e) => setSettings({...settings, speed: parseFloat(e.target.value)})}
                    className="w-full accent-dbe-blue"
                  />
                </div>

                <div className="group">
                  <div className="flex justify-between mb-2">
                    <label className="text-xs font-bold uppercase text-zinc-500">Fonte</label>
                    <span className="text-xs font-bold text-dbe-blue">{settings.fontSize}px</span>
                  </div>
                  <input 
                    type="range" min="20" max="120"
                    value={settings.fontSize}
                    onChange={(e) => setSettings({...settings, fontSize: parseInt(e.target.value)})}
                    className="w-full accent-dbe-blue"
                  />
                </div>

                <div className="group">
                  <div className="flex justify-between mb-2">
                    <label className="text-xs font-bold uppercase text-zinc-500">Largura (%)</label>
                    <span className="text-xs font-bold text-dbe-blue">{settings.width}%</span>
                  </div>
                  <input 
                    type="range" min="30" max="100"
                    value={settings.width}
                    onChange={(e) => setSettings({...settings, width: parseInt(e.target.value)})}
                    className="w-full accent-dbe-blue"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-zinc-900 rounded-lg">
                <div className="flex items-center gap-3">
                  <FlipHorizontal size={18} className="text-zinc-500" />
                  <span className="text-sm font-medium">Espelhar Texto</span>
                </div>
                <button 
                  onClick={() => setSettings({...settings, isMirrored: !settings.isMirrored})}
                  className={`w-12 h-6 rounded-full transition-colors relative ${settings.isMirrored ? 'bg-dbe-blue' : 'bg-zinc-700'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.isMirrored ? 'left-7' : 'left-1'}`} />
                </button>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => setSettings({...settings, theme: 'dark', bgColor: '#000000', textColor: '#ffffff'})}
                  className={`flex-1 flex flex-col items-center gap-1 p-3 rounded-lg border transition-all ${settings.theme === 'dark' ? 'border-dbe-blue bg-dbe-blue/10' : 'border-zinc-800 bg-zinc-900'}`}
                >
                  <Moon size={16} />
                  <span className="text-[10px] uppercase font-bold">Escuro</span>
                </button>
                <button 
                  onClick={() => setSettings({...settings, theme: 'light', bgColor: '#ffffff', textColor: '#000000'})}
                  className={`flex-1 flex flex-col items-center gap-1 p-3 rounded-lg border transition-all ${settings.theme === 'light' ? 'border-dbe-blue bg-dbe-blue/10' : 'border-zinc-800 bg-zinc-900'}`}
                >
                  <Sun size={16} />
                  <span className="text-[10px] uppercase font-bold">Claro</span>
                </button>
              </div>

              <button 
                onClick={() => setIsStarted(true)}
                disabled={!selectedPresentationId}
                className="btn-primary w-full py-4 text-lg font-bold shadow-xl shadow-dbe-blue/20"
              >
                <Play size={20} fill="currentColor" />
                Iniciar Teleprompter
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default Teleprompter;
