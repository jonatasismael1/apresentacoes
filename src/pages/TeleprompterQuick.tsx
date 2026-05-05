import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Layout } from 'lucide-react';
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
    const stored = localStorage.getItem('dbe_tp_settings');
    return stored ? JSON.parse(stored) : DEFAULT_SETTINGS;
  });

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
    <div className="min-h-screen bg-dbe-darker text-white p-6">
      <header className="max-w-6xl mx-auto flex items-center justify-between mb-12">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="btn-ghost">
            <ArrowLeft size={24} />
          </button>
          <DBELogo className="h-8" />
          <h1 className="text-2xl font-bold ml-4">Teleprompter Rápido</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto">
        <section className="card p-6 flex flex-col gap-6">
          <div className="flex items-center gap-2">
            <Layout size={20} className="text-dbe-blue" />
            <h2 className="text-lg font-bold">Cole seu texto abaixo</h2>
          </div>
          
          <p className="text-sm text-zinc-400">
            Este é um teleprompter temporário. O texto colado aqui não será salvo no banco de dados. Ideal para gravações avulsas e rápidas.
          </p>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="input-field min-h-[40vh] text-lg p-6 font-sans resize-none"
            placeholder="Cole seu texto aqui..."
          />

          <button 
            onClick={() => setIsStarted(true)}
            disabled={!text.trim()}
            className="btn-primary w-full py-4 text-lg font-bold shadow-xl shadow-dbe-blue/20 mt-4"
          >
            <Play size={20} fill="currentColor" />
            Iniciar Leitura
          </button>
        </section>
      </main>
    </div>
  );
};

export default TeleprompterQuick;
