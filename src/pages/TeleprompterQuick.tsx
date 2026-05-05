import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, ChevronUp, ChevronDown, Minus, Plus } from 'lucide-react';
import DBELogo from '../components/DBELogo';
import TeleprompterReader from '../components/teleprompter/TeleprompterReader';
import type { TeleprompterSettings } from '../types';

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

const TeleprompterQuick: React.FC = () => {
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [isStarted, setIsStarted] = useState(false);
  const [settings, setSettings] = useState<TeleprompterSettings>(() => {
    try {
      const stored = localStorage.getItem('dbe_tp_settings');
      return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const updateSetting = <K extends keyof TeleprompterSettings>(key: K, value: TeleprompterSettings[K]) => {
    setSettings(prev => {
      const next = { ...prev, [key]: value };
      localStorage.setItem('dbe_tp_settings', JSON.stringify(next));
      return next;
    });
  };

  if (isStarted && text.trim()) {
    return (
      <TeleprompterReader 
        text={text} 
        settings={settings} 
        onExit={() => setIsStarted(false)}
        updateSettings={(newSettings) => {
          const updated = { ...settings, ...newSettings };
          setSettings(updated);
          localStorage.setItem('dbe_tp_settings', JSON.stringify(updated));
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-dbe-darker text-white">
      <header className="sticky top-0 z-10 bg-dbe-darker/95 backdrop-blur-md border-b border-zinc-800 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/')} className="btn-ghost p-2">
          <ArrowLeft size={20} />
        </button>
        <DBELogo className="h-7" />
        <h1 className="text-base font-bold">Teleprompter Rápido</h1>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* Settings strip */}
        <div className="card p-4">
          <p className="text-xs uppercase font-bold tracking-widest text-zinc-500 mb-4">Configurações de Leitura</p>
          <div className="grid grid-cols-2 gap-4">
            {/* Speed */}
            <div className="space-y-2">
              <label className="text-xs text-zinc-400 font-medium">Velocidade</label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateSetting('speed', Math.max(0.5, +(settings.speed - 0.5).toFixed(1)))}
                  className="btn-ghost p-2 rounded-lg border border-zinc-800"
                >
                  <Minus size={14} />
                </button>
                <span className="flex-1 text-center text-lg font-bold text-dbe-blue tabular-nums">{settings.speed.toFixed(1)}x</span>
                <button
                  onClick={() => updateSetting('speed', Math.min(10, +(settings.speed + 0.5).toFixed(1)))}
                  className="btn-ghost p-2 rounded-lg border border-zinc-800"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {/* Font size */}
            <div className="space-y-2">
              <label className="text-xs text-zinc-400 font-medium">Tamanho da fonte</label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateSetting('fontSize', Math.max(20, settings.fontSize - 4))}
                  className="btn-ghost p-2 rounded-lg border border-zinc-800"
                >
                  <ChevronDown size={14} />
                </button>
                <span className="flex-1 text-center text-lg font-bold text-dbe-blue tabular-nums">{settings.fontSize}px</span>
                <button
                  onClick={() => updateSetting('fontSize', Math.min(120, settings.fontSize + 4))}
                  className="btn-ghost p-2 rounded-lg border border-zinc-800"
                >
                  <ChevronUp size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Preview mini */}
          <div className="mt-4 bg-black rounded-lg p-3 text-center overflow-hidden h-16 flex items-center justify-center">
            <span style={{ fontSize: `${Math.min(settings.fontSize * 0.5, 32)}px`, color: settings.textColor || '#fff', fontWeight: 600 }}>
              Prévia do texto
            </span>
          </div>
        </div>

        {/* Text area */}
        <div className="card p-4 space-y-3">
          <p className="text-xs uppercase font-bold tracking-widest text-zinc-500">Texto para leitura</p>
          <p className="text-xs text-zinc-500">Cole ou escreva aqui. Não será salvo.</p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="input-field text-base p-4 font-sans resize-none"
            style={{ minHeight: '35vh' }}
            placeholder="Cole seu roteiro aqui..."
          />
        </div>

        <button 
          onClick={() => setIsStarted(true)}
          disabled={!text.trim()}
          className="btn-primary w-full py-4 text-lg font-bold shadow-2xl shadow-dbe-blue/30"
        >
          <Play size={20} fill="currentColor" />
          Iniciar Leitura
        </button>

        <p className="text-center text-xs text-zinc-600 pb-6">
          As configurações de velocidade e fonte são salvas automaticamente.
        </p>
      </main>
    </div>
  );
};

export default TeleprompterQuick;
