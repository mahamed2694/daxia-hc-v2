// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

const APP_PASSWORD = process.env.NEXT_PUBLIC_APP_PASSWORD || 'DAXIATEC465';

const AppContent = dynamic(() => import('./AppContent'), { ssr: false });

function PasswordScreen({ onAuthenticate }: { onAuthenticate: () => void }) {
  const [entrada, setEntrada] = useState('');
  const [erro, setErro] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (entrada === APP_PASSWORD) {
      sessionStorage.setItem('daxia_auth', 'true');
      onAuthenticate();
    } else {
      setErro('❌ Senha incorreta! Tente novamente.');
      setEntrada('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-700 to-blue-900 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="text-6xl mb-3">🏗️</div>
          <h2 className="text-2xl font-bold text-gray-800">Daxia People Analytics</h2>
          <p className="text-gray-500 mt-1 text-sm">Gestão de RH • Guarulhos/SP</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Senha de acesso</label>
            <input
              type="password" value={entrada}
              onChange={e => setEntrada(e.target.value)}
              placeholder="••••••••••"
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 text-center text-lg"
              autoFocus
            />
          </div>
          {erro && (
            <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded">
              <p className="text-red-700 text-sm font-semibold">{erro}</p>
            </div>
          )}
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition">
            🔓 Acessar
          </button>
        </form>
        <p className="text-center text-gray-400 text-xs mt-6">Desconectado ao fechar o navegador</p>
      </div>
    </div>
  );
}

// ─── Componente principal ──────────────────────────────────────────────────────
export default function Home() {
  const [autenticado, setAutenticado] = useState(false);
  const [verificando, setVerificando] = useState(true);

  useEffect(() => {
    if (sessionStorage.getItem('daxia_auth') === 'true') setAutenticado(true);
    setVerificando(false);
  }, []);

  if (verificando) return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-100 flex items-center justify-center">
      <p className="text-2xl font-bold text-blue-600">⏳ Verificando...</p>
    </div>
  );
  if (!autenticado) return <PasswordScreen onAuthenticate={() => setAutenticado(true)} />;
  return <AppContent onLogout={() => { sessionStorage.removeItem('daxia_auth'); setAutenticado(false); }} />;
}
