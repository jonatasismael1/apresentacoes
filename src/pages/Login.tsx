import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, AlertCircle } from 'lucide-react';
import { login } from '../lib/auth';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (login(email, password)) {
      navigate('/');
    } else {
      setError('E-mail ou senha incorretos.');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        
        {/* Detail */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-dbe-blue via-blue-400 to-emerald-400" />

        <div className="flex justify-center mb-8">
          <div className="bg-zinc-800/50 p-4 rounded-full">
            <LogIn size={32} className="text-dbe-blue" />
          </div>
        </div>

        <h1 className="text-2xl font-black text-white text-center mb-2 uppercase tracking-wide">
          DBE Presentations
        </h1>
        <p className="text-zinc-400 text-center mb-8 text-sm">
          Acesso restrito. Insira suas credenciais.
        </p>

        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center gap-3 text-sm">
            <AlertCircle size={18} className="shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
              E-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-dbe-blue focus:ring-1 focus:ring-dbe-blue transition-all"
              placeholder="seu@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
              Senha
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-dbe-blue focus:ring-1 focus:ring-dbe-blue transition-all"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-dbe-blue hover:bg-blue-600 text-white font-bold py-3.5 px-4 rounded-xl transition-all uppercase tracking-wide text-sm mt-4"
          >
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}
