import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStorage } from '../hooks/useStorage';
import { useToast } from '../components/toastContext';
import { 
  ArrowLeft, Play, Settings as SettingsIcon, 
  FlipHorizontal, Sun, Moon, Layout, Save, Timer,
  AlignCenter, AlignJustify, AlignLeft, AlignRight
} from 'lucide-react';
import type { TeleprompterSettings, TeleprompterTextAlign } from '../types';
import DBELogo from '../components/DBELogo';
import TeleprompterReader from '../components/teleprompter/TeleprompterReader';

const DEFAULT_SETTINGS: TeleprompterSettings = {
  speed: 2,
  fontSize: 48,
  lineHeight: 1.5,
  width: 80,
  isMirrored: false,
  enableCountdown: true,
  textAlign: 'center',
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

const ALIGNMENT_OPTIONS: Array<{ value: TeleprompterTextAlign; label: string; icon: React.ElementType }> = [
  { value: 'center', label: 'Centralizado', icon: AlignCenter },
  { value: 'justify', label: 'Justificado', icon: AlignJustify },
  { value: 'left', label: 'Esquerda', icon: AlignLeft },
  { value: 'right', label: 'Direita', icon: AlignRight },
];

interface CustomPreset {
  name: string;
  settings: TeleprompterSettings;
}

const readStoredSettings = (): TeleprompterSettings => {
  try {
    const stored = localStorage.getItem('dbe_tp_settings');
    return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
};

const Teleprompter: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { presentations } = useStorage();
  const { showToast } = useToast();

  const [selectedPresentationId, setSelectedPresentationId] = useState(id || '');
  const [selectedScriptId, setSelectedScriptId] = useState<string>('all');
  const [isStarted, setIsStarted] = useState(false);
  const [settings, setSettings] = useState<TeleprompterSettings>(readStoredSettings);
  const [customPresets, setCustomPresets] = useState<CustomPreset[]>(() => {
    try {
      const stored = localStorage.getItem('dbe_tp_custom_presets');
      return stored ? JSON.parse(stored) as CustomPreset[] : [];
    } catch {
      return [];
    }
  });
  const [presetName, setPresetName] = useState('');

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

  const saveCustomPreset = () => {
    const name = presetName.trim() || `Preset ${customPresets.length + 1}`;
    const next = [{ name, settings }, ...customPresets.filter(item => item.name !== name)].slice(0, 8);
    setCustomPresets(next);
    localStorage.setItem('dbe_tp_custom_presets', JSON.stringify(next));
    setPresetName('');
    showToast(`Preset "${name}" salvo`, 'success');
  };

  const applyCustomPreset = (preset: CustomPreset) => {
    setSettings({ ...DEFAULT_SETTINGS, ...preset.settings });
    showToast(`Preset "${preset.name}" aplicado`, 'success');
  };

  if (isStarted && presentation) {
    return (
      <TeleprompterReader 
        text={getCombinedText()} 
        settings={settings} 
        onExit={() => setIsStarted(false)}
        updateSettings={(newSettings) => setSettings(prev => ({ ...prev, ...newSettings }))}
        autoStart
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
                  {(Object.keys(PRESETS) as Array<keyof typeof PRESETS>).map((p) => (
                    <button 
                      key={p} 
                      onClick={() => applyPreset(p)}
                      className="text-xs py-2 bg-zinc-800 hover:bg-dbe-blue/20 border border-zinc-700 rounded-md uppercase font-bold tracking-wider transition-colors"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="label">Presets salvos</label>
                <div className="flex gap-2">
                  <input
                    value={presetName}
                    onChange={event => setPresetName(event.target.value)}
                    className="input-field text-sm"
                    placeholder="Nome do preset"
                  />
                  <button onClick={saveCustomPreset} className="btn-secondary px-3">
                    <Save size={16} />
                  </button>
                </div>
                {customPresets.length > 0 && (
                  <div className="grid grid-cols-1 gap-2">
                    {customPresets.map(preset => (
                      <button
                        key={preset.name}
                        onClick={() => applyCustomPreset(preset)}
                        className="text-left text-xs py-2 px-3 bg-zinc-800 hover:bg-dbe-blue/20 border border-zinc-700 rounded-md font-bold transition-colors"
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                )}
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="flex items-center justify-between p-3 bg-zinc-900 rounded-lg">
                  <div className="flex items-center gap-3">
                    <FlipHorizontal size={18} className="text-zinc-500" />
                    <span className="text-sm font-medium">Espelhar Texto</span>
                  </div>
                  <button 
                    onClick={() => setSettings({...settings, isMirrored: !settings.isMirrored})}
                    className={`w-12 h-6 rounded-full transition-colors relative ${settings.isMirrored ? 'bg-dbe-blue' : 'bg-zinc-700'}`}
                    title="Espelhar texto"
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.isMirrored ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 bg-zinc-900 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Timer size={18} className="text-zinc-500" />
                    <span className="text-sm font-medium">Contagem</span>
                  </div>
                  <button 
                    onClick={() => setSettings({...settings, enableCountdown: !settings.enableCountdown})}
                    className={`w-12 h-6 rounded-full transition-colors relative ${settings.enableCountdown ? 'bg-dbe-blue' : 'bg-zinc-700'}`}
                    title="Contagem regressiva"
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.enableCountdown ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>
              </div>

              <div>
                <label className="label mb-3">Alinhamento do texto</label>
                <div className="grid grid-cols-2 gap-2">
                  {ALIGNMENT_OPTIONS.map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      onClick={() => setSettings({...settings, textAlign: value})}
                      className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-all text-xs font-bold ${settings.textAlign === value ? 'border-dbe-blue bg-dbe-blue/10 text-dbe-blue' : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white'}`}
                      title={label}
                    >
                      <Icon size={16} />
                      {label}
                    </button>
                  ))}
                </div>
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
