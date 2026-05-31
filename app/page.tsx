// @ts-nocheck
'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

// ─── Credenciais via variáveis de ambiente ────────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const APP_PASSWORD = process.env.NEXT_PUBLIC_APP_PASSWORD || 'DAXIATEC465';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── Tipos ────────────────────────────────────────────────────────────────────
type Pessoa = {
  id: number; nome: string; cargo: string; setor: string;
  ativo: boolean; foto_url?: string; created_at?: string;
};
type Lancamento = {
  id: number; pessoa_id: number; tipo: string; data: string;
  horas?: number; minutos?: number; descricao?: string; created_at?: string;
};
type BonusElegibilidade = {
  id: number; pessoa_id: number; elegivel: boolean;
  data_inicio_elegibilidade?: string; data_desclassificacao?: string;
  motivo_desclassificacao?: string; reversivel?: boolean;
  valor_calculado?: number; valor_bonus?: number;
};
type Auditoria = {
  id: number; tabela: string; acao: string; usuario: string;
  dados_anteriores?: any; dados_novos?: any; criado_em: string;
};
type Feriado = { id: number; data: string; descricao: string; tipo: string; };

// ─── Tela de senha ─────────────────────────────────────────────────────────────
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

// ─── App principal ─────────────────────────────────────────────────────────────

// ── Funções globais de tipo ────────────────────────────────────────────────────
function getTipoLabel(tipo: string): string {
  return ({
    'he-60': '⏰ HE 60%', 'he-100': '⏰ HE 100%', 'atraso': '🔴 Atraso',
    'atestado-horas': '📋 Atestado Hora', 'falta-injustificada': '❌ Falta Injustificada',
    'atestado': '📄 Atestado', 'saida-antecipada': '🚪 Saída Antecipada',
    'advertencia': '⚠️ Advertência', 'férias': '🏖️ Férias'
  } as Record<string,string>)[tipo] || tipo;
}

function getTipoCor(tipo: string): string {
  if (tipo.includes('he')) return 'bg-blue-100 text-blue-800';
  if (tipo === 'atraso') return 'bg-orange-100 text-orange-800';
  if (tipo === 'falta-injustificada' || tipo === 'advertencia') return 'bg-red-100 text-red-800';
  if (tipo === 'atestado') return 'bg-yellow-100 text-yellow-800';
  if (tipo === 'atestado-horas' || tipo === 'saida-antecipada') return 'bg-purple-100 text-purple-800';
  if (tipo === 'férias') return 'bg-green-100 text-green-800';
  return 'bg-gray-100 text-gray-800';
}

function AppContent({ onLogout }: { onLogout: () => void }) {
  // Dados iniciais de cargos
  const cargosIniciais: Record<string, { he60: number; he100: number }> = {
    'AJUDANTE GERAL': { he60: 18.80, he100: 23.50 },
    'ALMOXARIFE': { he60: 25.90, he100: 32.38 },
    'ANAL LOGISTICA JR': { he60: 31.45, he100: 39.32 },
    'ASSIST DE LOG JR': { he60: 23.19, he100: 28.98 },
    'ASSIST DE LOG PL': { he60: 26.96, he100: 33.70 },
    'ASSIST PROJETOS JR': { he60: 26.83, he100: 33.53 },
    'AUX DE LOGISTICA': { he60: 20.50, he100: 25.62 },
    'CONFERENTE JR': { he60: 23.24, he100: 29.05 },
    'CONFERENTE PL': { he60: 25.79, he100: 32.24 },
    'LIDER ADM EXPEDICAO': { he60: 37.58, he100: 46.97 },
    'LIDER ADM RECEBIMENT': { he60: 31.65, he100: 39.56 },
    'LIDER DE ESTOQUE': { he60: 27.01, he100: 33.76 },
    'LIDER DE EXPEDICAO': { he60: 33.86, he100: 42.32 },
    'OP EMPILHADEIRA JR': { he60: 22.72, he100: 28.39 },
    'OP EMPILHADEIRA PL': { he60: 26.18, he100: 32.73 },
  };

  const setoresLista = ['Inbound', 'Outbound', 'Projetos/Estoques/Custos'];
  const VALOR_BONUS = 100;

  // ── Estados ──────────────────────────────────────────────────────────────────
  const [hidratado, setHidratado] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState('resumos');
  const [horasUteisDia, setHorasUteisDia] = useState(10);
  const [metaHE, setMetaHE] = useState(1000);
  const [metaAbsenteismo, setMetaAbsenteismo] = useState(5);
  const [dataInicio, setDataInicio] = useState(new Date().toISOString().slice(0, 7) + '-01');
  const [dataFim, setDataFim] = useState(new Date().toISOString().slice(0, 10));
  const [setorFiltro, setSetorFiltro] = useState('');
  const [toast, setToast] = useState<{ msg: string; tipo: 'ok' | 'err' } | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [guiaAberto, setGuiaAberto] = useState(false);
  const [guiaPasso, setGuiaPasso] = useState(0);
  const [guiaAba, setGuiaAba] = useState<string|null>(null); // null = guia completo

  const [tabelaHE, setTabelaHE] = useState(cargosIniciais);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [auditoria, setAuditoria] = useState<Auditoria[]>([]);
  const [bonusElegibilidade, setBonusElegibilidade] = useState<BonusElegibilidade[]>([]);
  const [feriados, setFeriados] = useState<Feriado[]>([]);

  // Formulários
  const [formPessoa, setFormPessoa] = useState({ nome: '', cargo: 'AJUDANTE GERAL', setor: 'Inbound' });
  const [formCargo, setFormCargo] = useState({ nome: '', he60: '', he100: '' });
  const [formLancamento, setFormLancamento] = useState({
    pessoaId: 0, tipo: 'he-60', data: '', horas: '', minutos: '', descricao: '', avisoComunicado: true
  });
  const [formFerias, setFormFerias] = useState({ pessoaId: 0, dataInicio: '', dataFim: '' });
  const [formFeriado, setFormFeriado] = useState({ data: '', descricao: '', tipo: 'nacional' });

  // ── Toast helper ─────────────────────────────────────────────────────────────
  const mostrarToast = useCallback((msg: string, tipo: 'ok' | 'err' = 'ok') => {
    setToast({ msg, tipo });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // ── Cargos ordenados ─────────────────────────────────────────────────────────
  const cargosArray = useMemo(() =>
    Object.keys(tabelaHE).sort((a, b) => a.localeCompare(b)), [tabelaHE]);

  // ── Pessoas ativas ordenadas ──────────────────────────────────────────────────
  const pessoasAtivas = useMemo(() =>
    pessoas.filter(p => p.ativo !== false).sort((a, b) => a.nome.localeCompare(b.nome)), [pessoas]);

  const pessoasTodas = useMemo(() =>
    [...pessoas].sort((a, b) => a.nome.localeCompare(b.nome)), [pessoas]);

  // ── Carregar dados iniciais ───────────────────────────────────────────────────
  useEffect(() => {
    const carregar = async () => {
      try {
        const [
          { data: pessoasData },
          { data: lancData },
          { data: heData },
          { data: audData },
          { data: bonusData },
          { data: feriadosData },
        ] = await Promise.all([
          supabase.from('pessoas').select('*').order('nome'),
          supabase.from('lancamentos').select('*').order('data', { ascending: false }),
          supabase.from('tabela_he').select('*'),
          supabase.from('auditoria').select('*').order('criado_em', { ascending: false }),
          supabase.from('bonus_elegibilidade').select('*'),
          supabase.from('feriados').select('*').order('data'),
        ]);

        if (pessoasData) setPessoas(pessoasData);
        if (lancData) setLancamentos(lancData);
        if (heData && heData.length > 0) {
          const heObj: Record<string, { he60: number; he100: number }> = {};
          heData.forEach(item => { heObj[item.cargo] = { he60: +item.he60, he100: +item.he100 }; });
          setTabelaHE({ ...cargosIniciais, ...heObj });
        }
        if (audData) setAuditoria(audData);
        if (bonusData) setBonusElegibilidade(bonusData);
        if (feriadosData) setFeriados(feriadosData);

        setHidratado(true);
        // Mostrar guia na primeira vez
        if (!localStorage.getItem("daxia_guia_visto")) {
          setGuiaAberto(true);
          setGuiaAba(null);
        }
      } catch (err) {
        console.error('Erro ao carregar:', err);
        setHidratado(true);
      }
    };
    carregar();
  }, []);

  // Inicializa pessoaId do form quando pessoas carregarem
  useEffect(() => {
    if (pessoasAtivas.length > 0 && formLancamento.pessoaId === 0) {
      setFormLancamento(f => ({ ...f, pessoaId: pessoasAtivas[0].id }));
    }
    if (pessoasAtivas.length > 0 && formFerias.pessoaId === 0) {
      setFormFerias(f => ({ ...f, pessoaId: pessoasAtivas[0].id }));
    }
  }, [pessoasAtivas]);

  // ── Realtime ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!hidratado) return;
    const canal = supabase.channel('db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pessoas' }, payload => {
        if (payload.eventType === 'INSERT') setPessoas(p => [...p, payload.new as Pessoa].sort((a,b)=>a.nome.localeCompare(b.nome)));
        else if (payload.eventType === 'DELETE') setPessoas(p => p.filter(x => x.id !== payload.old.id));
        else if (payload.eventType === 'UPDATE') setPessoas(p => p.map(x => x.id === payload.new.id ? payload.new as Pessoa : x));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lancamentos' }, payload => {
        if (payload.eventType === 'INSERT') setLancamentos(p => [payload.new as Lancamento, ...p]);
        else if (payload.eventType === 'DELETE') setLancamentos(p => p.filter(x => x.id !== payload.old.id));
        else if (payload.eventType === 'UPDATE') setLancamentos(p => p.map(x => x.id === payload.new.id ? payload.new as Lancamento : x));
      })
      .subscribe();
    return () => { canal.unsubscribe(); };
  }, [hidratado]);

  // ── Helpers ───────────────────────────────────────────────────────────────────
  const registrarAuditoria = async (tabela: string, acao: string, dados: any, anteriores: any = null) => {
    try {
      const { data: novo } = await supabase.from('auditoria').insert([{
        tabela, acao, usuario: 'Usuário Sistema', dados_novos: dados, dados_anteriores: anteriores
      }]).select().single();
      if (novo) setAuditoria(a => [novo, ...a]);
    } catch (err) { console.error('Erro auditoria:', err); }
  };

  // Avatar com iniciais
  const Avatar = ({ pessoa, tamanho = 'sm' }: { pessoa?: Pessoa; tamanho?: 'sm' | 'md' }) => {
    const tam = tamanho === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm';
    if (!pessoa) return null;
    if (pessoa.foto_url) return (
      <img src={pessoa.foto_url} alt={pessoa.nome}
        className={`${tam} rounded-full object-cover flex-shrink-0`} />
    );
    const iniciais = pessoa.nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
    const cores = ['bg-blue-500','bg-green-500','bg-purple-500','bg-orange-500','bg-red-500','bg-teal-500'];
    const cor = cores[pessoa.id % cores.length];
    return (
      <div className={`${tam} ${cor} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0`}>
        {iniciais}
      </div>
    );
  };

  const diasNoMes = (anoMes: string) => {
    const [ano, mes] = anoMes.split('-').map(Number);
    return new Date(ano, mes, 0).getDate();
  };

  // ── Bonus: desclassificar ────────────────────────────────────────────────────
  const desclassificarBonus = async (pessoaId: number, motivo: string) => {
    try {
      const hoje = new Date().toISOString().split('T')[0];
      const { data: existing } = await supabase.from('bonus_elegibilidade').select('*').eq('pessoa_id', pessoaId);
      if (existing && existing.length > 0) {
        await supabase.from('bonus_elegibilidade').update({
          elegivel: false, data_desclassificacao: hoje, motivo_desclassificacao: motivo
        }).eq('pessoa_id', pessoaId);
        setBonusElegibilidade(b => b.map(x =>
          x.pessoa_id === pessoaId ? { ...x, elegivel: false, data_desclassificacao: hoje, motivo_desclassificacao: motivo } : x
        ));
      } else {
        const { data: novo } = await supabase.from('bonus_elegibilidade').insert([{
          pessoa_id: pessoaId, elegivel: false, data_desclassificacao: hoje, motivo_desclassificacao: motivo,
          data_inicio_elegibilidade: hoje
        }]).select().single();
        if (novo) setBonusElegibilidade(b => [...b, novo]);
      }
    } catch (err) { console.error('Erro desclassificar bonus:', err); }
  };

  const inicializarBonusPessoa = async (pessoaId: number) => {
    try {
      const { data: existing } = await supabase.from('bonus_elegibilidade').select('*').eq('pessoa_id', pessoaId);
      if (!existing || existing.length === 0) {
        const { data: novo } = await supabase.from('bonus_elegibilidade').insert([{
          pessoa_id: pessoaId, elegivel: true,
          valor_bonus: 100,
          data_inicio_elegibilidade: new Date().toISOString().split('T')[0]
        }]).select().single();
        if (novo) setBonusElegibilidade(b => [...b, novo]);
      }
    } catch (err) { console.error('Erro inicializar bonus:', err); }
  };

  // ── Cálculos filtrados ────────────────────────────────────────────────────────
  const lancamentosFiltrados = useMemo(() => {
    return lancamentos.filter(l => {
      const dentroData = l.data >= dataInicio && l.data <= dataFim;
      if (!dentroData) return false;
      if (!setorFiltro) return true;
      return pessoas.find(p => p.id === l.pessoa_id)?.setor === setorFiltro;
    });
  }, [lancamentos, dataInicio, dataFim, setorFiltro, pessoas]);

  const contarDiasUteis = (ini: string, fim: string) => {
    let count = 0;
    for (let d = new Date(ini); d <= new Date(fim); d.setDate(d.getDate() + 1)) {
      const dia = d.getDay();
      if (dia >= 1 && dia <= 5) count++;
    }
    return count;
  };

  const calcularAbsenteismo = () => {
    const diasUteis = contarDiasUteis(dataInicio, dataFim);
    const pessoasFiltro = setorFiltro ? pessoas.filter(p => p.setor === setorFiltro) : pessoas;
    const horasDisp = horasUteisDia * pessoasFiltro.filter(p => p.ativo !== false).length * diasUteis;
    let horasAbs = 0;
    lancamentosFiltrados.forEach(l => {
      if (l.tipo === 'falta-injustificada' || l.tipo === 'atestado') horasAbs += horasUteisDia;
      else if (l.tipo === 'atestado-horas') horasAbs += +(l.horas || horasUteisDia);
      else if (l.tipo === 'atraso') horasAbs += +(l.minutos || 0) / 60;
      else if (l.tipo === 'saida-antecipada') horasAbs += +(l.minutos || 0) / 60;
    });
    const taxa = horasDisp > 0 ? (horasAbs / horasDisp * 100).toFixed(2) : '0.00';
    return { horasAbs: horasAbs.toFixed(2), taxa, horasDisp };
  };

  const calcularHETotal = () =>
    lancamentosFiltrados.filter(l => l.tipo.includes('he')).reduce((acc, l) => {
      const p = pessoas.find(x => x.id === l.pessoa_id);
      const tab = tabelaHE[p?.cargo || ''];
      const mins = +(l.minutos || 0);
      const val = l.tipo === 'he-60'
        ? (tab?.he60 || 0) * (mins / 60)
        : (tab?.he100 || 0) * (mins / 60);
      return acc + val;
    }, 0);

  const abs = calcularAbsenteismo();
  const totalHE = calcularHETotal();

  // ── Gráficos ──────────────────────────────────────────────────────────────────
  const dadosGraficoHE = useMemo(() => {
    const dados: Record<string, number> = {};
    lancamentosFiltrados.filter(l => l.tipo.includes('he')).forEach(l => {
      if (!dados[l.data]) dados[l.data] = 0;
      const p = pessoas.find(x => x.id === l.pessoa_id);
      const tab = tabelaHE[p?.cargo || ''];
      const mins = +(l.minutos || 0);
      dados[l.data] += l.tipo === 'he-60'
        ? (tab?.he60 || 0) * (mins / 60)
        : (tab?.he100 || 0) * (mins / 60);
    });
    return Object.entries(dados).sort(([a],[b])=>a.localeCompare(b)).map(([data, valor]) => ({
      data: new Date(data+'T00:00:00').toLocaleDateString('pt-BR',{month:'2-digit',day:'2-digit'}),
      valor: +valor.toFixed(2)
    }));
  }, [lancamentosFiltrados, pessoas, tabelaHE]);

  const dadosGraficoAbs = useMemo(() => {
    const dados: Record<string, number> = {};
    lancamentosFiltrados.forEach(l => {
      if (!dados[l.data]) dados[l.data] = 0;
      if (l.tipo === 'falta-injustificada' || l.tipo === 'atestado') dados[l.data] += horasUteisDia;
      else if (l.tipo === 'atestado-horas') dados[l.data] += +(l.horas || horasUteisDia);
      else if (l.tipo === 'atraso') dados[l.data] += +(l.minutos||0)/60;
      else if (l.tipo === 'saida-antecipada') dados[l.data] += +(l.minutos||0)/60;
    });
    return Object.entries(dados).sort(([a],[b])=>a.localeCompare(b)).map(([data, horas]) => ({
      data: new Date(data+'T00:00:00').toLocaleDateString('pt-BR',{month:'2-digit',day:'2-digit'}),
      valor: +horas.toFixed(2)
    }));
  }, [lancamentosFiltrados, horasUteisDia]);

  const topHE = useMemo(() => {
    const dados: Record<number,{nome:string;valor:number;pessoa:Pessoa|undefined}> = {};
    lancamentosFiltrados.filter(l=>l.tipo.includes('he')).forEach(l => {
      const p = pessoas.find(x=>x.id===l.pessoa_id);
      if (!dados[l.pessoa_id]) dados[l.pessoa_id] = { nome: p?.nome||'', valor: 0, pessoa: p };
      const tab = tabelaHE[p?.cargo||''];
      const mins = +(l.minutos||0);
      dados[l.pessoa_id].valor += l.tipo==='he-60'?(tab?.he60||0)*(mins/60):(tab?.he100||0)*(mins/60);
    });
    return Object.values(dados).sort((a,b)=>b.valor-a.valor).slice(0,10);
  }, [lancamentosFiltrados, pessoas, tabelaHE]);

  const topAbs = useMemo(() => {
    const dados: Record<number,{nome:string;valor:number;pessoa:Pessoa|undefined}> = {};
    pessoasAtivas.forEach(p => { dados[p.id] = { nome: p.nome, valor: 0, pessoa: p }; });
    lancamentosFiltrados.forEach(l => {
      if (!dados[l.pessoa_id]) return;
      if (l.tipo==='falta-injustificada'||l.tipo==='atestado') dados[l.pessoa_id].valor += horasUteisDia;
      else if (l.tipo==='atestado-horas') dados[l.pessoa_id].valor += +(l.horas||horasUteisDia);
      else if (l.tipo==='atraso') dados[l.pessoa_id].valor += +(l.minutos||0)/60;
      else if (l.tipo==='saida-antecipada') dados[l.pessoa_id].valor += +(l.minutos||0)/60;
    });
    return Object.values(dados).sort((a,b)=>b.valor-a.valor).slice(0,10);
  }, [lancamentosFiltrados, pessoasAtivas, horasUteisDia]);

  // ── Insights Inteligentes ────────────────────────────────────────────────────
  const insights = useMemo(() => {
    const lista: { msg: string; cor: 'vermelho'|'verde'|'neutro' }[] = [];
    const diasSemana = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
    const feriadosSet = new Set(feriados.map((f: any) => f.data));

    // 1. Pico de HE com data exata
    if (dadosGraficoHE.length > 0) {
      const pico = dadosGraficoHE.reduce((a,b)=>b.valor>a.valor?b:a);
      if (pico.valor > 0) lista.push({ msg: `📈 Pico de HE em ${pico.data}: R$ ${pico.valor.toFixed(2)}`, cor: 'neutro' });
    }

    // 2. HE chegando na meta (80%) ou acima
    if (totalHE > metaHE)
      lista.push({ msg: `🚨 Custo HE R$ ${totalHE.toFixed(0)} ultrapassou a meta de R$ ${metaHE}!`, cor: 'vermelho' });
    else if (totalHE > metaHE * 0.8)
      lista.push({ msg: `⚠️ HE em ${((totalHE/metaHE)*100).toFixed(0)}% da meta — atenção ao fechamento!`, cor: 'vermelho' });

    // 3. Absenteísmo vs meta
    if (+abs.taxa > metaAbsenteismo)
      lista.push({ msg: `⚠️ Absenteísmo ${abs.taxa}% acima da meta de ${metaAbsenteismo}%`, cor: 'vermelho' });
    else if (+abs.taxa < metaAbsenteismo * 0.5)
      lista.push({ msg: `✅ Absenteísmo ${abs.taxa}% muito abaixo da meta — ótimo desempenho!`, cor: 'verde' });

    // 4. HE > 3h num único dia (ilegal)
    const hePorDiaPessoa: Record<string, number> = {};
    lancamentosFiltrados.filter(l=>l.tipo.includes('he')).forEach(l => {
      const chave = `${l.pessoa_id}_${l.data}`;
      hePorDiaPessoa[chave] = (hePorDiaPessoa[chave]||0) + +(l.minutos||0);
    });
    const excedeuLegal = Object.entries(hePorDiaPessoa).find(([,mins])=>mins>180);
    if (excedeuLegal) {
      const [pid, dt] = excedeuLegal[0].split('_');
      lista.push({ msg: `🚨 ${pessoas.find((p: any) => p.id === +pid)?.nome || "Desconhecido"} fez +3h extra em ${new Date(dt+'T00:00:00').toLocaleDateString('pt-BR')} — vedado por lei!`, cor: 'vermelho' });
    }

    // 5. HE em domingo ou feriado
    const datasHE = [...new Set(lancamentosFiltrados.filter(l=>l.tipo.includes('he')).map(l=>l.data))];
    const datasHeEmFeriado = datasHE.filter(d => {
      const diaSem = new Date(d+'T00:00:00').getDay();
      return diaSem === 0 || feriadosSet.has(d);
    });
    if (datasHeEmFeriado.length > 0) {
      const totalMinsNessesDias = lancamentosFiltrados
        .filter(l => l.tipo.includes('he') && datasHeEmFeriado.includes(l.data))
        .reduce((acc, l) => acc + +(l.minutos||0), 0);
      if (totalMinsNessesDias > 0) {
        const horas = (totalMinsNessesDias/60).toFixed(1);
        const datas = datasHeEmFeriado.map(d => new Date(d+'T00:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})).join(', ');
        lista.push({ msg: `🔴 ${horas}h de HE em domingo/feriado (${datas}) — são HE 100%!`, cor: 'vermelho' });
      }
    }

    // 6. Time com maior absenteísmo
    const absPorSetor: Record<string, number> = {};
    let totalAbsH = 0;
    lancamentosFiltrados.forEach(l => {
      const p = pessoas.find((x: any)=>x.id===l.pessoa_id);
      const setor = p?.setor || 'Desconhecido';
      if (!absPorSetor[setor]) absPorSetor[setor] = 0;
      let h = 0;
      if (l.tipo==='falta-injustificada'||l.tipo==='atestado') h = horasUteisDia;
      else if (l.tipo==='atraso') h = +(l.minutos||0)/60;
      absPorSetor[setor] += h;
      totalAbsH += h;
    });
    if (totalAbsH > 0) {
      const [setorMaior] = Object.entries(absPorSetor).sort(([,a],[,b])=>b-a);
      if (setorMaior) {
        const pct = ((setorMaior[1]/totalAbsH)*100).toFixed(0);
        lista.push({ msg: `📊 Time ${setorMaior[0]} representa ${pct}% do absenteísmo no período`, cor: +pct>50?'vermelho':'neutro' });
      }
    }

    // 7. Conflito de férias no mesmo time
    const feriasMes = lancamentos.filter(l=>l.tipo==='férias' && l.data>=dataInicio && l.data<=dataFim);
    const feriasPorSetor: Record<string,number> = {};
    feriasMes.forEach(l => {
      const p = pessoas.find((x: any)=>x.id===l.pessoa_id);
      const setor = p?.setor||'';
      feriasPorSetor[setor] = (feriasPorSetor[setor]||0)+1;
    });
    Object.entries(feriasPorSetor).forEach(([setor, qtd]) => {
      if (qtd >= 2)
        lista.push({ msg: `⚠️ ${qtd} colaboradores do time ${setor} em férias no mesmo período — risco operacional!`, cor: 'vermelho' });
    });

    // 8. Sem HE
    if (totalHE === 0)
      lista.push({ msg: `✅ Sem horas extras registradas no período selecionado`, cor: 'verde' });

    // 9. Sem absenteísmo
    if (+abs.taxa === 0 && lancamentosFiltrados.length > 0)
      lista.push({ msg: `✅ Sem absenteísmo no período — time 100% presente!`, cor: 'verde' });

    // 10. Colaborador com maior HE
    const hePorPessoa: Record<number, number> = {};
    lancamentosFiltrados.filter(l=>l.tipo.includes('he')).forEach(l => {
      hePorPessoa[l.pessoa_id] = (hePorPessoa[l.pessoa_id]||0) + +(l.minutos||0);
    });
    const topHEEntry = Object.entries(hePorPessoa).sort(([,a],[,b])=>b-a)[0];
    if (topHEEntry && +topHEEntry[1] > 0) {
      const horas = (+topHEEntry[1]/60).toFixed(1);
      lista.push({ msg: `👤 ${pessoas.find((p: any) => p.id === +topHEEntry[0])?.nome || "Desconhecido"} é quem mais fez HE no período: ${horas}h`, cor: 'neutro' });
    }

    // 11a. Dia da semana com mais absenteísmo
    const absPorDiaSem: Record<number, number> = {};
    lancamentosFiltrados.forEach(l => {
      const diaSem = new Date(l.data+'T00:00:00').getDay();
      let h = 0;
      if (l.tipo==='falta-injustificada'||l.tipo==='atestado') h = horasUteisDia;
      else if (l.tipo==='atraso') h = +(l.minutos||0)/60;
      if (h > 0) absPorDiaSem[diaSem] = (absPorDiaSem[diaSem]||0) + h;
    });
    const topAbsDia = Object.entries(absPorDiaSem).sort(([,a],[,b])=>b-a)[0];
    if (topAbsDia && +topAbsDia[1] > 0) {
      lista.push({ msg: `📅 ${diasSemana[+topAbsDia[0]]} é o dia com mais absenteísmo no período (${(+topAbsDia[1]).toFixed(1)}h)`, cor: 'neutro' });
    }

    // 11b. Dia da semana com mais HE
    const hePorDiaSem: Record<number, number> = {};
    lancamentosFiltrados.filter(l=>l.tipo.includes('he')).forEach(l => {
      const diaSem = new Date(l.data+'T00:00:00').getDay();
      hePorDiaSem[diaSem] = (hePorDiaSem[diaSem]||0) + +(l.minutos||0);
    });
    const topHEDia = Object.entries(hePorDiaSem).sort(([,a],[,b])=>b-a)[0];
    if (topHEDia && +topHEDia[1] > 0) {
      lista.push({ msg: `📅 ${diasSemana[+topHEDia[0]]} é o dia com mais HE no período (${(+topHEDia[1]/60).toFixed(1)}h)`, cor: 'neutro' });
    }

    // 12. Proporção de HE por semana (variação última semana vs anterior)
    const semanas: Record<number, number> = {};
    lancamentosFiltrados.filter(l=>l.tipo.includes('he')).forEach(l => {
      const d = new Date(l.data+'T00:00:00');
      const inicio = new Date(dataInicio+'T00:00:00');
      const diffDias = Math.floor((d.getTime()-inicio.getTime())/(1000*60*60*24));
      const semana = Math.floor(diffDias/7);
      semanas[semana] = (semanas[semana]||0) + +(l.minutos||0);
    });
    const semanasOrdenadas = Object.entries(semanas).sort(([a],[b])=>+a-+b);
    if (semanasOrdenadas.length >= 2) {
      const ultima = +semanasOrdenadas[semanasOrdenadas.length-1][1];
      const penultima = +semanasOrdenadas[semanasOrdenadas.length-2][1];
      if (penultima > 0) {
        const variacao = ((ultima-penultima)/penultima*100).toFixed(0);
        const sinal = +variacao > 0 ? `aumento de ${variacao}%` : `redução de ${Math.abs(+variacao)}%`;
        const cor = +variacao > 20 ? 'vermelho' : +variacao < -10 ? 'verde' : 'neutro';
        lista.push({ msg: `📊 Última semana teve ${sinal} de HE em relação à semana anterior`, cor });
      }
    }

    // 13a. HE no pré e pós feriado
    let hePrePos = 0;
    let datasPrePos: string[] = [];
    feriados.forEach((f: any) => {
      const dFeriado = new Date(f.data+'T00:00:00');
      [-1, 1].forEach(offset => {
        const d = new Date(dFeriado);
        d.setDate(d.getDate() + offset);
        const dataStr = d.toISOString().split('T')[0];
        if (dataStr >= dataInicio && dataStr <= dataFim) {
          const mins = lancamentosFiltrados
            .filter(l => l.tipo.includes('he') && l.data === dataStr)
            .reduce((acc,l) => acc + +(l.minutos||0), 0);
          if (mins > 0) { hePrePos += mins; datasPrePos.push(dataStr); }
        }
      });
    });
    if (hePrePos > 0) {
      lista.push({ msg: `🗓️ ${(hePrePos/60).toFixed(1)}h de HE registradas em dias próximos a feriados — atenção ao planejamento!`, cor: 'vermelho' });
    }

    // 13b. Absenteísmo no pré e pós feriado
    let absPrePos = 0;
    feriados.forEach((f: any) => {
      const dFeriado = new Date(f.data+'T00:00:00');
      [-1, 1].forEach(offset => {
        const d = new Date(dFeriado);
        d.setDate(d.getDate() + offset);
        const dataStr = d.toISOString().split('T')[0];
        if (dataStr >= dataInicio && dataStr <= dataFim) {
          lancamentosFiltrados.forEach(l => {
            if (l.data === dataStr) {
              if (l.tipo==='falta-injustificada'||l.tipo==='atestado') absPrePos += horasUteisDia;
              else if (l.tipo==='atraso') absPrePos += +(l.minutos||0)/60;
            }
          });
        }
      });
    });
    if (absPrePos > 0) {
      lista.push({ msg: `🗓️ ${absPrePos.toFixed(1)}h de absenteísmo em dias próximos a feriados — padrão de emenda detectado!`, cor: 'vermelho' });
    }

    return lista;
  }, [dadosGraficoHE, totalHE, abs, metaHE, metaAbsenteismo, lancamentosFiltrados, pessoas, feriados, horasUteisDia, dataInicio, dataFim, lancamentos]);

  // ── Bônus com proporcional férias ────────────────────────────────────────────
  const calcularBonusComFerias = useCallback((pessoaId: number, anoMes: string) => {
    const feriasPessoa = lancamentos.filter(l => l.tipo === 'férias' && l.pessoa_id === pessoaId);
    if (feriasPessoa.length === 0) return VALOR_BONUS;

    const [ano, mes] = anoMes.split('-').map(Number);
    const totalDias = new Date(ano, mes, 0).getDate();
    let diasFerias = 0;

    feriasPessoa.forEach(f => {
      // Férias são armazenadas com data (início) e descricao contendo range
      // Usamos data como início; para o fim, tentamos extrair ou assumimos o próprio dia
      const inicio = new Date(f.data + 'T00:00:00');
      // Buscar fim pelo histórico (campo descricao não é confiável) — simplificado
      // Contamos apenas os dias de férias dentro do mês de referência
      const mesInicio = inicio.getMonth() + 1;
      const anoInicio = inicio.getFullYear();
      if (anoInicio === ano && mesInicio === mes) diasFerias += 1; // ao menos 1 dia
    });

    const proporcao = Math.max(0, (totalDias - diasFerias) / totalDias);
    return VALOR_BONUS * proporcao;
  }, [lancamentos]);

  const totalBonus = useMemo(() => {
    return bonusElegibilidade
      .filter(b => b.elegivel)
      .reduce((acc, b) => {
        const pessoa = pessoas.find(p => p.id === b.pessoa_id);
        if (!pessoa || pessoa.ativo === false) return acc;
        return acc + (b.valor_bonus ?? VALOR_BONUS);
      }, 0);
  }, [bonusElegibilidade, pessoas]);

  // ── Handlers ──────────────────────────────────────────────────────────────────

  // Adicionar pessoa
  const handleAdicionarPessoa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPessoa.nome.trim()) { mostrarToast('Preencha o nome!', 'err'); return; }
    setCarregando(true);
    try {
      const { data, error } = await supabase.from('pessoas')
        .insert([{ ...formPessoa, nome: formPessoa.nome.trim().toUpperCase(), ativo: true }])
        .select().single();
      if (error) throw error;
      setPessoas(p => [...p, data].sort((a,b)=>a.nome.localeCompare(b.nome)));
      await inicializarBonusPessoa(data.id);
      await registrarAuditoria('pessoas', 'INSERT', data);
      setFormPessoa({ nome: '', cargo: 'AJUDANTE GERAL', setor: 'Inbound' });
      mostrarToast('✅ Colaborador adicionado!');
    } catch (err: any) {
      mostrarToast('❌ Erro: ' + err.message, 'err');
    }
    setCarregando(false);
  };

  // Upload foto
  const handleUploadFoto = async (pessoaId: number, arquivo: File) => {
    try {
      const ext = arquivo.name.split('.').pop();
      const caminho = `${pessoaId}.${ext}`;
      const { error: upErr } = await supabase.storage.from('fotos').upload(caminho, arquivo, { upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from('fotos').getPublicUrl(caminho);
      const fotoUrl = urlData.publicUrl;
      await supabase.from('pessoas').update({ foto_url: fotoUrl }).eq('id', pessoaId);
      setPessoas(p => p.map(x => x.id === pessoaId ? { ...x, foto_url: fotoUrl } : x));
      mostrarToast('✅ Foto atualizada!');
    } catch (err: any) {
      mostrarToast('❌ Erro no upload: ' + err.message, 'err');
    }
  };

  // Deletar pessoa
  const handleDeletarPessoa = async (id: number) => {
    const pessoa = pessoas.find(p => p.id === id);
    const senha = prompt(`⚠️ Deletar ${pessoa?.nome}?\nDigite a senha SUPER ADMIN:`);
    if (!senha) return;
    if (senha !== 'DELETAR2026') { mostrarToast('❌ Senha incorreta!', 'err'); return; }
    try {
      await supabase.from('bonus_elegibilidade').delete().eq('pessoa_id', id);
      await supabase.from('pessoas').delete().eq('id', id);
      await registrarAuditoria('pessoas', 'DELETE', null, pessoa);
      setPessoas(p => p.filter(x => x.id !== id));
      setBonusElegibilidade(b => b.filter(x => x.pessoa_id !== id));
      mostrarToast('✅ Colaborador deletado!');
    } catch (err: any) {
      mostrarToast('❌ Erro: ' + err.message, 'err');
    }
  };

  // Ativar/inativar colaborador — BUG 3: inativar também seta bonus = false
  const handleToggleAtivo = async (pessoaId: number, ativoAtual: boolean) => {
    try {
      const novoAtivo = !ativoAtual;
      const { error } = await supabase.from('pessoas').update({ ativo: novoAtivo }).eq('id', pessoaId);
      if (error) throw error;
      setPessoas(p => p.map(x => x.id === pessoaId ? { ...x, ativo: novoAtivo } : x));

      if (!novoAtivo) {
        // BUG 3: inativar colaborador → desclassificar bonus automaticamente
        await desclassificarBonus(pessoaId, 'Colaborador inativado');
      }
      mostrarToast(`✅ Colaborador ${novoAtivo ? 'ativado' : 'inativado'}!`);
    } catch (err: any) {
      mostrarToast('❌ Erro: ' + err.message, 'err');
    }
  };

  // Adicionar cargo
  const handleAdicionarCargo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCargo.nome || !formCargo.he60 || !formCargo.he100) {
      mostrarToast('Preencha todos os campos!', 'err'); return;
    }
    const nome = formCargo.nome.toUpperCase();
    if (tabelaHE[nome]) { mostrarToast('Cargo já existe!', 'err'); return; }
    try {
      const { data, error } = await supabase.from('tabela_he').insert([{
        cargo: nome, he60: +formCargo.he60, he100: +formCargo.he100
      }]).select().single();
      if (error) throw error;
      setTabelaHE(t => ({ ...t, [nome]: { he60: +formCargo.he60, he100: +formCargo.he100 } }));
      await registrarAuditoria('tabela_he', 'INSERT', data);
      setFormCargo({ nome: '', he60: '', he100: '' });
      mostrarToast('✅ Cargo adicionado!');
    } catch (err: any) {
      mostrarToast('❌ Erro: ' + err.message, 'err');
    }
  };

  // Deletar cargo
  const handleDeletarCargo = async (nome: string) => {
    if (pessoas.some(p => p.cargo === nome)) {
      mostrarToast('❌ Colaboradores com este cargo existem!', 'err'); return;
    }
    if (!confirm(`Deletar cargo "${nome}"?`)) return;
    try {
      await supabase.from('tabela_he').delete().eq('cargo', nome);
      await registrarAuditoria('tabela_he', 'DELETE', null, { cargo: nome, ...tabelaHE[nome] });
      setTabelaHE(t => { const n = { ...t }; delete n[nome]; return n; });
      mostrarToast('✅ Cargo deletado!');
    } catch (err: any) {
      mostrarToast('❌ Erro: ' + err.message, 'err');
    }
  };

  // Adicionar lançamento
  const handleAdicionarLancamento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formLancamento.data) { mostrarToast('Selecione a data!', 'err'); return; }
    if (!formLancamento.pessoaId) { mostrarToast('Selecione o colaborador!', 'err'); return; }

    const { tipo, pessoaId, data, descricao, avisoComunicado } = formLancamento;
    const minutos = +formLancamento.minutos || 0;
    const horas = +formLancamento.horas || 0;

    // BUG 8 + BUG 9: montar payload correto por tipo
    let payload: any = {
      pessoa_id: pessoaId, tipo, data, descricao,
      horas: 0, minutos: 0
    };

    if (tipo === 'he-60' || tipo === 'he-100') {
      // Unidade: minutos, valor livre
      payload.minutos = minutos;
      payload.horas = +(minutos / 60).toFixed(4);
    } else if (tipo === 'falta-injustificada' || tipo === 'atestado') {
      // Unidade: dia, valor fixo = 1
      payload.horas = 1;
      payload.minutos = 0;
    } else if (tipo === 'advertencia') {
      // BUG 9: gravar 1 fixo em horas (campo numeric)
      payload.horas = 1;
      payload.minutos = 0;
    } else if (tipo === 'atraso' || tipo === 'saida-antecipada') {
      // Unidade: minutos, valor livre
      payload.minutos = minutos;
      payload.horas = +(minutos / 60).toFixed(4);
    } else if (tipo === 'atestado-horas') {
      // Unidade: horas, valor livre
      payload.horas = horas;
      payload.minutos = 0;
    }

    setCarregando(true);
    try {
      const { data: novo, error } = await supabase.from('lancamentos').insert([payload]).select().single();
      if (error) throw error;

      // Atualizar estado local imediatamente — BUG 7
      setLancamentos(l => [novo, ...l]);
      await registrarAuditoria('lancamentos', 'INSERT', novo);

      // Desclassificação automática de bonus
      if (tipo === 'falta-injustificada') {
        await desclassificarBonus(pessoaId, `Falta injustificada em ${data}`);
      } else if (tipo === 'advertencia') {
        // BUG 9: advertência desclassifica bonus
        await desclassificarBonus(pessoaId, `Advertência registrada em ${data}`);
      } else if ((tipo === 'atraso' || tipo === 'saida-antecipada') && !avisoComunicado) {
        await desclassificarBonus(pessoaId, `${getTipoLabel(tipo)} sem aviso em ${data}`);
      }

      setFormLancamento(f => ({
        ...f, data: '', horas: '', minutos: '', descricao: '', avisoComunicado: true
      }));
      mostrarToast('✅ Lançamento registrado!');
    } catch (err: any) {
      mostrarToast('❌ Erro: ' + err.message, 'err');
    }
    setCarregando(false);
  };

  // Deletar lançamento
  const handleDeletarLancamento = async (id: number) => {
    const lanc = lancamentos.find(l => l.id === id);
    const pessoa = pessoas.find(p => p.id === lanc?.pessoa_id);
    if (!confirm(`Deletar lançamento de ${pessoa?.nome}?`)) return;
    try {
      await supabase.from('lancamentos').delete().eq('id', id);
      await registrarAuditoria('lancamentos', 'DELETE', null, lanc);
      setLancamentos(l => l.filter(x => x.id !== id));
      mostrarToast('✅ Lançamento deletado!');
    } catch (err: any) {
      mostrarToast('❌ Erro: ' + err.message, 'err');
    }
  };

  // Registrar férias — BUG 1: usar created_at, não criado_em
  const handleAdicionarFerias = async (e: React.FormEvent) => {
    e.preventDefault();
    const { pessoaId, dataInicio: dIni, dataFim: dFim } = formFerias;
    if (!pessoaId || !dIni || !dFim) { mostrarToast('Preencha todos os campos!', 'err'); return; }
    if (dFim < dIni) { mostrarToast('Data fim deve ser após data início!', 'err'); return; }
    setCarregando(true);
    try {
      const descricao = `Férias de ${new Date(dIni+'T00:00:00').toLocaleDateString('pt-BR')} a ${new Date(dFim+'T00:00:00').toLocaleDateString('pt-BR')}`;
      const { data: novo, error } = await supabase.from('lancamentos').insert([{
        pessoa_id: pessoaId, tipo: 'férias', data: dIni,
        horas: 0, minutos: 0, descricao
        // Nota: created_at é automático; NÃO usar criado_em (BUG 1)
      }]).select().single();
      if (error) throw error;
      setLancamentos(l => [novo, ...l]);

      // Calcular proporcional — considera apenas dias de férias dentro do mês atual
      const hoje = new Date();
      const mesAtual = hoje.getMonth() + 1;
      const anoAtual = hoje.getFullYear();
      const totalDias = new Date(anoAtual, mesAtual, 0).getDate();
      const primeiroDiaMes = new Date(anoAtual, mesAtual - 1, 1);
      const ultimoDiaMes = new Date(anoAtual, mesAtual - 1, totalDias);
      const inicio = new Date(dIni + 'T00:00:00');
      const fim = new Date(dFim + 'T00:00:00');
      const inicioEfetivo = inicio > primeiroDiaMes ? inicio : primeiroDiaMes;
      const fimEfetivo = fim < ultimoDiaMes ? fim : ultimoDiaMes;
      let diasFeriasNoMes = 0;
      if (inicioEfetivo <= fimEfetivo) {
        for (let d = new Date(inicioEfetivo); d <= fimEfetivo; d.setDate(d.getDate() + 1)) diasFeriasNoMes++;
      }
      const proporcao = Math.max(0, (totalDias - diasFeriasNoMes) / totalDias);
      const valorProp = diasFeriasNoMes === 0 ? VALOR_BONUS : +(VALOR_BONUS * proporcao).toFixed(2);

      // Persistir valor proporcional no banco — BUG 5
      const bonus = bonusElegibilidade.find(b => b.pessoa_id === pessoaId);
      if (bonus && bonus.elegivel) {
        await supabase.from('bonus_elegibilidade').update({ valor_bonus: valorProp }).eq('id', bonus.id);
        setBonusElegibilidade(b => b.map(x => x.id === bonus.id ? { ...x, valor_bonus: valorProp } : x));
      }

      await registrarAuditoria('lancamentos', 'INSERT', novo);
      setFormFerias(f => ({ ...f, dataInicio: '', dataFim: '' }));
      mostrarToast('✅ Férias registradas!');
    } catch (err: any) {
      mostrarToast('❌ Erro: ' + err.message, 'err');
    }
    setCarregando(false);
  };

  // Deletar férias
  const handleDeletarFerias = async (id: number) => {
    const ferias = lancamentos.find((l: any) => l.id === id);
    const pessoa = pessoas.find((p: any) => p.id === ferias?.pessoa_id);
    if (!confirm(`Excluir férias de ${pessoa?.nome}?\n${ferias?.descricao}`)) return;
    try {
      await supabase.from('lancamentos').delete().eq('id', id);
      setLancamentos(l => l.filter((x: any) => x.id !== id));
      // Recalcular bonus: se era o único período de férias no mês, volta a 100
      const feriasPessoa = lancamentos.filter((l: any) =>
        l.id !== id && l.tipo === 'férias' && l.pessoa_id === ferias?.pessoa_id
      );
      if (feriasPessoa.length === 0) {
        const bonus = bonusElegibilidade.find(b => b.pessoa_id === ferias?.pessoa_id);
        if (bonus && bonus.elegivel) {
          await supabase.from('bonus_elegibilidade').update({ valor_bonus: 100 }).eq('id', bonus.id);
          setBonusElegibilidade(b => b.map(x => x.id === bonus.id ? { ...x, valor_bonus: 100 } : x));
        }
      }
      mostrarToast('✅ Férias excluídas!');
    } catch (err: any) {
      mostrarToast('❌ Erro: ' + err.message, 'err');
    }
  };


  // Toggle bonus
  const handleToggleBonus = async (pessoaId: number, novaElegibilidade: boolean) => {
    try {
      const hoje = new Date().toISOString().split('T')[0];
      const existing = bonusElegibilidade.find(b => b.pessoa_id === pessoaId);
      const payload = {
        elegivel: novaElegibilidade,
        data_desclassificacao: novaElegibilidade ? null : hoje,
        motivo_desclassificacao: novaElegibilidade ? null : 'Ajuste manual do gerente'
      };
      if (existing) {
        await supabase.from('bonus_elegibilidade').update(payload).eq('pessoa_id', pessoaId);
        setBonusElegibilidade(b => b.map(x => x.pessoa_id === pessoaId ? { ...x, ...payload } : x));
      } else {
        const { data: novo } = await supabase.from('bonus_elegibilidade').insert([{
          pessoa_id: pessoaId, ...payload,
          data_inicio_elegibilidade: hoje
        }]).select().single();
        if (novo) setBonusElegibilidade(b => [...b, novo]);
      }
      mostrarToast(`✅ ${novaElegibilidade ? 'Elegível' : 'Desclassificado'}!`);
    } catch (err: any) {
      mostrarToast('❌ Erro: ' + err.message, 'err');
    }
  };

  // Reverter desclassificação
  const handleReverterBonus = async (pessoaId: number) => {
    if (!confirm('Reverter desclassificação? Pessoa volta a ser elegível?')) return;
    try {
      await supabase.from('bonus_elegibilidade').update({
        elegivel: true, data_desclassificacao: null, motivo_desclassificacao: null
      }).eq('pessoa_id', pessoaId);
      setBonusElegibilidade(b => b.map(x =>
        x.pessoa_id === pessoaId ? { ...x, elegivel: true, data_desclassificacao: undefined, motivo_desclassificacao: undefined } : x
      ));
      mostrarToast('✅ Desclassificação revertida!');
    } catch (err: any) {
      mostrarToast('❌ Erro: ' + err.message, 'err');
    }
  };

  // Reset mensal
  const handleResetMensal = async () => {
    if (!confirm('⚠️ RESET MENSAL — todos os colaboradores ATIVOS voltarão a ser elegíveis. Confirmar?')) return;
    try {
      for (const bonus of bonusElegibilidade) {
        const pessoa = pessoas.find(p => p.id === bonus.pessoa_id);
        if (pessoa?.ativo !== false) {
          await supabase.from('bonus_elegibilidade').update({
            elegivel: true, data_desclassificacao: null, motivo_desclassificacao: null, valor_bonus: VALOR_BONUS
          }).eq('id', bonus.id);
        }
      }
      const { data } = await supabase.from('bonus_elegibilidade').select('*');
      if (data) setBonusElegibilidade(data);
      mostrarToast('✅ Reset mensal realizado!');
    } catch (err: any) {
      mostrarToast('❌ Erro: ' + err.message, 'err');
    }
  };

  // Limpar auditoria > 30 dias — BUG 6
  const handleLimparAuditoria = async () => {
    const senha = prompt('Digite a senha para limpar registros de auditoria com mais de 30 dias:');
    if (senha !== APP_PASSWORD) { mostrarToast('❌ Senha incorreta!', 'err'); return; }
    try {
      const limite = new Date();
      limite.setDate(limite.getDate() - 30);
      const { error } = await supabase.from('auditoria').delete().lt('criado_em', limite.toISOString());
      if (error) throw error;
      const { data } = await supabase.from('auditoria').select('*').order('criado_em', { ascending: false });
      if (data) setAuditoria(data);
      mostrarToast('✅ Auditoria limpa (>30 dias)!');
    } catch (err: any) {
      mostrarToast('❌ Erro: ' + err.message, 'err');
    }
  };

  // Feriados
  const handleAdicionarFeriado = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFeriado.data || !formFeriado.descricao) { mostrarToast('Preencha todos os campos!', 'err'); return; }
    try {
      const { data: novo, error } = await supabase.from('feriados').insert([formFeriado]).select().single();
      if (error) throw error;
      setFeriados(f => [...f, novo].sort((a,b)=>a.data.localeCompare(b.data)));
      setFormFeriado({ data: '', descricao: '', tipo: 'nacional' });
      mostrarToast('✅ Feriado adicionado!');
    } catch (err: any) { mostrarToast('❌ Erro: ' + err.message, 'err'); }
  };

  const handleDeletarFeriado = async (id: number) => {
    if (!confirm('Deletar feriado?')) return;
    try {
      await supabase.from('feriados').delete().eq('id', id);
      setFeriados(f => f.filter(x => x.id !== id));
      mostrarToast('✅ Feriado removido!');
    } catch (err: any) { mostrarToast('❌ Erro: ' + err.message, 'err'); }
  };

  // Exportar CSV
  const exportarCSV = () => {
    const dados = lancamentos.map(l => {
      const p = pessoas.find(x => x.id === l.pessoa_id);
      const tab = tabelaHE[p?.cargo || ''];
      const mins = +(l.minutos || 0);
      const val = l.tipo === 'he-60' ? (tab?.he60||0)*(mins/60) : l.tipo === 'he-100' ? (tab?.he100||0)*(mins/60) : 0;
      return {
        Pessoa: p?.nome, Setor: p?.setor, Cargo: p?.cargo,
        Tipo: getTipoLabel(l.tipo),
        Data: new Date(l.data+'T00:00:00').toLocaleDateString('pt-BR'),
        Minutos: l.minutos || 0, Horas: l.horas || 0,
        'Valor (R$)': val.toFixed(2)
      };
    });
    const headers = ['Pessoa','Setor','Cargo','Tipo','Data','Minutos','Horas','Valor (R$)'];
    const csv = [headers.join(','), ...dados.map(row =>
      headers.map(h => { const v = (row as any)[h]; return typeof v === 'string' && v.includes(',') ? `"${v}"` : v; }).join(',')
    )].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'Daxia_Lancamentos.csv';
    link.click();
  };

  // Relatório bônus TXT
  const exportarRelatorioBonus = () => {
    const elegiveis = bonusElegibilidade.filter(b => b.elegivel && pessoas.find(p => p.id === b.pessoa_id && p.ativo !== false));
    const descl = bonusElegibilidade.filter(b => !b.elegivel && pessoas.find(p => p.id === b.pessoa_id));
    let txt = `DAXIA PEOPLE ANALYTICS - RELATÓRIO DE BÔNUS\nData: ${new Date().toLocaleDateString('pt-BR')}\n${'='.repeat(60)}\n\n`;
    txt += `RESUMO\n${'-'.repeat(60)}\nElegíveis: ${elegiveis.length}\nDesclassificados: ${descl.length}\nTotal a pagar: R$ ${totalBonus.toFixed(2)}\n\n`;
    txt += `ELEGÍVEIS\n${'-'.repeat(60)}\n`;
    elegiveis.forEach((b,i) => {
      const p = pessoas.find(x=>x.id===b.pessoa_id);
      txt += `${i+1}. ${p?.nome} (${p?.cargo}) - R$ ${(b.valor_bonus ?? VALOR_BONUS).toFixed(2)}\n`;
    });
    txt += `\nDESCLASSIFICADOS\n${'-'.repeat(60)}\n`;
    descl.forEach((b,i) => {
      const p = pessoas.find(x=>x.id===b.pessoa_id);
      txt += `${i+1}. ${p?.nome} - ${b.motivo_desclassificacao || 'Não especificado'}\n`;
    });
    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Bonus_${new Date().toISOString().split('T')[0]}.txt`;
    link.click();
  };

// ── Gauge ────────────────────────────────────────────────────────────────────
  const Gauge = ({ value, max, label }: { value: number; max: number; label: string }) => {
    const pct = Math.min((value / (max || 1)) * 100, 100);
    const cor = pct >= 80 ? '#EF4444' : pct >= 50 ? '#F59E0B' : '#10B981';
    const textCor = pct >= 80 ? 'text-red-700' : pct >= 50 ? 'text-yellow-700' : 'text-green-700';
    const bg = pct >= 80 ? 'bg-red-50' : pct >= 50 ? 'bg-yellow-50' : 'bg-green-50';
    return (
      <div className={`flex flex-col items-center gap-4 p-6 rounded-xl ${bg}`}>
        <svg width="120" height="120" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="50" fill="none" stroke="#E5E7EB" strokeWidth="8"/>
          <circle cx="60" cy="60" r="50" fill="none" stroke={cor} strokeWidth="8"
            strokeDasharray={`${(pct/100)*314.159} 314.159`} strokeLinecap="round"
            style={{ transform: 'rotate(-90deg)', transformOrigin: '60px 60px', transition: 'stroke-dasharray 0.5s ease' }}/>
          <text x="60" y="65" textAnchor="middle" fontSize="26" fontWeight="bold" fill="#111827">{pct.toFixed(0)}%</text>
        </svg>
        <div className="text-center">
          <p className={`text-base font-bold ${textCor}`}>{label}</p>
          <p className="text-xs text-gray-500 mt-1">{value.toFixed(0)} / {max.toFixed(0)}</p>
        </div>
      </div>
    );
  };

  // ── Loading ───────────────────────────────────────────────────────────────────
  if (!hidratado) return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-100 flex items-center justify-center">
      <div className="text-center">
        <div className="text-5xl mb-4">🏗️</div>
        <p className="text-2xl font-bold text-blue-600 mb-2">Carregando...</p>
        <p className="text-gray-500">Conectando ao Supabase</p>
      </div>
    </div>
  );


  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">


      {/* ── MODAL GUIA ── */}
      {guiaAberto && (
        <GuiaModal
          passo={guiaPasso}
          setPasso={setGuiaPasso}
          abaFiltro={guiaAba}
          onFechar={() => {
            setGuiaAberto(false);
            setGuiaPasso(0);
            localStorage.setItem('daxia_guia_visto', 'true');
          }}
        />
      )}

      {/* Toast de feedback — BUG UX */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-xl shadow-xl font-semibold text-white transition-all
          ${toast.tipo === 'ok' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}

      {/* Loading overlay */}
      {carregando && (
        <div className="fixed inset-0 z-40 bg-black/30 flex items-center justify-center">
          <div className="bg-white rounded-xl p-6 shadow-2xl text-center">
            <p className="text-xl font-bold text-blue-600">⏳ Aguarde...</p>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto p-4 md:p-6">
        {/* Header */}
        <div className="mb-6 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div className="flex items-center gap-3">
            <svg viewBox="0 0 80 60" width="64" height="48" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
                  <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
                <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.15"/>
                  <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.05"/>
                </linearGradient>
              </defs>
              {/* Base/chão reflexo */}
              <ellipse cx="42" cy="56" rx="28" ry="3" fill="#38bdf8" opacity="0.15"/>
              {/* Corpo principal */}
              <rect x="22" y="26" width="36" height="22" rx="2" fill="url(#bodyGrad)" stroke="#38bdf8" strokeWidth="1" filter="url(#glow)"/>
              {/* Linhas de detalhe corpo */}
              <line x1="22" y1="34" x2="58" y2="34" stroke="#38bdf8" strokeWidth="0.5" opacity="0.6"/>
              <line x1="40" y1="26" x2="40" y2="48" stroke="#38bdf8" strokeWidth="0.5" opacity="0.4"/>
              {/* Cabine */}
              <rect x="38" y="16" width="18" height="16" rx="2" fill="url(#bodyGrad)" stroke="#38bdf8" strokeWidth="1" filter="url(#glow)"/>
              {/* Vidro cabine com brilho */}
              <rect x="40" y="18" width="14" height="10" rx="1" fill="#38bdf8" opacity="0.18" stroke="#7dd3fc" strokeWidth="0.5"/>
              <line x1="40" y1="18" x2="54" y2="28" stroke="#7dd3fc" strokeWidth="0.4" opacity="0.5"/>
              {/* Mastro vertical */}
              <rect x="16" y="8" width="5" height="38" rx="1" fill="none" stroke="#38bdf8" strokeWidth="1.2" filter="url(#glow)"/>
              <line x1="18" y1="8" x2="18" y2="46" stroke="#7dd3fc" strokeWidth="0.4" opacity="0.7"/>
              {/* Garfo superior */}
              <rect x="2" y="12" width="18" height="3" rx="0.5" fill="none" stroke="#38bdf8" strokeWidth="1" filter="url(#glow)"/>
              {/* Garfo inferior */}
              <rect x="2" y="20" width="18" height="3" rx="0.5" fill="none" stroke="#38bdf8" strokeWidth="1" filter="url(#glow)"/>
              {/* Carga holográfica */}
              <rect x="2" y="8" width="12" height="12" rx="1" fill="#38bdf8" opacity="0.1" stroke="#7dd3fc" strokeWidth="0.8" strokeDasharray="2,1"/>
              <line x1="2" y1="14" x2="14" y2="14" stroke="#7dd3fc" strokeWidth="0.4" opacity="0.6"/>
              <line x1="8" y1="8" x2="8" y2="20" stroke="#7dd3fc" strokeWidth="0.4" opacity="0.6"/>
              {/* Roda dianteira */}
              <circle cx="28" cy="48" r="6" fill="none" stroke="#38bdf8" strokeWidth="1.2" filter="url(#glow)"/>
              <circle cx="28" cy="48" r="3" fill="none" stroke="#7dd3fc" strokeWidth="0.8"/>
              <circle cx="28" cy="48" r="1" fill="#38bdf8" opacity="0.8"/>
              {/* Roda traseira */}
              <circle cx="50" cy="48" r="6" fill="none" stroke="#38bdf8" strokeWidth="1.2" filter="url(#glow)"/>
              <circle cx="50" cy="48" r="3" fill="none" stroke="#7dd3fc" strokeWidth="0.8"/>
              <circle cx="50" cy="48" r="1" fill="#38bdf8" opacity="0.8"/>
              {/* Contrapeso */}
              <rect x="56" y="30" width="8" height="14" rx="1" fill="none" stroke="#38bdf8" strokeWidth="1" filter="url(#glow)"/>
              <line x1="56" y1="37" x2="64" y2="37" stroke="#7dd3fc" strokeWidth="0.4" opacity="0.6"/>
              {/* Pontos de luz nos cantos */}
              <circle cx="22" cy="26" r="1" fill="#38bdf8" opacity="0.9"/>
              <circle cx="58" cy="26" r="1" fill="#38bdf8" opacity="0.9"/>
              <circle cx="22" cy="48" r="1" fill="#38bdf8" opacity="0.9"/>
              <circle cx="58" cy="48" r="1" fill="#38bdf8" opacity="0.9"/>
              <circle cx="16" cy="8" r="1.2" fill="#7dd3fc" opacity="0.9"/>
              {/* Linhas de scan animadas */}
              <line x1="16" y1="28" x2="65" y2="28" stroke="#38bdf8" strokeWidth="0.3" opacity="0.3" strokeDasharray="3,2"/>
              <line x1="16" y1="38" x2="65" y2="38" stroke="#38bdf8" strokeWidth="0.3" opacity="0.3" strokeDasharray="3,2"/>
            </svg>
            </svg>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-blue-700">Daxia People Analytics</h1>
              <p className="text-gray-500 text-sm">Guarulhos/SP • Sincronizado ✅</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={exportarCSV}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-1">
              📊 Exportar CSV
            </button>
            <button onClick={() => { setGuiaAberto(true); setGuiaPasso(0); setGuiaAba(null); }}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm">
              ❓ Guia
            </button>
            <button onClick={onLogout}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold text-sm">
              🔒 Sair
            </button>
          </div>
        </div>

        {/* Navegação — desktop topo, mobile bottom */}
        <div className="hidden md:flex gap-1 mb-6 border-b-2 border-gray-200 overflow-x-auto">
          {[
            ['resumos','📊 Resumos'],['dashboard','📈 Dashboard'],['calendario','📅 Calendário'],['comparativo','📊 Comparativo'],['calor','🌡️ Mapa Calor'],['lancamentos','📝 Lançamentos'],
            ['ferias','🏖️ Férias'],['bonus','🎁 Bônus'],['cha','🧠 Matriz CHA'],['auditoria','🔍 Auditoria'],['configuracao','⚙️ Config']
          ].map(([id, label]) => (
            <button key={id} onClick={() => setAbaAtiva(id)}
              className={`px-5 py-3 font-bold whitespace-nowrap transition text-sm
                ${abaAtiva === id ? 'text-blue-600 border-b-4 border-blue-600 bg-blue-50 rounded-t-lg' : 'text-gray-500 hover:text-gray-800'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Menu mobile fixo */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 flex justify-around py-2 shadow-lg">
          {[
            ['resumos','📊'],['calendario','📅'],['comparativo','📊'],['calor','🌡️'],['lancamentos','📝'],['bonus','🎁'],['configuracao','⚙️']
          ].map(([id, icon]) => (
            <button key={id} onClick={() => setAbaAtiva(id)}
              className={`flex flex-col items-center text-xs px-2 py-1 rounded-lg
                ${abaAtiva === id ? 'text-blue-600 font-bold' : 'text-gray-500'}`}>
              <span className="text-xl">{icon}</span>
              <span>{id === 'lancamentos' ? 'Lanç.' : id.charAt(0).toUpperCase() + id.slice(1,5)}</span>
            </button>
          ))}
        </div>


        {/* Botão de ajuda contextual flutuante — aparece em todas as abas */}
        <button
          onClick={() => { setGuiaAberto(true); setGuiaPasso(0); setGuiaAba(abaAtiva); }}
          className="fixed bottom-24 right-4 md:bottom-6 md:right-6 z-20 bg-blue-600 hover:bg-blue-700 text-white w-12 h-12 rounded-full shadow-lg font-bold text-xl flex items-center justify-center"
          title="Ajuda desta aba">
          ❓
        </button>

        {/* ══ ABA: RESUMOS ══ */}
        {abaAtiva === 'resumos' && (
          <div className="pb-20 md:pb-0">
            {/* Filtros */}
            <div className="bg-white rounded-xl shadow p-5 mb-6">
              <h2 className="text-lg font-bold text-gray-700 mb-3">🔍 Filtros</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">📅 Data Início</label>
                  <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)}
                    className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 text-sm"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">📅 Data Fim</label>
                  <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)}
                    className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 text-sm"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">🏢 Setor</label>
                  <select value={setorFiltro} onChange={e => setSetorFiltro(e.target.value)}
                    className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 text-sm">
                    <option value="">Todos os setores</option>
                    {setoresLista.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Cards KPI */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <div className="bg-white rounded-xl shadow p-4 border-l-4 border-red-500">
                <p className="text-gray-500 text-xs font-semibold">📉 Absenteísmo</p>
                <p className="text-3xl font-bold text-red-600 mt-1">{abs.taxa}%</p>
                <p className="text-red-400 text-xs mt-1">{abs.horasAbs}h ausentes</p>
              </div>
              <div className="bg-white rounded-xl shadow p-4 border-l-4 border-blue-500">
                <p className="text-gray-500 text-xs font-semibold">💰 Total HE</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">R$ {totalHE.toFixed(0)}</p>
                <p className="text-blue-400 text-xs mt-1">{lancamentosFiltrados.filter(l=>l.tipo.includes('he')).length} registros</p>
              </div>
              <div className="bg-white rounded-xl shadow p-4 border-l-4 border-green-500">
                <p className="text-gray-500 text-xs font-semibold">👥 Colaboradores</p>
                <p className="text-3xl font-bold text-green-600 mt-1">
                  {setorFiltro ? pessoasAtivas.filter(p=>p.setor===setorFiltro).length : pessoasAtivas.length}
                </p>
                <p className="text-green-400 text-xs mt-1">Ativos</p>
              </div>
              <div className="bg-white rounded-xl shadow p-4 border-l-4 border-purple-500">
                <p className="text-gray-500 text-xs font-semibold">📋 Lançamentos</p>
                <p className="text-3xl font-bold text-purple-600 mt-1">{lancamentosFiltrados.length}</p>
                <p className="text-purple-400 text-xs mt-1">No período</p>
              </div>
            </div>

            {/* Insights Inteligentes */}
            <div className="bg-white rounded-xl shadow p-5 mb-6">
              <h2 className="text-lg font-bold text-gray-700 mb-4">💡 Insights Inteligentes</h2>
              {insights.length === 0 ? (
                <p className="text-gray-400 text-sm">Sem dados suficientes para gerar insights.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {insights.slice(0, 9).map((ins, i) => (
                    <div key={i} className={`p-4 rounded-lg border-l-4 text-sm font-semibold
                      ${ins.cor === 'vermelho' ? 'bg-red-50 border-red-500 text-red-800' :
                        ins.cor === 'verde' ? 'bg-green-50 border-green-500 text-green-800' :
                        'bg-blue-50 border-blue-400 text-blue-800'}`}>
                      {ins.msg}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-white rounded-xl shadow p-5">
                <h2 className="text-base font-bold text-gray-700 mb-4">💰 HE ao longo do tempo</h2>
                {dadosGraficoHE.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={dadosGraficoHE}>
                      <CartesianGrid strokeDasharray="3 3"/>
                      <XAxis dataKey="data" tick={{ fontSize: 11 }}/>
                      <YAxis tick={{ fontSize: 11 }}/>
                      <Tooltip formatter={v => `R$ ${(+v).toFixed(2)}`}/>
                      <Line type="monotone" dataKey="valor" stroke="#3b82f6" name="HE (R$)" strokeWidth={2} dot={{ r: 3 }}/>
                    </LineChart>
                  </ResponsiveContainer>
                ) : <p className="text-gray-400 text-center py-8 text-sm">Sem dados</p>}
              </div>
              <div className="bg-white rounded-xl shadow p-5">
                <h2 className="text-base font-bold text-gray-700 mb-4">📉 Absenteísmo ao longo do tempo</h2>
                {dadosGraficoAbs.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={dadosGraficoAbs}>
                      <CartesianGrid strokeDasharray="3 3"/>
                      <XAxis dataKey="data" tick={{ fontSize: 11 }}/>
                      <YAxis tick={{ fontSize: 11 }}/>
                      <Tooltip formatter={v => `${(+v).toFixed(1)}h`}/>
                      <Area type="monotone" dataKey="valor" stroke="#ef4444" fill="#fecaca" name="Abs (h)"/>
                    </AreaChart>
                  </ResponsiveContainer>
                ) : <p className="text-gray-400 text-center py-8 text-sm">Sem dados</p>}
              </div>
            </div>

            {/* Top 10 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow p-5">
                <h2 className="text-base font-bold text-gray-700 mb-3">🏆 Top 10 — Maior HE</h2>
                <div className="space-y-2">
                  {topHE.length > 0 ? topHE.map((p, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
                      <Avatar pessoa={p.pessoa} tamanho="sm"/>
                      <span className="flex-1 text-sm font-semibold text-gray-800">{i+1}. {p.nome}</span>
                      <span className="text-blue-600 font-bold text-sm">R$ {p.valor.toFixed(2)}</span>
                    </div>
                  )) : <p className="text-gray-400 text-sm text-center py-4">Sem dados</p>}
                </div>
              </div>
              <div className="bg-white rounded-xl shadow p-5">
                <h2 className="text-base font-bold text-gray-700 mb-3">🏆 Top 10 — Maior Absenteísmo</h2>
                <div className="space-y-2">
                  {topAbs.filter(p=>p.valor>0).length > 0 ? topAbs.filter(p=>p.valor>0).map((p, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-red-50 rounded-lg">
                      <Avatar pessoa={p.pessoa} tamanho="sm"/>
                      <span className="flex-1 text-sm font-semibold text-gray-800">{i+1}. {p.nome}</span>
                      <span className="text-red-600 font-bold text-sm">{p.valor.toFixed(1)}h</span>
                    </div>
                  )) : <p className="text-gray-400 text-sm text-center py-4">Sem dados</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══ ABA: DASHBOARD ══ */}
        {abaAtiva === 'dashboard' && (
          <div className="pb-20 md:pb-0 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow p-4"><Gauge value={totalHE} max={metaHE} label="HE vs Meta (R$)"/></div>
              <div className="bg-white rounded-xl shadow p-4"><Gauge value={+abs.taxa} max={metaAbsenteismo} label="Absenteísmo vs Meta (%)"/></div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total HE', valor: `R$ ${totalHE.toFixed(2)}`, sub: `Meta: R$ ${metaHE}`, cor: 'from-blue-500 to-blue-600' },
                { label: 'Absenteísmo', valor: `${abs.taxa}%`, sub: `Meta: ${metaAbsenteismo}%`, cor: 'from-red-500 to-red-600' },
                { label: 'Colaboradores', valor: pessoasAtivas.length, sub: 'Ativos', cor: 'from-green-500 to-green-600' },
                { label: 'Lançamentos', valor: lancamentos.length, sub: 'Total', cor: 'from-purple-500 to-purple-600' },
              ].map((card, i) => (
                <div key={i} className={`bg-gradient-to-br ${card.cor} text-white rounded-xl shadow p-5`}>
                  <p className="text-xs font-semibold opacity-80">{card.label}</p>
                  <p className="text-2xl font-bold mt-1">{card.valor}</p>
                  <p className="text-xs opacity-70 mt-1">{card.sub}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={`rounded-xl p-6 shadow ${totalHE > metaHE ? 'bg-red-50 border-l-4 border-red-500' : 'bg-green-50 border-l-4 border-green-500'}`}>
                <h3 className="text-lg font-bold text-gray-700 mb-2">📊 Status HE</h3>
                <p className={`font-bold ${totalHE > metaHE ? 'text-red-600' : 'text-green-600'}`}>
                  {totalHE > metaHE ? '⚠️ Acima da Meta' : '✅ Dentro da Meta'}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {totalHE > metaHE
                    ? `R$ ${(totalHE - metaHE).toFixed(2)} acima`
                    : `R$ ${(metaHE - totalHE).toFixed(2)} abaixo`}
                </p>
              </div>
              <div className={`rounded-xl p-6 shadow ${+abs.taxa > metaAbsenteismo ? 'bg-red-50 border-l-4 border-red-500' : 'bg-green-50 border-l-4 border-green-500'}`}>
                <h3 className="text-lg font-bold text-gray-700 mb-2">📉 Status Absenteísmo</h3>
                <p className={`font-bold ${+abs.taxa > metaAbsenteismo ? 'text-red-600' : 'text-green-600'}`}>
                  {+abs.taxa > metaAbsenteismo ? '⚠️ Acima da Meta' : '✅ Dentro da Meta'}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {+abs.taxa > metaAbsenteismo
                    ? `${(+abs.taxa - metaAbsenteismo).toFixed(2)}% acima`
                    : `${(metaAbsenteismo - +abs.taxa).toFixed(2)}% abaixo`}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ══ ABA: LANÇAMENTOS ══ */}
        {abaAtiva === 'lancamentos' && (
          <div className="pb-20 md:pb-0 space-y-6">
            <div className="bg-white rounded-xl shadow p-5">
              <h2 className="text-xl font-bold text-gray-700 mb-4">📝 Registrar Lançamento</h2>
              <form onSubmit={handleAdicionarLancamento} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* BUG 4: apenas pessoas ativas na lista */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">👤 Colaborador (ativos)</label>
                    <select value={formLancamento.pessoaId}
                      onChange={e => setFormLancamento(f => ({ ...f, pessoaId: +e.target.value }))}
                      className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
                      {pessoasAtivas.map(p => (
                        <option key={p.id} value={p.id}>{p.nome} ({p.setor})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">📌 Tipo</label>
                    <select value={formLancamento.tipo}
                      onChange={e => setFormLancamento(f => ({ ...f, tipo: e.target.value }))}
                      className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
                      <option value="he-60">⏰ Hora Extra 60%</option>
                      <option value="he-100">⏰ Hora Extra 100%</option>
                      <option value="falta-injustificada">❌ Falta Injustificada</option>
                      <option value="atestado">📄 Atestado</option>
                      <option value="atestado-horas">📋 Atestado de Hora</option>
                      <option value="saida-antecipada">🚪 Saída Antecipada</option>
                      <option value="atraso">🔴 Atraso</option>
                      <option value="advertencia">⚠️ Advertência</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">📅 Data</label>
                    <input type="date" value={formLancamento.data}
                      onChange={e => setFormLancamento(f => ({ ...f, data: e.target.value }))}
                      className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" required/>
                  </div>
                </div>

                {/* BUG 8: campos dinâmicos por tipo */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {(formLancamento.tipo === 'he-60' || formLancamento.tipo === 'he-100' ||
                    formLancamento.tipo === 'atraso' || formLancamento.tipo === 'saida-antecipada') && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">⏱ Minutos</label>
                      <input type="number" min="1" step="1" placeholder="Ex: 90"
                        value={formLancamento.minutos}
                        onChange={e => setFormLancamento(f => ({ ...f, minutos: e.target.value }))}
                        className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" required/>
                      {formLancamento.minutos && (
                        <p className="text-xs text-gray-400 mt-1">= {(+formLancamento.minutos/60).toFixed(2)}h</p>
                      )}
                    </div>
                  )}
                  {formLancamento.tipo === 'atestado-horas' && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">⏱ Horas</label>
                      <input type="number" min="0.5" step="0.5" placeholder="Ex: 2.5"
                        value={formLancamento.horas}
                        onChange={e => setFormLancamento(f => ({ ...f, horas: e.target.value }))}
                        className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" required/>
                    </div>
                  )}
                  {(formLancamento.tipo === 'falta-injustificada' || formLancamento.tipo === 'atestado' ||
                    formLancamento.tipo === 'advertencia') && (
                    <div className="col-span-1 flex items-center">
                      <div className="bg-gray-50 rounded-lg px-4 py-2 text-sm text-gray-600 border border-gray-200">
                        📌 Valor fixo: <strong>1</strong> {formLancamento.tipo === 'advertencia' ? 'evento' : 'dia'}
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">📝 Observação</label>
                    <input type="text" placeholder="Opcional"
                      value={formLancamento.descricao}
                      onChange={e => setFormLancamento(f => ({ ...f, descricao: e.target.value }))}
                      className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"/>
                  </div>
                  <div className="flex items-end">
                    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 font-bold text-sm">
                      📤 Registrar
                    </button>
                  </div>
                </div>

                {(formLancamento.tipo === 'atraso' || formLancamento.tipo === 'saida-antecipada') && (
                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded-lg">
                    <label className="flex items-center gap-2 text-sm font-semibold text-yellow-800 cursor-pointer">
                      <input type="checkbox" checked={formLancamento.avisoComunicado}
                        onChange={e => setFormLancamento(f => ({ ...f, avisoComunicado: e.target.checked }))}
                        className="w-4 h-4"/>
                      ✅ Aviso comunicado com antecedência?
                    </label>
                    <p className="text-xs text-yellow-700 mt-1">Se NÃO, o colaborador será desclassificado do bônus!</p>
                  </div>
                )}
              </form>
            </div>

            {/* Histórico de lançamentos — BUG 4: histórico de inativos preservado */}
            <div className="bg-white rounded-xl shadow p-5">
              <h2 className="text-xl font-bold text-gray-700 mb-4">📋 Histórico ({lancamentos.length})</h2>
              {lancamentos.length === 0 ? (
                <p className="text-gray-400 text-center py-8 text-sm">Sem lançamentos</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[600px]">
                    <thead>
                      <tr className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                        <th className="text-left py-3 px-3 font-bold">Pessoa</th>
                        <th className="text-left py-3 px-3 font-bold">Setor</th>
                        <th className="text-left py-3 px-3 font-bold">Tipo</th>
                        <th className="text-left py-3 px-3 font-bold">Data</th>
                        <th className="text-left py-3 px-3 font-bold">Qtd</th>
                        <th className="text-left py-3 px-3 font-bold">Valor</th>
                        <th className="text-center py-3 px-3 font-bold">Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lancamentos.map((l, idx) => {
                        const p = pessoas.find(x => x.id === l.pessoa_id);
                        const tab = tabelaHE[p?.cargo || ''];
                        const mins = +(l.minutos || 0);
                        const val = l.tipo === 'he-60' ? (tab?.he60||0)*(mins/60)
                          : l.tipo === 'he-100' ? (tab?.he100||0)*(mins/60) : 0;
                        return (
                          <tr key={l.id} className={`border-b ${idx%2===0?'bg-gray-50':'bg-white'} hover:bg-blue-50`}>
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-2">
                                <Avatar pessoa={p} tamanho="sm"/>
                                <span className="font-semibold text-gray-800">{p?.nome || 'Desconhecido'}</span>
                                {p?.ativo === false && <span className="text-xs bg-gray-200 text-gray-600 px-1 rounded">inativo</span>}
                              </div>
                            </td>
                            <td className="py-2 px-3 text-xs text-gray-500">{p?.setor}</td>
                            <td className="py-2 px-3">
                              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getTipoCor(l.tipo)}`}>
                                {getTipoLabel(l.tipo)}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-gray-700">{new Date(l.data+'T00:00:00').toLocaleDateString('pt-BR')}</td>
                            <td className="py-2 px-3 text-gray-600 text-xs">
                              {l.minutos ? `${l.minutos}min` : l.horas ? `${l.horas}h` : '1'}
                            </td>
                            <td className="py-2 px-3 font-bold text-blue-600">
                              {val > 0 ? `R$ ${val.toFixed(2)}` : '-'}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <button onClick={() => handleDeletarLancamento(l.id)}
                                className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs font-bold">
                                🗑️
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══ ABA: FÉRIAS ══ */}
        {abaAtiva === 'ferias' && (
          <div className="pb-20 md:pb-0 space-y-6">
            <div className="bg-white rounded-xl shadow p-5">
              <h2 className="text-xl font-bold text-gray-700 mb-4">🏖️ Registrar Férias</h2>
              <form onSubmit={handleAdicionarFerias} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">👤 Colaborador</label>
                    <select value={formFerias.pessoaId}
                      onChange={e => setFormFerias(f => ({ ...f, pessoaId: +e.target.value }))}
                      className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
                      <option value={0}>Selecione...</option>
                      {pessoasAtivas.map(p => <option key={p.id} value={p.id}>{p.nome} ({p.setor})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">📅 Data Início</label>
                    <input type="date" value={formFerias.dataInicio}
                      onChange={e => setFormFerias(f => ({ ...f, dataInicio: e.target.value }))}
                      className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" required/>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">📅 Data Fim</label>
                    <input type="date" value={formFerias.dataFim}
                      onChange={e => setFormFerias(f => ({ ...f, dataFim: e.target.value }))}
                      className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" required/>
                  </div>
                </div>
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold text-sm">
                  🏖️ Registrar Férias
                </button>
              </form>
            </div>

            {/* Histórico férias 12 meses — FUNCIONALIDADE 1 */}
            <div className="bg-white rounded-xl shadow p-5">
              <h2 className="text-xl font-bold text-gray-700 mb-4">📋 Histórico de Férias (12 meses)</h2>
              {(() => {
                const limite = new Date();
                limite.setMonth(limite.getMonth() - 12);
                const feriasHist = lancamentos
                  .filter(l => l.tipo === 'férias' && new Date(l.data) >= limite)
                  .sort((a,b) => b.data.localeCompare(a.data));
                return feriasHist.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-6">Sem férias nos últimos 12 meses</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[500px]">
                      <thead>
                        <tr className="bg-green-600 text-white">
                          <th className="text-left py-3 px-3">Colaborador</th>
                          <th className="text-left py-3 px-3">Setor</th>
                          <th className="text-left py-3 px-3">Início</th>
                          <th className="text-left py-3 px-3">Descrição</th>
                          <th className="text-center py-3 px-3">Ação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {feriasHist.map((l, i) => {
                          const p = pessoas.find(x => x.id === l.pessoa_id);
                          return (
                            <tr key={l.id} className={`border-b ${i%2===0?'bg-gray-50':'bg-white'}`}>
                              <td className="py-2 px-3">
                                <div className="flex items-center gap-2">
                                  <Avatar pessoa={p} tamanho="sm"/>
                                  <span className="font-semibold">{p?.nome || 'Desconhecido'}</span>
                                </div>
                              </td>
                              <td className="py-2 px-3 text-xs text-gray-500">{p?.setor}</td>
                              <td className="py-2 px-3">{new Date(l.data+'T00:00:00').toLocaleDateString('pt-BR')}</td>
                              <td className="py-2 px-3 text-xs text-gray-600">{l.descricao}</td>
                              <td className="py-2 px-3 text-center">
                                <button onClick={() => handleDeletarFerias(l.id)}
                                  className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs font-bold">
                                  🗑️
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* ══ ABA: BÔNUS ══ */}
        {abaAtiva === 'bonus' && (
          <div className="pb-20 md:pb-0 space-y-6">
            <div className="bg-white rounded-xl shadow p-5">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-xl font-bold text-gray-700">🎁 Gestão de Bônus</h2>
                <button onClick={handleResetMensal}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold text-sm">
                  🔄 Reset Mensal
                </button>
              </div>

              {/* KPIs bônus — BUG 5: totalBonus usa valores proporcionais reais */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl p-5">
                  <p className="text-xs opacity-80">Elegíveis</p>
                  <p className="text-4xl font-bold mt-1">
                    {bonusElegibilidade.filter(b => b.elegivel && pessoas.find(p=>p.id===b.pessoa_id&&p.ativo!==false)).length}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-red-500 to-red-600 text-white rounded-xl p-5">
                  <p className="text-xs opacity-80">Desclassificados</p>
                  <p className="text-4xl font-bold mt-1">
                    {bonusElegibilidade.filter(b => !b.elegivel && pessoas.find(p=>p.id===b.pessoa_id&&p.ativo!==false)).length}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-5">
                  <p className="text-xs opacity-80">Total a Pagar</p>
                  <p className="text-3xl font-bold mt-1">R$ {totalBonus.toFixed(2)}</p>
                  <p className="text-xs opacity-70 mt-1">Proporcional incluído</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Elegíveis */}
                <div className="bg-green-50 rounded-xl border-l-4 border-green-500 p-5">
                  <h3 className="text-base font-bold text-green-800 mb-4">✅ Elegíveis</h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {bonusElegibilidade
                      .filter(b => b.elegivel && pessoas.find(p=>p.id===b.pessoa_id&&p.ativo!==false))
                      .map(bonus => {
                        const p = pessoas.find(x => x.id === bonus.pessoa_id);
                        if (!p) return null;
                        return (
                          <div key={bonus.id} className="flex justify-between items-center bg-white p-3 rounded-lg border border-green-200">
                            <div className="flex items-center gap-2">
                              <Avatar pessoa={p} tamanho="sm"/>
                              <div>
                                <p className="text-sm font-semibold text-gray-800">{p.nome}</p>
                                <p className="text-xs text-gray-500">{p.setor}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-green-600 text-sm">R$ {(bonus.valor_bonus ?? VALOR_BONUS).toFixed(2)}</p>
                              <button onClick={() => handleToggleBonus(p.id, false)}
                                className="bg-red-500 hover:bg-red-600 text-white px-2 py-0.5 rounded text-xs font-bold mt-1">
                                Desclassificar
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    {bonusElegibilidade.filter(b=>b.elegivel&&pessoas.find(p=>p.id===b.pessoa_id&&p.ativo!==false)).length === 0 &&
                      <p className="text-gray-400 text-sm text-center py-4">Nenhum elegível</p>}
                  </div>
                </div>

                {/* Desclassificados — BUG 5: inativo não aparece aqui */}
                <div className="bg-red-50 rounded-xl border-l-4 border-red-500 p-5">
                  <h3 className="text-base font-bold text-red-800 mb-4">❌ Desclassificados</h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {bonusElegibilidade
                      .filter(b => !b.elegivel && pessoas.find(p=>p.id===b.pessoa_id&&p.ativo!==false))
                      .map(bonus => {
                        const p = pessoas.find(x => x.id === bonus.pessoa_id);
                        if (!p) return null;
                        return (
                          <div key={bonus.id} className="bg-white p-3 rounded-lg border border-red-200 opacity-80">
                            <div className="flex justify-between items-start">
                              <div className="flex items-center gap-2">
                                <Avatar pessoa={p} tamanho="sm"/>
                                <div>
                                  <p className="text-sm font-semibold text-gray-500 line-through">{p.nome}</p>
                                  <p className="text-xs text-red-600">{bonus.motivo_desclassificacao || 'Não especificado'}</p>
                                  {bonus.data_desclassificacao && (
                                    <p className="text-xs text-gray-400">
                                      {new Date(bonus.data_desclassificacao+'T00:00:00').toLocaleDateString('pt-BR')}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <button onClick={() => handleReverterBonus(p.id)}
                                className="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded text-xs font-bold flex-shrink-0">
                                ↩️ Reverter
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    {bonusElegibilidade.filter(b=>!b.elegivel&&pessoas.find(p=>p.id===b.pessoa_id&&p.ativo!==false)).length === 0 &&
                      <p className="text-gray-400 text-sm text-center py-4">Nenhum desclassificado</p>}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-5">
              <h2 className="text-lg font-bold text-gray-700 mb-4">📄 Relatório para RH</h2>
              <button onClick={exportarRelatorioBonus}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold text-sm">
                📥 Baixar Relatório (TXT)
              </button>
            </div>
          </div>
        )}

        {/* ══ ABA: AUDITORIA ══ */}

        {/* ══ ABA: MATRIZ CHA ══ */}
        {abaAtiva === 'cha' && (
          <MatrizCHA
            pessoas={pessoasAtivas}
            mostrarToast={mostrarToast}
            Avatar={Avatar}
          />
        )}


        {/* ══ ABA: CALENDÁRIO ══ */}
        {abaAtiva === 'calendario' && (
          <CalendarioVisual
            lancamentos={lancamentos}
            pessoas={pessoas}
            feriados={feriados}
            tabelaHE={tabelaHE}
            horasUteisDia={horasUteisDia}
            Avatar={Avatar}
          />
        )}

        {/* ══ ABA: COMPARATIVO ══ */}
        {abaAtiva === 'comparativo' && (
          <ComparativoMeses
            lancamentos={lancamentos}
            pessoas={pessoas}
            tabelaHE={tabelaHE}
            horasUteisDia={horasUteisDia}
          />
        )}

        {/* ══ ABA: MAPA DE CALOR ══ */}
        {abaAtiva === 'calor' && (
          <MapaCalor
            lancamentos={lancamentos}
            pessoas={pessoas}
            horasUteisDia={horasUteisDia}
          />
        )}

        {abaAtiva === 'auditoria' && (
          <div className="pb-20 md:pb-0">
            <div className="bg-white rounded-xl shadow p-5">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-xl font-bold text-gray-700">🔍 Histórico de Alterações</h2>
                {/* BUG 6: botão limpar auditoria */}
                <button onClick={handleLimparAuditoria}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-bold text-sm">
                  🗑️ Limpar &gt;30 dias
                </button>
              </div>
              {auditoria.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">Sem alterações registradas</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[600px]">
                    <thead>
                      <tr className="bg-blue-600 text-white">
                        <th className="text-left py-3 px-3">Tabela</th>
                        <th className="text-left py-3 px-3">Ação</th>
                        <th className="text-left py-3 px-3">Usuário</th>
                        <th className="text-left py-3 px-3">Data/Hora</th>
                        <th className="text-left py-3 px-3">Detalhes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditoria.slice(0, 50).map((a, i) => (
                        <tr key={a.id} className={`border-b ${i%2===0?'bg-gray-50':'bg-white'}`}>
                          <td className="py-2 px-3 font-semibold text-gray-700">{a.tabela}</td>
                          <td className="py-2 px-3">
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold
                              ${a.acao==='INSERT'?'bg-green-100 text-green-800':
                                a.acao==='UPDATE'?'bg-yellow-100 text-yellow-800':
                                'bg-red-100 text-red-800'}`}>
                              {a.acao}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-xs text-gray-500">{a.usuario}</td>
                          <td className="py-2 px-3 text-xs text-gray-500">
                            {new Date(new Date(a.criado_em).getTime()-(3*3600000)).toLocaleString('pt-BR')}
                          </td>
                          <td className="py-2 px-3 text-xs text-gray-500">
                            ID: {a.dados_novos?.id || a.dados_anteriores?.id || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══ ABA: CONFIGURAÇÃO ══ */}
        {abaAtiva === 'configuracao' && (
          <ConfiguracaoTab
            pessoasAtivas={pessoasAtivas}
            pessoasTodas={pessoasTodas}
            cargosArray={cargosArray}
            tabelaHE={tabelaHE}
            formPessoa={formPessoa}
            setFormPessoa={setFormPessoa}
            formCargo={formCargo}
            setFormCargo={setFormCargo}
            setoresLista={setoresLista}
            metaHE={metaHE}
            setMetaHE={setMetaHE}
            metaAbsenteismo={metaAbsenteismo}
            setMetaAbsenteismo={setMetaAbsenteismo}
            horasUteisDia={horasUteisDia}
            setHorasUteisDia={setHorasUteisDia}
            bonusElegibilidade={bonusElegibilidade}
            feriados={feriados}
            formFeriado={formFeriado}
            setFormFeriado={setFormFeriado}
            handleAdicionarPessoa={handleAdicionarPessoa}
            handleDeletarPessoa={handleDeletarPessoa}
            handleToggleAtivo={handleToggleAtivo}
            handleAdicionarCargo={handleAdicionarCargo}
            handleDeletarCargo={handleDeletarCargo}
            handleToggleBonus={handleToggleBonus}
            handleAdicionarFeriado={handleAdicionarFeriado}
            handleDeletarFeriado={handleDeletarFeriado}
            handleUploadFoto={handleUploadFoto}
            Avatar={Avatar}
          />
        )}

      </div>{/* max-w-7xl */}
    </div>
  );
}

function ConfiguracaoTab({
  pessoasAtivas, pessoasTodas, cargosArray, tabelaHE,
  formPessoa, setFormPessoa, formCargo, setFormCargo, setoresLista,
  metaHE, setMetaHE, metaAbsenteismo, setMetaAbsenteismo,
  horasUteisDia, setHorasUteisDia, bonusElegibilidade,
  feriados, formFeriado, setFormFeriado,
  handleAdicionarPessoa, handleDeletarPessoa, handleToggleAtivo,
  handleAdicionarCargo, handleDeletarCargo, handleToggleBonus,
  handleAdicionarFeriado, handleDeletarFeriado, handleUploadFoto,
  Avatar
}: any) {
  const inputFotoRef = (pessoaId: number) => {
    const el = document.createElement('input');
    el.type = 'file';
    el.accept = 'image/*';
    el.onchange = async (ev: any) => {
      const file = ev.target.files?.[0];
      if (file) await handleUploadFoto(pessoaId, file);
    };
    el.click();
  };

  return (
    <div className="pb-20 md:pb-0 space-y-6">
      {/* Metas */}
      <div className="bg-white rounded-xl shadow p-5">
        <h2 className="text-lg font-bold text-gray-700 mb-4">🎯 Metas e Parâmetros</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Meta HE (R$)</label>
            <input type="number" value={metaHE} onChange={e => setMetaHE(+e.target.value || 0)}
              className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"/>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Meta Absenteísmo (%)</label>
            <input type="number" step="0.1" value={metaAbsenteismo} onChange={e => setMetaAbsenteismo(+e.target.value || 0)}
              className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"/>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Horas úteis/dia</label>
            <input type="number" min="1" max="24" value={horasUteisDia} onChange={e => setHorasUteisDia(+e.target.value || 10)}
              className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"/>
          </div>
        </div>
      </div>

      {/* Novo Cargo */}
      <div className="bg-white rounded-xl shadow p-5">
        <h2 className="text-lg font-bold text-gray-700 mb-4">➕ Novo Cargo</h2>
        <form onSubmit={handleAdicionarCargo} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input type="text" placeholder="Nome do cargo" value={formCargo.nome}
            onChange={e => setFormCargo((f: any) => ({ ...f, nome: e.target.value }))}
            className="border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" required/>
          <input type="number" step="0.01" placeholder="HE 60% (R$)" value={formCargo.he60}
            onChange={e => setFormCargo((f: any) => ({ ...f, he60: e.target.value }))}
            className="border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" required/>
          <input type="number" step="0.01" placeholder="HE 100% (R$)" value={formCargo.he100}
            onChange={e => setFormCargo((f: any) => ({ ...f, he100: e.target.value }))}
            className="border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" required/>
          <button type="submit" className="bg-green-600 hover:bg-green-700 text-white rounded-lg px-4 py-2 font-bold text-sm">
            ✅ Adicionar
          </button>
        </form>
      </div>

      {/* Tabela Cargos — BUG 10: ordenados */}
      <div className="bg-white rounded-xl shadow p-5">
        <h2 className="text-lg font-bold text-gray-700 mb-4">📚 Cargos ({cargosArray.length})</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[400px]">
            <thead>
              <tr className="bg-blue-600 text-white">
                <th className="text-left py-3 px-4">Cargo</th>
                <th className="text-left py-3 px-4">HE 60%</th>
                <th className="text-left py-3 px-4">HE 100%</th>
                <th className="text-center py-3 px-4">Ação</th>
              </tr>
            </thead>
            <tbody>
              {cargosArray.map((cargo: string, i: number) => (
                <tr key={cargo} className={`border-b ${i%2===0?'bg-gray-50':'bg-white'}`}>
                  <td className="py-3 px-4 font-semibold text-gray-700 text-sm">{cargo}</td>
                  <td className="py-3 px-4 text-blue-600 font-bold text-sm">R$ {tabelaHE[cargo].he60.toFixed(2)}</td>
                  <td className="py-3 px-4 text-blue-600 font-bold text-sm">R$ {tabelaHE[cargo].he100.toFixed(2)}</td>
                  <td className="py-3 px-4 text-center">
                    <button onClick={() => handleDeletarCargo(cargo)}
                      className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs font-bold">
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Novo Colaborador */}
      <div className="bg-white rounded-xl shadow p-5">
        <h2 className="text-lg font-bold text-gray-700 mb-4">➕ Novo Colaborador</h2>
        <form onSubmit={handleAdicionarPessoa} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input type="text" placeholder="Nome completo" value={formPessoa.nome}
            onChange={e => setFormPessoa((f: any) => ({ ...f, nome: e.target.value }))}
            className="border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" required/>
          <select value={formPessoa.cargo}
            onChange={e => setFormPessoa((f: any) => ({ ...f, cargo: e.target.value }))}
            className="border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
            {cargosArray.map((c: string) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={formPessoa.setor}
            onChange={e => setFormPessoa((f: any) => ({ ...f, setor: e.target.value }))}
            className="border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
            {setoresLista.sort().map((s: string) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button type="submit" className="bg-green-600 hover:bg-green-700 text-white rounded-lg px-4 py-2 font-bold text-sm">
            ✅ Adicionar
          </button>
        </form>
      </div>

      {/* Lista Colaboradores — BUG 10: ordenados, com ativo/inativo e foto */}
      <div className="bg-white rounded-xl shadow p-5">
        <h2 className="text-lg font-bold text-gray-700 mb-4">👥 Colaboradores ({pessoasTodas.length})</h2>
        {pessoasTodas.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-6">Sem colaboradores</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="bg-blue-600 text-white">
                  <th className="text-left py-3 px-3">Colaborador</th>
                  <th className="text-left py-3 px-3">Cargo</th>
                  <th className="text-left py-3 px-3">Setor</th>
                  <th className="text-center py-3 px-3">Status</th>
                  <th className="text-center py-3 px-3">Bônus</th>
                  <th className="text-center py-3 px-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {pessoasTodas.map((p: any, i: number) => {
                  const bonus = bonusElegibilidade.find((b: any) => b.pessoa_id === p.id);
                  const elegivel = bonus?.elegivel ?? true;
                  return (
                    <tr key={p.id} className={`border-b ${i%2===0?'bg-gray-50':'bg-white'} ${p.ativo===false?'opacity-60':''}`}>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <Avatar pessoa={p} tamanho="sm"/>
                          <span className="font-semibold text-gray-800">{p.nome}</span>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-xs text-gray-500">{p.cargo}</td>
                      <td className="py-2 px-3 text-xs text-gray-500">{p.setor}</td>
                      <td className="py-2 px-3 text-center">
                        <button onClick={() => handleToggleAtivo(p.id, p.ativo ?? true)}
                          className={`px-2 py-1 rounded text-xs font-bold
                            ${p.ativo!==false?'bg-green-100 text-green-700':'bg-gray-200 text-gray-600'}`}>
                          {p.ativo!==false ? '✅ Ativo' : '❌ Inativo'}
                        </button>
                      </td>
                      <td className="py-2 px-3 text-center">
                        {p.ativo!==false && (
                          <button onClick={() => handleToggleBonus(p.id, !elegivel)}
                            className={`px-2 py-1 rounded text-xs font-bold
                              ${elegivel?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}`}>
                            {elegivel ? '🎁 Elegível' : '❌ Fora'}
                          </button>
                        )}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <div className="flex gap-1 justify-center flex-wrap">
                          <button onClick={() => inputFotoRef(p.id)}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs font-bold" title="Upload foto">
                            📷
                          </button>
                          <button onClick={() => handleDeletarPessoa(p.id)}
                            className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs font-bold">
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Feriados — FUNCIONALIDADE 3: cadastro regional */}
      <div className="bg-white rounded-xl shadow p-5">
        <h2 className="text-lg font-bold text-gray-700 mb-4">📅 Feriados e Pontos Facultativos</h2>
        <form onSubmit={handleAdicionarFeriado} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <input type="date" value={formFeriado.data}
            onChange={e => setFormFeriado((f: any) => ({ ...f, data: e.target.value }))}
            className="border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" required/>
          <input type="text" placeholder="Descrição" value={formFeriado.descricao}
            onChange={e => setFormFeriado((f: any) => ({ ...f, descricao: e.target.value }))}
            className="border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" required/>
          <select value={formFeriado.tipo}
            onChange={e => setFormFeriado((f: any) => ({ ...f, tipo: e.target.value }))}
            className="border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
            <option value="nacional">🇧🇷 Nacional</option>
            <option value="estadual">🏙️ Estadual (SP)</option>
            <option value="municipal">🏘️ Municipal (GRU)</option>
            <option value="facultativo">📌 Ponto Facultativo</option>
          </select>
          <button type="submit" className="bg-green-600 hover:bg-green-700 text-white rounded-lg px-4 py-2 font-bold text-sm">
            ➕ Adicionar
          </button>
        </form>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[400px]">
            <thead>
              <tr className="bg-orange-500 text-white">
                <th className="text-left py-2 px-3">Data</th>
                <th className="text-left py-2 px-3">Descrição</th>
                <th className="text-left py-2 px-3">Tipo</th>
                <th className="text-center py-2 px-3">Ação</th>
              </tr>
            </thead>
            <tbody>
              {feriados.map((f: any, i: number) => (
                <tr key={f.id} className={`border-b ${i%2===0?'bg-gray-50':'bg-white'}`}>
                  <td className="py-2 px-3">{new Date(f.data+'T00:00:00').toLocaleDateString('pt-BR')}</td>
                  <td className="py-2 px-3 font-semibold text-gray-700">{f.descricao}</td>
                  <td className="py-2 px-3">
                    <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">{f.tipo}</span>
                  </td>
                  <td className="py-2 px-3 text-center">
                    <button onClick={() => handleDeletarFeriado(f.id)}
                      className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs font-bold">
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENTE: MatrizCHA
// ══════════════════════════════════════════════════════════════════════════════
function MatrizCHA({ pessoas, mostrarToast, Avatar }: any) {
  const SENHAS_AVALIACAO = ['INBOUND', 'OUTBOUND', 'PROJETOS'];
  const supabaseCHA = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // ── Estados ──────────────────────────────────────────────────────────────────
  const [subAba, setSubAba] = useState<'avaliar'|'habilidades'|'resultados'|'feedback'>('resultados');
  const [habilidades, setHabilidades] = useState<any[]>([]);
  const [avaliacoes, setAvaliacoes] = useState<any[]>([]);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);

  // Formulário habilidade
  const [formHab, setFormHab] = useState({ cargo: '', nome: '' });

  // Formulário avaliação
  const [senhaAvaliacao, setSenhaAvaliacao] = useState('');
  const [senhaOk, setSenhaOk] = useState(false);
  const [setorAvaliacao, setSetorAvaliacao] = useState<string>('');
  const [errSenha, setErrSenha] = useState('');
  const [pessoaSelecionada, setPessoaSelecionada] = useState<number>(0);
  const [dataAvaliacao, setDataAvaliacao] = useState('');
  const [notas, setNotas] = useState<Record<number,{c:string;h:string;a:string}>>({});

  // Formulário feedback
  const [feedbackPessoa, setFeedbackPessoa] = useState<number>(0);
  const [feedbackData, setFeedbackData] = useState('');
  const [feedbackTexto, setFeedbackTexto] = useState('');

  // Resultados
  const [pessoaResultado, setPessoaResultado] = useState<number>(0);
  const [setorFiltroResultado, setSetorFiltroResultado] = useState<string>('');

  // ── Cargos disponíveis ────────────────────────────────────────────────────────
  const cargosUnicos = [...new Set(pessoas.map((p: any) => p.cargo))].sort() as string[];

  // ── Carregar dados ────────────────────────────────────────────────────────────
  useEffect(() => {
    const carregar = async () => {
      setCarregando(true);
      try {
        const [{ data: habs }, { data: avs }, { data: fbs }] = await Promise.all([
          supabaseCHA.from('habilidades').select('*').eq('ativo', true).order('cargo').order('nome'),
          supabaseCHA.from('avaliacao_cha').select('*').order('data_avaliacao', { ascending: false }),
          supabaseCHA.from('feedback_cha').select('*').order('data_feedback', { ascending: false }),
        ]);
        if (habs) setHabilidades(habs);
        if (avs) setAvaliacoes(avs);
        if (fbs) setFeedbacks(fbs);
      } catch (err) { console.error(err); }
      setCarregando(false);
    };
    carregar();
  }, []);

  // Inicializar pessoaSelecionada e feedbackPessoa
  useEffect(() => {
    if (pessoas.length > 0) {
      if (!pessoaSelecionada) setPessoaSelecionada(pessoas[0].id);
      if (!feedbackPessoa) setFeedbackPessoa(pessoas[0].id);
      if (!pessoaResultado) setPessoaResultado(pessoas[0].id);
    }
  }, [pessoas]);

  // ── Helpers ───────────────────────────────────────────────────────────────────
  const habsDaPessoa = (pessoaId: number) => {
    const pessoa = pessoas.find((p: any) => p.id === pessoaId);
    return habilidades.filter(h => h.cargo === pessoa?.cargo);
  };

  const calcularResultado = (pessoaId: number) => {
    const habs = habsDaPessoa(pessoaId);
    if (habs.length === 0) return null;
    const avsRecentes: Record<number, any> = {};
    avaliacoes
      .filter(a => a.pessoa_id === pessoaId)
      .forEach(a => {
        if (!avsRecentes[a.habilidade_id]) avsRecentes[a.habilidade_id] = a;
      });
    const habsComNota = habs.filter(h => avsRecentes[h.id]);
    if (habsComNota.length === 0) return null;
    let totalPontos = 0;
    let maxPontos = 0;
    habsComNota.forEach(h => {
      const av = avsRecentes[h.id];
      totalPontos += (+(av.nota_c||0) + +(av.nota_h||0) + +(av.nota_a||0));
      maxPontos += 9; // máx 3 por C, H, A
    });
    const pct = maxPontos > 0 ? (totalPontos / maxPontos) * 100 : 0;
    return { pct: +pct.toFixed(1), habsComNota, avsRecentes, habs };
  };

  const getLegendaResultado = (pct: number) => {
    if (pct >= 90) return { label: 'Excede expectativas', cor: 'bg-green-700 text-white' };
    if (pct >= 70) return { label: 'Atende expectativas', cor: 'bg-green-500 text-white' };
    if (pct >= 50) return { label: 'Atende parcialmente', cor: 'bg-yellow-400 text-gray-900' };
    return { label: 'Não atende expectativas', cor: 'bg-red-600 text-white' };
  };

  const getTendencia = (pessoaId: number, habId: number) => {
    const hist = avaliacoes
      .filter(a => a.pessoa_id === pessoaId && a.habilidade_id === habId)
      .slice(0, 3);
    if (hist.length < 2) return null;
    const medias = hist.map(a => ((+(a.nota_c||0) + +(a.nota_h||0) + +(a.nota_a||0)) / 9 * 100).toFixed(0));
    const diff = +medias[0] - +medias[1];
    if (diff > 5) return '📈 Melhora';
    if (diff < -5) return '📉 Queda';
    return '➡️ Estável';
  };

  // ── Handlers ──────────────────────────────────────────────────────────────────
  const handleVerificarSenha = (e: React.FormEvent) => {
    e.preventDefault();
    if (SENHAS_AVALIACAO.includes(senhaAvaliacao.toUpperCase())) {
      setSenhaOk(true);
      setErrSenha('');
      // Mapear senha para setor correspondente
      const mapaSenhaSetor: Record<string,string> = {
        'INBOUND': 'Inbound',
        'OUTBOUND': 'Outbound',
        'PROJETOS': 'Projetos/Estoques/Custos'
      };
      setSetorAvaliacao(mapaSenhaSetor[senhaAvaliacao.toUpperCase()] || '');
    } else {
      setErrSenha('❌ Senha incorreta!');
    }
  };

  const handleAdicionarHabilidade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formHab.cargo || !formHab.nome.trim()) { mostrarToast('Preencha todos os campos!', 'err'); return; }
    try {
      const { data, error } = await supabaseCHA.from('habilidades').insert([{
        cargo: formHab.cargo, nome: formHab.nome.trim(), ativo: true
      }]).select().single();
      if (error) throw error;
      setHabilidades(h => [...h, data].sort((a,b) => a.nome.localeCompare(b.nome)));
      setFormHab(f => ({ ...f, nome: '' }));
      mostrarToast('✅ Habilidade adicionada!');
    } catch (err: any) { mostrarToast('❌ Erro: ' + err.message, 'err'); }
  };

  const handleRemoverHabilidade = async (id: number) => {
    if (!confirm('Remover habilidade? O histórico de notas será preservado.')) return;
    try {
      await supabaseCHA.from('habilidades').update({ ativo: false }).eq('id', id);
      setHabilidades(h => h.filter(x => x.id !== id));
      mostrarToast('✅ Habilidade removida!');
    } catch (err: any) { mostrarToast('❌ Erro: ' + err.message, 'err'); }
  };

  const handleSalvarAvaliacao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pessoaSelecionada || !dataAvaliacao) { mostrarToast('Selecione colaborador e data!', 'err'); return; }
    const habs = habsDaPessoa(pessoaSelecionada);
    if (habs.length === 0) { mostrarToast('Sem habilidades cadastradas para este cargo!', 'err'); return; }
    const faltando = habs.filter(h => !notas[h.id]?.c || !notas[h.id]?.h || !notas[h.id]?.a);
    if (faltando.length > 0) { mostrarToast(`Preencha todas as notas (C, H, A) para cada habilidade!`, 'err'); return; }
    try {
      const registros = habs.map(h => ({
        pessoa_id: pessoaSelecionada,
        habilidade_id: h.id,
        data_avaliacao: dataAvaliacao,
        nota_c: +notas[h.id].c,
        nota_h: +notas[h.id].h,
        nota_a: +notas[h.id].a,
        avaliador: senhaAvaliacao.toUpperCase(),
      }));
      const { data, error } = await supabaseCHA.from('avaliacao_cha').insert(registros).select();
      if (error) throw error;
      setAvaliacoes(a => [...(data||[]), ...a]);
      setNotas({});
      setDataAvaliacao('');
      mostrarToast('✅ Avaliação salva!');
    } catch (err: any) { mostrarToast('❌ Erro: ' + err.message, 'err'); }
  };

  const handleSalvarFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackPessoa || !feedbackData || !feedbackTexto.trim()) {
      mostrarToast('Preencha todos os campos!', 'err'); return;
    }
    try {
      const { data, error } = await supabaseCHA.from('feedback_cha').insert([{
        pessoa_id: feedbackPessoa,
        data_feedback: feedbackData,
        conteudo: feedbackTexto.trim(),
        aplicador: 'Gestor',
      }]).select().single();
      if (error) throw error;
      setFeedbacks(f => [data, ...f]);
      setFeedbackTexto('');
      setFeedbackData('');
      mostrarToast('✅ Feedback registrado!');
    } catch (err: any) { mostrarToast('❌ Erro: ' + err.message, 'err'); }
  };

  // ── Exportar Excel (CSV compatível) ──────────────────────────────────────────
  const exportarExcel = () => {
    const linhas: string[] = [];
    linhas.push('Colaborador;Cargo;Habilidade;Data;Nota C;Nota H;Nota A;Média %;Resultado');
    pessoas.forEach((p: any) => {
      const habs = habilidades.filter(h => h.cargo === p.cargo);
      habs.forEach(h => {
        const avsHab = avaliacoes.filter(a => a.pessoa_id === p.id && a.habilidade_id === h.id);
        avsHab.forEach(av => {
          const media = (((+(av.nota_c||0)) + (+(av.nota_h||0)) + (+(av.nota_a||0))) / 9 * 100).toFixed(1);
          const leg = getLegendaResultado(+media);
          linhas.push(`${p.nome};${p.cargo};${h.nome};${av.data_avaliacao};${av.nota_c};${av.nota_h};${av.nota_a};${media}%;${leg.label}`);
        });
      });
    });
    const bom = '\uFEFF';
    const blob = new Blob([bom + linhas.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `MatrizCHA_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    mostrarToast('✅ Arquivo exportado! Abra com Excel.');
  };

  if (carregando) return (
    <div className="flex items-center justify-center py-20">
      <p className="text-blue-600 font-bold text-lg">⏳ Carregando Matriz CHA...</p>
    </div>
  );

  return (
    <div className="pb-20 md:pb-0 space-y-4">
      {/* Sub-abas */}
      <div className="bg-white rounded-xl shadow p-2 flex gap-1 overflow-x-auto">
        {[
          ['resultados','📊 Resultados'],
          ['avaliar','✏️ Avaliar'],
          ['habilidades','🎯 Habilidades'],
          ['feedback','💬 Feedback'],
        ].map(([id, label]) => (
          <button key={id} onClick={() => setSubAba(id as any)}
            className={`px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition
              ${subAba === id ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
            {label}
          </button>
        ))}
        <button onClick={exportarExcel}
          className="ml-auto px-4 py-2 rounded-lg font-bold text-sm bg-green-600 text-white whitespace-nowrap">
          📥 Exportar Excel
        </button>
      </div>

      {/* Legenda de notas — sempre visível */}
      <div className="bg-blue-50 rounded-xl p-4 text-sm">
        <p className="font-bold text-blue-800 mb-2">📖 Legenda de Notas:</p>
        <div className="flex flex-wrap gap-4 text-blue-700">
          <span><strong>Nota 1</strong> — Não possui conhecimento</span>
          <span><strong>Nota 2</strong> — Adquiriu o conhecimento</span>
          <span><strong>Nota 3</strong> — Autonomia perfeita, pode ensinar</span>
        </div>
        <div className="flex flex-wrap gap-3 mt-2">
          <span className="bg-green-700 text-white px-2 py-0.5 rounded text-xs font-bold">≥90% Excede expectativas</span>
          <span className="bg-green-500 text-white px-2 py-0.5 rounded text-xs font-bold">70-89% Atende expectativas</span>
          <span className="bg-yellow-400 text-gray-900 px-2 py-0.5 rounded text-xs font-bold">50-69% Atende parcialmente</span>
          <span className="bg-red-600 text-white px-2 py-0.5 rounded text-xs font-bold">&lt;50% Não atende</span>
        </div>
      </div>

      {/* ── SUB-ABA: RESULTADOS ── */}
      {subAba === 'resultados' && (
        <div className="space-y-4">
          {/* Seletor de setor e colaborador */}
          <div className="bg-white rounded-xl shadow p-5">
            <h2 className="text-lg font-bold text-gray-700 mb-3">📊 Resultado Individual</h2>
            <div className="flex flex-wrap gap-3 mb-4">
              {['', 'Inbound', 'Outbound', 'Projetos/Estoques/Custos'].map(setor => (
                <button key={setor} onClick={() => { setSetorFiltroResultado(setor); setPessoaResultado(0); }}
                  className={`px-4 py-2 rounded-lg font-bold text-sm transition
                    ${setorFiltroResultado === setor ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {setor === '' ? '🌐 Todos' : setor === 'Inbound' ? '📥 Inbound' : setor === 'Outbound' ? '📤 Outbound' : '📦 Projetos'}
                </button>
              ))}
            </div>
            <select value={pessoaResultado} onChange={e => setPessoaResultado(+e.target.value)}
              className="w-full md:w-72 border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
              <option value={0}>Selecione um colaborador...</option>
              {pessoas.filter((p: any) => !setorFiltroResultado || p.setor === setorFiltroResultado)
                .map((p: any) => <option key={p.id} value={p.id}>{p.nome} ({p.setor})</option>)}
            </select>
          </div>

          {pessoaResultado > 0 && (() => {
            const resultado = calcularResultado(pessoaResultado);
            const pessoa = pessoas.find((p: any) => p.id === pessoaResultado);
            const fbs = feedbacks.filter(f => f.pessoa_id === pessoaResultado);
            if (!resultado) return (
              <div className="bg-white rounded-xl shadow p-6 text-center text-gray-400">
                <p className="text-4xl mb-2">📋</p>
                <p>Sem avaliações registradas para {pessoa?.nome}</p>
              </div>
            );
            const legend = getLegendaResultado(resultado.pct);
            return (
              <div className="space-y-4">
                {/* Card resultado geral */}
                <div className="bg-white rounded-xl shadow p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <Avatar pessoa={pessoa} tamanho="md"/>
                    <div>
                      <p className="font-bold text-gray-800">{pessoa?.nome}</p>
                      <p className="text-xs text-gray-500">{pessoa?.cargo} • {pessoa?.setor}</p>
                    </div>
                    <div className="ml-auto text-right">
                      <p className="text-3xl font-bold text-blue-600">{resultado.pct}%</p>
                      <span className={`text-xs font-bold px-2 py-1 rounded ${legend.cor}`}>{legend.label}</span>
                    </div>
                  </div>
                  {/* Barra de progresso */}
                  <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                    <div className={`h-3 rounded-full transition-all ${resultado.pct>=90?'bg-green-700':resultado.pct>=70?'bg-green-500':resultado.pct>=50?'bg-yellow-400':'bg-red-600'}`}
                      style={{ width: `${resultado.pct}%` }}/>
                  </div>

                  {/* Por habilidade */}
                  <h3 className="font-bold text-gray-700 mb-3 text-sm">Por habilidade:</h3>
                  <div className="space-y-2">
                    {resultado.habs.map((h: any) => {
                      const av = resultado.avsRecentes[h.id];
                      if (!av) return (
                        <div key={h.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm">
                          <span className="text-gray-500">{h.nome}</span>
                          <span className="text-gray-400 text-xs">Sem avaliação</span>
                        </div>
                      );
                      const pctHab = (((+(av.nota_c||0))+(+(av.nota_h||0))+(+(av.nota_a||0)))/9*100).toFixed(0);
                      const leg = getLegendaResultado(+pctHab);
                      const tend = getTendencia(pessoaResultado, h.id);
                      return (
                        <div key={h.id} className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-semibold text-gray-700">{h.nome}</span>
                            <div className="flex items-center gap-2">
                              {tend && <span className="text-xs text-gray-500">{tend}</span>}
                              <span className={`text-xs font-bold px-2 py-0.5 rounded ${leg.cor}`}>{pctHab}%</span>
                            </div>
                          </div>
                          <div className="flex gap-3 text-xs text-gray-500">
                            <span>C: <strong>{av.nota_c}</strong></span>
                            <span>H: <strong>{av.nota_h}</strong></span>
                            <span>A: <strong>{av.nota_a}</strong></span>
                            <span className="ml-auto">{new Date(av.data_avaliacao+'T00:00:00').toLocaleDateString('pt-BR')}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Histórico de avaliações */}
                <div className="bg-white rounded-xl shadow p-5">
                  <h3 className="font-bold text-gray-700 mb-3">📅 Histórico de Avaliações</h3>
                  {(() => {
                    const datas = [...new Set(avaliacoes.filter(a=>a.pessoa_id===pessoaResultado).map(a=>a.data_avaliacao))].sort((a,b)=>b.localeCompare(a));
                    if (datas.length === 0) return <p className="text-gray-400 text-sm">Sem histórico</p>;
                    return (
                      <div className="space-y-2">
                        {datas.map(data => {
                          const avsData = avaliacoes.filter(a=>a.pessoa_id===pessoaResultado&&a.data_avaliacao===data);
                          const total = avsData.reduce((acc,a)=>acc+(+(a.nota_c||0))+(+(a.nota_h||0))+(+(a.nota_a||0)),0);
                          const max = avsData.length * 9;
                          const pct = max > 0 ? (total/max*100).toFixed(0) : '0';
                          const leg = getLegendaResultado(+pct);
                          return (
                            <div key={data} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm">
                              <span className="text-gray-600">{new Date(data+'T00:00:00').toLocaleDateString('pt-BR')}</span>
                              <span className={`text-xs font-bold px-2 py-0.5 rounded ${leg.cor}`}>{pct}% — {leg.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>

                {/* Feedbacks */}
                {fbs.length > 0 && (
                  <div className="bg-white rounded-xl shadow p-5">
                    <h3 className="font-bold text-gray-700 mb-3">💬 Feedbacks</h3>
                    <div className="space-y-2">
                      {fbs.map(f => (
                        <div key={f.id} className="p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-400">
                          <p className="text-xs text-gray-400 mb-1">{new Date(f.data_feedback+'T00:00:00').toLocaleDateString('pt-BR')} • {f.aplicador}</p>
                          <p className="text-sm text-gray-700">{f.conteudo}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Resumo por time */}
          <div className="bg-white rounded-xl shadow p-5">
            <h2 className="text-lg font-bold text-gray-700 mb-4">🏢 Resumo por Time</h2>
            {['Inbound','Outbound','Projetos/Estoques/Custos'].map(setor => {
              const pessoasSetor = pessoas.filter((p: any) => p.setor === setor);
              const resultados = pessoasSetor.map((p: any) => calcularResultado(p.id)).filter(Boolean);
              if (resultados.length === 0) return (
                <div key={setor} className="p-3 bg-gray-50 rounded-lg mb-2">
                  <p className="text-sm font-semibold text-gray-600">{setor} — sem avaliações</p>
                </div>
              );
              const mediaSetor = resultados.reduce((acc: number, r: any) => acc + r.pct, 0) / resultados.length;
              const leg = getLegendaResultado(mediaSetor);
              return (
                <div key={setor} className="p-3 bg-gray-50 rounded-lg mb-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-700">{setor}</p>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${leg.cor}`}>{mediaSetor.toFixed(1)}%</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{resultados.length} de {pessoasSetor.length} avaliados</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── SUB-ABA: AVALIAR ── */}
      {subAba === 'avaliar' && (
        <div className="bg-white rounded-xl shadow p-5">
          <h2 className="text-lg font-bold text-gray-700 mb-4">✏️ Registrar Avaliação</h2>

          {!senhaOk ? (
            <form onSubmit={handleVerificarSenha} className="max-w-sm space-y-3">
              <p className="text-sm text-gray-600">Esta área é protegida. Digite a senha do seu time:</p>
              <input type="password" value={senhaAvaliacao}
                onChange={e => setSenhaAvaliacao(e.target.value)}
                placeholder="INBOUND / OUTBOUND / PROJETOS"
                className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"/>
              {errSenha && <p className="text-red-600 text-sm">{errSenha}</p>}
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold text-sm">
                🔓 Entrar
              </button>
            </form>
          ) : (
            <form onSubmit={handleSalvarAvaliacao} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">👤 Colaborador</label>
                  <select value={pessoaSelecionada} onChange={e => { setPessoaSelecionada(+e.target.value); setNotas({}); }}
                    className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
                    {pessoas.filter((p: any) => p.setor === setorAvaliacao).map((p: any) => <option key={p.id} value={p.id}>{p.nome} ({p.cargo})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">📅 Data da Avaliação</label>
                  <input type="date" value={dataAvaliacao} onChange={e => setDataAvaliacao(e.target.value)}
                    className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" required/>
                </div>
              </div>

              {pessoaSelecionada > 0 && (() => {
                const habs = habsDaPessoa(pessoaSelecionada);
                if (habs.length === 0) return (
                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg text-sm text-yellow-800">
                    ⚠️ Nenhuma habilidade cadastrada para este cargo. Vá em "Habilidades" para cadastrar.
                  </div>
                );
                // Verificar se já avaliou hoje
                const jaAvaliou = dataAvaliacao && avaliacoes.some(
                  a => a.pessoa_id === pessoaSelecionada && a.data_avaliacao === dataAvaliacao
                );
                if (jaAvaliou) return (
                  <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg text-sm text-red-800">
                    ⚠️ Já existe uma avaliação registrada para este colaborador nesta data. As notas não podem ser alteradas após salvar.
                  </div>
                );
                return (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase">Cargo: {pessoas.find((p:any)=>p.id===pessoaSelecionada)?.cargo}</p>
                    {habs.map(h => (
                      <div key={h.id} className="p-4 bg-gray-50 rounded-xl">
                        <p className="font-semibold text-gray-700 mb-3 text-sm">{h.nome}</p>
                        <div className="grid grid-cols-3 gap-3">
                          {(['c','h','a'] as const).map(dim => (
                            <div key={dim}>
                              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">
                                {dim === 'c' ? 'C — Conhecimento' : dim === 'h' ? 'H — Habilidade' : 'A — Atitude'}
                              </label>
                              <div className="flex gap-1">
                                {[1,2,3].map(n => (
                                  <button key={n} type="button"
                                    onClick={() => setNotas(prev => ({ ...prev, [h.id]: { ...prev[h.id], [dim]: String(n) } }))}
                                    className={`flex-1 py-2 rounded-lg font-bold text-sm transition
                                      ${notas[h.id]?.[dim] === String(n)
                                        ? 'bg-blue-600 text-white shadow'
                                        : 'bg-white border-2 border-gray-200 text-gray-600 hover:border-blue-400'}`}>
                                    {n}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    <button type="submit"
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold">
                      💾 Salvar Avaliação
                    </button>
                    <p className="text-xs text-red-500 text-center">⚠️ As notas não podem ser alteradas após salvar.</p>
                  </div>
                );
              })()}
            </form>
          )}
        </div>
      )}

      {/* ── SUB-ABA: HABILIDADES ── */}
      {subAba === 'habilidades' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow p-5">
            <h2 className="text-lg font-bold text-gray-700 mb-4">🎯 Cadastrar Habilidade por Cargo</h2>
            <form onSubmit={handleAdicionarHabilidade} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <select value={formHab.cargo} onChange={e => setFormHab(f => ({ ...f, cargo: e.target.value }))}
                className="border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
                <option value="">Selecione o cargo...</option>
                {cargosUnicos.map((c: string) => <option key={c} value={c}>{c}</option>)}
              </select>
              <input type="text" placeholder="Nome da habilidade/serviço" value={formHab.nome}
                onChange={e => setFormHab(f => ({ ...f, nome: e.target.value }))}
                className="border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" required/>
              <button type="submit" className="bg-green-600 hover:bg-green-700 text-white rounded-lg px-4 py-2 font-bold text-sm">
                ➕ Adicionar
              </button>
            </form>
          </div>

          {cargosUnicos.map((cargo: string) => {
            const habsCargo = habilidades.filter(h => h.cargo === cargo);
            if (habsCargo.length === 0) return null;
            return (
              <div key={cargo} className="bg-white rounded-xl shadow p-5">
                <h3 className="font-bold text-gray-700 mb-3 text-sm">{cargo}</h3>
                <div className="space-y-2">
                  {habsCargo.map(h => (
                    <div key={h.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-700">{h.nome}</span>
                      <button onClick={() => handleRemoverHabilidade(h.id)}
                        className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs font-bold">
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── SUB-ABA: FEEDBACK ── */}
      {subAba === 'feedback' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow p-5">
            <h2 className="text-lg font-bold text-gray-700 mb-4">💬 Registrar Feedback</h2>
            <form onSubmit={handleSalvarFeedback} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">👤 Colaborador</label>
                  <select value={feedbackPessoa} onChange={e => setFeedbackPessoa(+e.target.value)}
                    className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
                    {pessoas.map((p: any) => <option key={p.id} value={p.id}>{p.nome} ({p.setor})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">📅 Data de Aplicação</label>
                  <input type="date" value={feedbackData} onChange={e => setFeedbackData(e.target.value)}
                    className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" required/>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">💬 Conteúdo do Feedback</label>
                <textarea value={feedbackTexto} onChange={e => setFeedbackTexto(e.target.value)}
                  rows={4} placeholder="Descreva o feedback..."
                  className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 resize-none" required/>
              </div>
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold text-sm">
                💾 Salvar Feedback
              </button>
            </form>
          </div>

          {/* Histórico feedbacks */}
          <div className="bg-white rounded-xl shadow p-5">
            <h2 className="text-lg font-bold text-gray-700 mb-4">📋 Histórico de Feedbacks</h2>
            {feedbacks.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-6">Sem feedbacks registrados</p>
            ) : (
              <div className="space-y-3">
                {feedbacks.map(f => {
                  const p = pessoas.find((x: any) => x.id === f.pessoa_id);
                  return (
                    <div key={f.id} className="p-4 bg-yellow-50 rounded-xl border-l-4 border-yellow-400">
                      <div className="flex items-center gap-2 mb-2">
                        <Avatar pessoa={p} tamanho="sm"/>
                        <div>
                          <p className="text-sm font-bold text-gray-700">{p?.nome}</p>
                          <p className="text-xs text-gray-400">
                            {new Date(f.data_feedback+'T00:00:00').toLocaleDateString('pt-BR')} • {f.aplicador}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-700">{f.conteudo}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENTE: GuiaModal
// ══════════════════════════════════════════════════════════════════════════════
const PASSOS_GUIA = [
  {
    aba: null,
    titulo: '👋 Bem-vindo ao Daxia People Analytics!',
    icone: '🏗️',
    descricao: 'Este sistema foi feito para a gestão de RH da operação logística em Guarulhos/SP. Vamos te mostrar como usar cada parte do sistema em poucos passos.',
    dica: '💡 Este guia aparece automaticamente na primeira vez. Você pode acessá-lo novamente pelo botão ❓ no canto da tela.',
  },
  {
    aba: 'resumos',
    titulo: '📊 Aba Resumos',
    icone: '📊',
    descricao: 'É o painel principal. Aqui você vê os indicadores do período:\n\n• Taxa de absenteísmo e custo total de HE\n• Gráficos de evolução ao longo do tempo\n• Top 10 de quem mais fez HE e quem mais faltou\n• Insights Inteligentes com alertas automáticos',
    dica: '💡 Use os filtros de data e setor para focar em um time específico ou período.',
  },
  {
    aba: 'dashboard',
    titulo: '📈 Aba Dashboard',
    icone: '📈',
    descricao: 'Visão executiva com os medidores (gauges) de HE e Absenteísmo versus as metas definidas.\n\n• Verde = dentro da meta\n• Amarelo = atenção\n• Vermelho = acima da meta\n\nTambém mostra o status geral do período em cards coloridos.',
    dica: '💡 As metas são configuráveis na aba ⚙️ Configuração.',
  },
  {
    aba: 'lancamentos',
    titulo: '📝 Aba Lançamentos',
    icone: '📝',
    descricao: 'Aqui você registra todas as ocorrências do dia a dia:\n\n• Horas extras (60% e 100%) — informar em minutos\n• Faltas injustificadas e atestados — valor fixo de 1 dia\n• Atrasos e saídas antecipadas — informar em minutos\n• Advertências — desclassificam o bônus automaticamente\n\nO histórico completo fica na tabela abaixo, incluindo colaboradores inativos.',
    dica: '💡 Atraso e saída antecipada com aviso comunicado NÃO desclassificam o bônus. Marque o checkbox!',
  },
  {
    aba: 'ferias',
    titulo: '🏖️ Aba Férias',
    icone: '🏖️',
    descricao: 'Registre o período de férias de cada colaborador informando data de início e fim.\n\n• O bônus é calculado proporcionalmente considerando apenas os dias de férias dentro do mês atual\n• O histórico dos últimos 12 meses fica disponível na tabela abaixo\n• Conflitos de férias no mesmo time geram alertas nos Insights',
    dica: '💡 Férias em outros meses não afetam o bônus do mês atual.',
  },
  {
    aba: 'bonus',
    titulo: '🎁 Aba Bônus',
    icone: '🎁',
    descricao: 'Gestão do bônus mensal de R$ 100 por colaborador:\n\n• Elegíveis: colaboradores sem ocorrências graves no mês\n• Desclassificados: falta injustificada, advertência ou atraso sem aviso\n• O valor total já considera os proporcionais de quem tirou férias\n• Botão "Reset Mensal" volta todos os ativos para elegíveis no início de cada mês',
    dica: '💡 Colaboradores inativos não aparecem aqui. Inativar um colaborador remove automaticamente a elegibilidade.',
  },
  {
    aba: 'cha',
    titulo: '🧠 Aba Matriz CHA',
    icone: '🧠',
    descricao: 'Avaliação de Conhecimento, Habilidade e Atitude por colaborador:\n\n• Habilidades: cadastradas por cargo (todos do cargo herdam)\n• Avaliar: protegido por senha do time (INBOUND, OUTBOUND ou PROJETOS). Cada senha mostra apenas os colaboradores do setor\n• Notas de 1 a 3 por dimensão — não podem ser alteradas após salvar\n• Resultados: gráfico por colaborador com tendência e histórico\n• Feedback: registro individual com data',
    dica: '💡 Nota 1 = não possui | Nota 2 = adquiriu | Nota 3 = autonomia total, pode ensinar.',
  },
  {
    aba: 'auditoria',
    titulo: '🔍 Aba Auditoria',
    icone: '🔍',
    descricao: 'Registro automático de todas as alterações feitas no sistema:\n\n• Toda inserção, edição ou exclusão é registrada com usuário e horário\n• Útil para rastrear quem fez o quê e quando\n• O botão "Limpar >30 dias" remove registros antigos (exige senha)',
    dica: '💡 A auditoria não precisa de manutenção manual — ela registra tudo automaticamente.',
  },
  {
    aba: 'configuracao',
    titulo: '⚙️ Aba Configuração',
    icone: '⚙️',
    descricao: 'Central de cadastros e parâmetros do sistema:\n\n• Metas de HE (R$) e Absenteísmo (%)\n• Horas úteis por dia (usado no cálculo de absenteísmo)\n• Cadastro de cargos com valores de HE 60% e 100%\n• Cadastro de colaboradores com cargo e setor\n• Ativar/inativar colaboradores\n• Cadastro de feriados regionais e pontos facultativos\n• Upload de foto para cada colaborador',
    dica: '💡 Sempre cadastre os feriados locais de Guarulhos para os Insights funcionarem corretamente.',
  },
  {
    aba: 'calendario',
    titulo: '📅 Calendário Visual',
    icone: '📅',
    descricao: 'Visualize todos os lançamentos em formato de calendário mensal:\n\n• Cada dia é colorido conforme o tipo de ocorrência\n  🔵 Azul = HE | 🔴 Vermelho = Absenteísmo | 🟡 Amarelo = HE + Abs\n  🟢 Verde = Férias | 🟣 Roxo = Advertência | 🟠 Laranja = Feriado\n• Clique em qualquer dia para ver todos os lançamentos daquele dia\n• Feriados cadastrados aparecem marcados automaticamente\n• Use as setas para navegar entre os meses\n• Filtro por setor disponível no canto superior direito',
    dica: '💡 Use o calendário para identificar rapidamente dias críticos e padrões visuais que as tabelas não mostram.',
  },
  {
    aba: 'comparativo',
    titulo: '📊 Comparativo Mês a Mês',
    icone: '📊',
    descricao: 'Compare HE e Absenteísmo entre o mesmo mês em até 3 anos:\n\n• Alterne entre HE (R$) e Absenteísmo (%) nos botões do topo\n• Barras lado a lado para visualizar a evolução ano a ano\n• O sistema vai acumulando dados — começa com o que existe e expande até o trienio completo\n• Tabela detalhada abaixo com todos os valores\n• Botão "Exportar Excel" para levar o comparativo para apresentações\n• Filtro por setor disponível',
    dica: '💡 Compare o mesmo mês entre anos para identificar tendências sazonais — ex: maio sempre tem mais HE no fechamento?',
  },
  {
    aba: 'calor',
    titulo: '🌡️ Mapa de Calor',
    icone: '🌡️',
    descricao: 'Identifique padrões visuais de concentração de HE e Absenteísmo:\n\n• Por dia da semana: acumulado histórico completo — qual dia da semana concentra mais ocorrências?\n• Por calendário: visão mensal com intensidade de cor por dia\n  ⬜ Sem ocorrências → 🟥 Alta concentração\n• Alterne entre HE e Absenteísmo nos botões do topo\n• Insight automático destaca o pico do período\n• Filtro por setor disponível',
    dica: '💡 O mapa de calor por dia da semana é ideal para identificar padrões recorrentes como "segunda-feira tem mais faltas".',
  },
  {
    aba: null,
    titulo: '✅ Pronto! Você já sabe tudo.',
    icone: '🎉',
    descricao: 'O sistema está configurado e pronto para uso. Lembre-se:\n\n• Registre os lançamentos diariamente\n• Faça o Reset Mensal do bônus no início de cada mês\n• Consulte os Insights Inteligentes para identificar padrões\n• Use o botão ❓ em qualquer tela para ver a ajuda daquela aba',
    dica: '💡 Dúvidas? O botão ❓ flutuante no canto inferior direito sempre traz a ajuda da aba que você está.',
  },
];

function GuiaModal({ passo, setPasso, abaFiltro, onFechar }: {
  passo: number;
  setPasso: (n: number) => void;
  abaFiltro: string | null;
  onFechar: () => void;
}) {
  const passos = abaFiltro
    ? PASSOS_GUIA.filter(p => p.aba === abaFiltro)
    : PASSOS_GUIA;

  const atual = passos[passo] || passos[0];
  const total = passos.length;
  const progresso = ((passo + 1) / total) * 100;
  const ehUltimo = passo === total - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Barra de progresso */}
        <div className="h-1.5 bg-gray-200">
          <div
            className="h-1.5 bg-blue-600 transition-all duration-500"
            style={{ width: `${progresso}%` }}
          />
        </div>

        {/* Cabeçalho */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold opacity-70 uppercase tracking-wider">
              {abaFiltro ? 'Ajuda desta aba' : `Passo ${passo + 1} de ${total}`}
            </span>
            <button onClick={onFechar}
              className="text-white/70 hover:text-white text-xl font-bold leading-none">
              ✕
            </button>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-5xl">{atual.icone}</div>
            <h2 className="text-xl font-bold leading-tight">{atual.titulo}</h2>
          </div>
        </div>

        {/* Conteúdo */}
        <div className="p-6">
          <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line mb-4">
            {atual.descricao}
          </p>
          {atual.dica && (
            <div className="bg-blue-50 border-l-4 border-blue-400 rounded-lg p-3">
              <p className="text-blue-800 text-sm">{atual.dica}</p>
            </div>
          )}
        </div>

        {/* Navegação */}
        <div className="px-6 pb-6 flex items-center justify-between gap-3">
          <div className="flex gap-1">
            {passos.map((_, i) => (
              <button key={i} onClick={() => setPasso(i)}
                className={`w-2 h-2 rounded-full transition-all ${i === passo ? 'bg-blue-600 w-5' : 'bg-gray-300 hover:bg-gray-400'}`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            {passo > 0 && (
              <button onClick={() => setPasso(passo - 1)}
                className="px-4 py-2 rounded-lg border-2 border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50">
                ← Anterior
              </button>
            )}
            {ehUltimo ? (
              <button onClick={onFechar}
                className="px-6 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-bold text-sm">
                ✅ Concluir
              </button>
            ) : (
              <button onClick={() => setPasso(passo + 1)}
                className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm">
                Próximo →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENTE: CalendarioVisual
// ══════════════════════════════════════════════════════════════════════════════
function CalendarioVisual({ lancamentos, pessoas, feriados, tabelaHE, horasUteisDia, Avatar }: any) {
  const hoje = new Date();
  const [mesSel, setMesSel] = useState(hoje.getMonth());
  const [anoSel, setAnoSel] = useState(hoje.getFullYear());
  const [setorFiltro, setSetorFiltro] = useState('');
  const [diaSelecionado, setDiaSelecionado] = useState<string|null>(null);
  const [tooltipDia, setTooltipDia] = useState<string|null>(null);

  const setores = ['', 'Inbound', 'Outbound', 'Projetos/Estoques/Custos'];
  const nomeMes = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const feriadosSet = new Set(feriados.map((f: any) => f.data));

  const primeiroDia = new Date(anoSel, mesSel, 1).getDay();
  const totalDias = new Date(anoSel, mesSel + 1, 0).getDate();

  const pad = (n: number) => String(n).padStart(2, '0');
  const dataStr = (dia: number) => `${anoSel}-${pad(mesSel + 1)}-${pad(dia)}`;

  const pessoasFiltro = setorFiltro ? pessoas.filter((p: any) => p.setor === setorFiltro) : pessoas;
  const idsFiltro = new Set(pessoasFiltro.map((p: any) => p.id));

  const lancsPorDia = (dia: number) => {
    const data = dataStr(dia);
    return lancamentos.filter((l: any) => l.data === data && idsFiltro.has(l.pessoa_id));
  };

  const corDia = (dia: number) => {
    const data = dataStr(dia);
    const d = new Date(data + 'T00:00:00');
    const diaSem = d.getDay();
    if (diaSem === 0 || diaSem === 6) return 'bg-gray-100';
    if (feriadosSet.has(data)) return 'bg-orange-100';
    const lancs = lancsPorDia(dia);
    if (lancs.length === 0) return 'bg-white hover:bg-blue-50';
    const temHE = lancs.some((l: any) => l.tipo.includes('he'));
    const temAbs = lancs.some((l: any) => ['falta-injustificada','atestado','atraso','saida-antecipada'].includes(l.tipo));
    const temFerias = lancs.some((l: any) => l.tipo === 'férias');
    const temAdv = lancs.some((l: any) => l.tipo === 'advertencia');
    if (temAdv) return 'bg-purple-100 hover:bg-purple-200';
    if (temAbs && temHE) return 'bg-yellow-100 hover:bg-yellow-200';
    if (temAbs) return 'bg-red-100 hover:bg-red-200';
    if (temHE) return 'bg-blue-100 hover:bg-blue-200';
    if (temFerias) return 'bg-green-100 hover:bg-green-200';
    return 'bg-gray-50 hover:bg-gray-100';
  };

  const mudarMes = (delta: number) => {
    let novoMes = mesSel + delta;
    let novoAno = anoSel;
    if (novoMes > 11) { novoMes = 0; novoAno++; }
    if (novoMes < 0) { novoMes = 11; novoAno--; }
    setMesSel(novoMes);
    setAnoSel(novoAno);
    setDiaSelecionado(null);
  };

  const lancsDiaSel = diaSelecionado
    ? lancamentos.filter((l: any) => l.data === diaSelecionado && idsFiltro.has(l.pessoa_id))
    : [];

  const feriadoDiaSel = diaSelecionado ? feriados.find((f: any) => f.data === diaSelecionado) : null;

  return (
    <div className="pb-20 md:pb-0 space-y-4">
      {/* Controles */}
      <div className="bg-white rounded-xl shadow p-4">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => mudarMes(-1)}
              className="w-9 h-9 rounded-lg bg-gray-100 hover:bg-gray-200 font-bold text-gray-600 flex items-center justify-center">
              ‹
            </button>
            <h2 className="text-lg font-bold text-gray-700 min-w-[180px] text-center">
              {nomeMes[mesSel]} {anoSel}
            </h2>
            <button onClick={() => mudarMes(1)}
              className="w-9 h-9 rounded-lg bg-gray-100 hover:bg-gray-200 font-bold text-gray-600 flex items-center justify-center">
              ›
            </button>
            <button onClick={() => { setMesSel(hoje.getMonth()); setAnoSel(hoje.getFullYear()); }}
              className="px-3 py-1.5 rounded-lg bg-blue-100 text-blue-700 text-xs font-bold hover:bg-blue-200">
              Hoje
            </button>
          </div>
          <select value={setorFiltro} onChange={e => setSetorFiltro(e.target.value)}
            className="border-2 border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500">
            <option value="">Todos os setores</option>
            {['Inbound','Outbound','Projetos/Estoques/Custos'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-2 text-xs">
        {[
          ['bg-blue-100','HE'],['bg-red-100','Absenteísmo'],['bg-yellow-100','HE + Abs'],
          ['bg-green-100','Férias'],['bg-purple-100','Advertência'],
          ['bg-orange-100','Feriado'],['bg-gray-100','Fim de semana'],
        ].map(([cor, label]) => (
          <div key={label} className="flex items-center gap-1">
            <div className={`w-3 h-3 rounded ${cor}`}/>
            <span className="text-gray-600">{label}</span>
          </div>
        ))}
      </div>

      {/* Grade do calendário */}
      <div className="bg-white rounded-xl shadow p-4">
        {/* Cabeçalho dias da semana */}
        <div className="grid grid-cols-7 mb-2">
          {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(d => (
            <div key={d} className="text-center text-xs font-bold text-gray-400 py-1">{d}</div>
          ))}
        </div>
        {/* Dias */}
        <div className="grid grid-cols-7 gap-1">
          {/* Espaços vazios antes do primeiro dia */}
          {Array.from({ length: primeiroDia }).map((_, i) => <div key={`vazio-${i}`}/>)}
          {/* Dias do mês */}
          {Array.from({ length: totalDias }).map((_, i) => {
            const dia = i + 1;
            const data = dataStr(dia);
            const lancs = lancsPorDia(dia);
            const ehHoje = data === hoje.toISOString().split('T')[0];
            const selecionado = diaSelecionado === data;
            const feriado = feriadosSet.has(data);
            const diaSem = new Date(data + 'T00:00:00').getDay();
            const fimSemana = diaSem === 0 || diaSem === 6;

            return (
              <button key={dia}
                onClick={() => setDiaSelecionado(selecionado ? null : data)}
                onMouseEnter={() => !fimSemana && lancs.length > 0 && setTooltipDia(data)}
                onMouseLeave={() => setTooltipDia(null)}
                className={`relative rounded-lg p-1 min-h-[52px] text-left transition-all
                  ${corDia(dia)}
                  ${selecionado ? 'ring-2 ring-blue-500 ring-offset-1' : ''}
                  ${ehHoje ? 'ring-2 ring-blue-400' : ''}
                  ${fimSemana ? 'opacity-70' : 'cursor-pointer'}`}>
                <span className={`text-xs font-bold block ${ehHoje ? 'text-blue-600' : fimSemana ? 'text-gray-400' : 'text-gray-700'}`}>
                  {dia}
                  {feriado && <span className="ml-1 text-orange-500">🗓</span>}
                </span>
                {/* Indicadores de lançamentos */}
                {lancs.length > 0 && (
                  <div className="flex flex-wrap gap-0.5 mt-0.5">
                    {lancs.slice(0, 3).map((l: any, idx: number) => (
                      <div key={idx} className={`w-1.5 h-1.5 rounded-full
                        ${l.tipo.includes('he') ? 'bg-blue-500' :
                          l.tipo === 'férias' ? 'bg-green-500' :
                          l.tipo === 'advertencia' ? 'bg-purple-500' :
                          'bg-red-500'}`}/>
                    ))}
                    {lancs.length > 3 && <span className="text-gray-400" style={{fontSize:'8px'}}>+{lancs.length-3}</span>}
                  </div>
                )}
                {/* Tooltip ao hover */}
                {tooltipDia === data && lancs.length > 0 && (
                  <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-gray-900 text-white rounded-xl shadow-2xl p-3 text-xs pointer-events-none"
                    style={{minWidth:'160px'}}>
                    <div className="font-bold mb-1.5 text-blue-300 border-b border-gray-700 pb-1">
                      {dia}/{mesSel+1} — {lancs.length} evento{lancs.length>1?'s':''}
                    </div>
                    {lancs.slice(0, 5).map((l: any, idx: number) => {
                      const p = pessoas.find((x: any) => x.id === l.pessoa_id);
                      return (
                        <div key={idx} className="flex items-center gap-1.5 py-0.5">
                          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0
                            ${l.tipo.includes('he') ? 'bg-blue-400' :
                              l.tipo === 'férias' ? 'bg-green-400' :
                              l.tipo === 'advertencia' ? 'bg-purple-400' :
                              'bg-red-400'}`}/>
                          <span className="truncate text-gray-200">{p?.nome?.split(' ')[0]}</span>
                          <span className="text-gray-400 flex-shrink-0 ml-auto">
                            {l.tipo.includes('he') ? 'HE' :
                              l.tipo === 'férias' ? 'Fér.' :
                              l.tipo === 'falta-injustificada' ? 'Falta' :
                              l.tipo === 'atestado' ? 'Ates.' :
                              l.tipo === 'atraso' ? 'Atr.' :
                              l.tipo === 'advertencia' ? 'Adv.' :
                              l.tipo === 'saida-antecipada' ? 'S.Ant.' : l.tipo}
                          </span>
                        </div>
                      );
                    })}
                    {lancs.length > 5 && (
                      <div className="text-gray-400 mt-1 pt-1 border-t border-gray-700">+{lancs.length-5} mais — clique para ver</div>
                    )}
                    {/* Setinha do tooltip */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"/>
                  </div>
                )}
              </button>
          })}
        </div>
      </div>

      {/* Painel do dia selecionado */}
      {diaSelecionado && (
        <div className="bg-white rounded-xl shadow p-5">
          <h3 className="font-bold text-gray-700 mb-3">
            📅 {new Date(diaSelecionado + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
            {feriadoDiaSel && <span className="ml-2 text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded font-normal">{feriadoDiaSel.descricao}</span>}
          </h3>
          {lancsDiaSel.length === 0 ? (
            <p className="text-gray-400 text-sm">Nenhum lançamento neste dia{setorFiltro ? ` para ${setorFiltro}` : ''}.</p>
          ) : (
            <div className="space-y-2">
              {lancsDiaSel.map((l: any) => {
                const p = pessoas.find((x: any) => x.id === l.pessoa_id);
                const tab = tabelaHE[p?.cargo || ''];
                const mins = +(l.minutos || 0);
                const val = l.tipo === 'he-60' ? (tab?.he60||0)*(mins/60)
                  : l.tipo === 'he-100' ? (tab?.he100||0)*(mins/60) : 0;
                return (
                  <div key={l.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Avatar pessoa={p} tamanho="sm"/>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-800">{p?.nome}</p>
                      <p className="text-xs text-gray-500">{p?.setor}</p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${getTipoCor(l.tipo)}`}>
                      {getTipoLabel(l.tipo)}
                    </span>
                    {mins > 0 && <span className="text-xs text-gray-500">{mins}min</span>}
                    {val > 0 && <span className="text-xs font-bold text-blue-600">R$ {val.toFixed(2)}</span>}
                    {l.descricao && <span className="text-xs text-gray-400 hidden md:block">{l.descricao}</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENTE: ComparativoMeses
// ══════════════════════════════════════════════════════════════════════════════
function ComparativoMeses({ lancamentos, pessoas, tabelaHE, horasUteisDia }: any) {
  const [metricaSel, setMetricaSel] = useState<'he'|'abs'>('he');
  const [setorFiltro, setSetorFiltro] = useState('');

  const nomeMes = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const hoje = new Date();
  const mesAtual = hoje.getMonth();
  const anoAtual = hoje.getFullYear();

  // Gerar trienio: mesmo mês nos últimos 3 anos disponíveis
  const mesesComparacao = useMemo(() => {
    const resultado: { ano: number; mes: number; label: string }[] = [];
    for (let anosAtras = 2; anosAtras >= 0; anosAtras--) {
      const ano = anoAtual - anosAtras;
      // Incluir todos os meses com dados, até o mês atual
      const mesLimite = ano === anoAtual ? mesAtual : 11;
      for (let mes = 0; mes <= mesLimite; mes++) {
        resultado.push({ ano, mes, label: `${nomeMes[mes]}/${ano}` });
      }
    }
    return resultado;
  }, [mesAtual, anoAtual]);

  const pessoasFiltro = setorFiltro
    ? pessoas.filter((p: any) => p.setor === setorFiltro)
    : pessoas;
  const idsFiltro = new Set(pessoasFiltro.map((p: any) => p.id));

  const calcularMes = (ano: number, mes: number) => {
    const ini = `${ano}-${String(mes+1).padStart(2,'0')}-01`;
    const fim = `${ano}-${String(mes+1).padStart(2,'0')}-${String(new Date(ano,mes+1,0).getDate()).padStart(2,'0')}`;
    const lancs = lancamentos.filter((l: any) =>
      l.data >= ini && l.data <= fim && idsFiltro.has(l.pessoa_id)
    );

    // HE
    let totalHE = 0;
    lancs.filter((l: any) => l.tipo.includes('he')).forEach((l: any) => {
      const p = pessoas.find((x: any) => x.id === l.pessoa_id);
      const tab = tabelaHE[p?.cargo || ''];
      const mins = +(l.minutos || 0);
      totalHE += l.tipo === 'he-60' ? (tab?.he60||0)*(mins/60) : (tab?.he100||0)*(mins/60);
    });

    // Absenteísmo
    let totalAbs = 0;
    const diasUteis = (() => {
      let count = 0;
      for (let d = new Date(ini+'T00:00:00'); d <= new Date(fim+'T00:00:00'); d.setDate(d.getDate()+1)) {
        const dia = d.getDay();
        if (dia >= 1 && dia <= 5) count++;
      }
      return count;
    })();
    const horasDisp = horasUteisDia * pessoasFiltro.filter((p: any) => p.ativo !== false).length * diasUteis;
    lancs.forEach((l: any) => {
      if (l.tipo === 'falta-injustificada' || l.tipo === 'atestado') totalAbs += horasUteisDia;
      else if (l.tipo === 'atestado-horas') totalAbs += +(l.horas || horasUteisDia);
      else if (l.tipo === 'atraso') totalAbs += +(l.minutos||0)/60;
      else if (l.tipo === 'saida-antecipada') totalAbs += +(l.minutos||0)/60;
    });
    const taxaAbs = horasDisp > 0 ? (totalAbs/horasDisp*100) : 0;
    const temDados = lancs.length > 0;

    return { totalHE, taxaAbs, temDados, label: `${nomeMes[mes]}/${ano}` };
  };

  const dadosMeses = useMemo(() =>
    mesesComparacao.map(m => ({ ...calcularMes(m.ano, m.mes), ano: m.ano, mes: m.mes })),
    [mesesComparacao, lancamentos, pessoasFiltro, tabelaHE, horasUteisDia]
  );

  // Filtrar apenas meses com dados
  const dadosComDados = dadosMeses.filter(d => d.temDados);

  // Agrupar por mês (para comparação entre anos)
  const mesesUnicos = [...new Set(dadosComDados.map(d => d.mes))];
  const anosUnicos = [...new Set(dadosMeses.map(d => d.ano))].sort();

  // Valor máximo para escala das barras
  const maxValorHE = Math.max(...dadosComDados.map(d => d.totalHE), 1);
  const maxValorAbs = Math.max(...dadosComDados.map(d => d.taxaAbs), 1);

  const coresAnos = ['bg-blue-400', 'bg-blue-600', 'bg-blue-800'];
  const coresAnosTexto = ['text-blue-400', 'text-blue-600', 'text-blue-800'];
  const coresAnosAbs = ['bg-red-300', 'bg-red-500', 'bg-red-700'];

  const exportarTrienio = () => {
    const nomeMesExp = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    const linhas: string[] = [];
    const cabAnos = anosUnicos.map(a => `HE ${a} (R$);Abs ${a} (%)`).join(';');
    linhas.push(`Mês;${cabAnos}`);
    mesesUnicos.forEach(mes => {
      const row = [nomeMesExp[mes]];
      anosUnicos.forEach(ano => {
        const dado = dadosMeses.find(d => d.mes === mes && d.ano === ano);
        row.push(dado?.temDados ? dado.totalHE.toFixed(2) : '-');
        row.push(dado?.temDados ? dado.taxaAbs.toFixed(2) : '-');
      });
      linhas.push(row.join(';'));
    });
    const blob = new Blob(['\uFEFF' + linhas.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Comparativo_Trienio_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };


  if (dadosComDados.length === 0) return (
    <div className="bg-white rounded-xl shadow p-8 text-center pb-20 md:pb-0">
      <p className="text-4xl mb-3">📊</p>
      <p className="text-gray-400">Sem dados suficientes para comparação. Registre lançamentos para que os comparativos apareçam.</p>
    </div>
  );

  return (
    <div className="pb-20 md:pb-0 space-y-6">
      {/* Controles */}
      <div className="bg-white rounded-xl shadow p-4 flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2">
          <button onClick={() => setMetricaSel('he')}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition ${metricaSel==='he'?'bg-blue-600 text-white':'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            💰 Horas Extras
          </button>
          <button onClick={() => setMetricaSel('abs')}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition ${metricaSel==='abs'?'bg-red-600 text-white':'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            📉 Absenteísmo
          </button>
        </div>
        <select value={setorFiltro} onChange={e => setSetorFiltro(e.target.value)}
          className="border-2 border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500">
          <option value="">Todos os setores</option>
          {['Inbound','Outbound','Projetos/Estoques/Custos'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button onClick={exportarTrienio}
          className="px-4 py-2 rounded-lg font-bold text-sm bg-green-600 hover:bg-green-700 text-white">
          📥 Exportar Excel
        </button>
      </div>

      {/* Legenda de anos */}
      <div className="flex gap-4 flex-wrap">
        {anosUnicos.map((ano, i) => (
          <div key={ano} className="flex items-center gap-2">
            <div className={`w-4 h-4 rounded ${metricaSel==='he'?coresAnos[i]:coresAnosAbs[i]}`}/>
            <span className="text-sm font-bold text-gray-600">{ano}</span>
          </div>
        ))}
      </div>

      {/* Gráfico de barras por mês */}
      <div className="bg-white rounded-xl shadow p-5">
        <h2 className="text-lg font-bold text-gray-700 mb-1">
          {metricaSel === 'he' ? '💰 Custo de Horas Extras por Mês' : '📉 Taxa de Absenteísmo por Mês'}
        </h2>
        <p className="text-xs text-gray-400 mb-5">Comparativo dos últimos 3 anos • Apenas meses com dados</p>

        <div className="space-y-4">
          {mesesUnicos.map(mes => {
            const dadosMes = anosUnicos.map(ano => dadosMeses.find(d => d.mes === mes && d.ano === ano));
            const algumTemDado = dadosMes.some(d => d?.temDados);
            if (!algumTemDado) return null;

            return (
              <div key={mes}>
                <p className="text-sm font-bold text-gray-600 mb-2">{nomeMes[mes]}</p>
                <div className="space-y-1.5">
                  {dadosMes.map((dado, i) => {
                    if (!dado) return null;
                    const valor = metricaSel === 'he' ? dado.totalHE : dado.taxaAbs;
                    const max = metricaSel === 'he' ? maxValorHE : maxValorAbs;
                    const pct = Math.max((valor/max)*100, valor > 0 ? 2 : 0);
                    const corBarra = metricaSel === 'he' ? coresAnos[i] : coresAnosAbs[i];
                    return (
                      <div key={dado.ano} className="flex items-center gap-3">
                        <span className="text-xs text-gray-400 w-8 text-right">{dado.ano}</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                          {dado.temDados ? (
                            <div className={`h-6 rounded-full flex items-center px-2 transition-all duration-700 ${corBarra}`}
                              style={{ width: `${pct}%`, minWidth: valor > 0 ? '40px' : '0' }}>
                              <span className="text-white text-xs font-bold whitespace-nowrap">
                                {metricaSel === 'he' ? `R$${valor.toFixed(0)}` : `${valor.toFixed(1)}%`}
                              </span>
                            </div>
                          ) : (
                            <div className="h-6 flex items-center px-2">
                              <span className="text-gray-300 text-xs">sem dados</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabela resumo */}
      <div className="bg-white rounded-xl shadow p-5">
        <h2 className="text-lg font-bold text-gray-700 mb-4">📋 Tabela Comparativa</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead>
              <tr className="bg-gray-100">
                <th className="text-left py-2 px-3 font-bold text-gray-600">Mês</th>
                {anosUnicos.map(ano => (
                  <th key={ano} className="text-center py-2 px-3 font-bold text-gray-600" colSpan={2}>{ano}</th>
                ))}
              </tr>
              <tr className="bg-gray-50 text-xs text-gray-400">
                <th className="py-1 px-3"/>
                {anosUnicos.map(ano => (
                  <>
                    <th key={`${ano}-he`} className="py-1 px-2 text-center">HE (R$)</th>
                    <th key={`${ano}-abs`} className="py-1 px-2 text-center">Abs (%)</th>
                  </>
                ))}
              </tr>
            </thead>
            <tbody>
              {mesesUnicos.map((mes, i) => (
                <tr key={mes} className={i%2===0?'bg-gray-50':'bg-white'}>
                  <td className="py-2 px-3 font-semibold text-gray-700">{nomeMes[mes]}</td>
                  {anosUnicos.map(ano => {
                    const dado = dadosMeses.find(d => d.mes === mes && d.ano === ano);
                    return (
                      <>
                        <td key={`${ano}-he`} className="py-2 px-2 text-center text-blue-600 font-bold text-xs">
                          {dado?.temDados ? `R$${dado.totalHE.toFixed(0)}` : <span className="text-gray-300">—</span>}
                        </td>
                        <td key={`${ano}-abs`} className="py-2 px-2 text-center text-red-600 font-bold text-xs">
                          {dado?.temDados ? `${dado.taxaAbs.toFixed(1)}%` : <span className="text-gray-300">—</span>}
                        </td>
                      </>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENTE: MapaCalor
// ══════════════════════════════════════════════════════════════════════════════
function MapaCalor({ lancamentos, pessoas, horasUteisDia }: any) {
  const [metricaSel, setMetricaSel] = useState<'abs'|'he'>('abs');
  const [setorFiltro, setSetorFiltro] = useState('');
  const [visaoSel, setVisaoSel] = useState<'semana'|'calendario'>('semana');

  const hoje = new Date();
  const [mesSel, setMesSel] = useState(hoje.getMonth());
  const [anoSel, setAnoSel] = useState(hoje.getFullYear());
  const nomeMes = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  const pessoasFiltro = setorFiltro ? pessoas.filter((p: any) => p.setor === setorFiltro) : pessoas;
  const idsFiltro = new Set(pessoasFiltro.map((p: any) => p.id));

  const diasSemana = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

  // ── Visão por dia da semana ───────────────────────────────────────────────────
  const dadosPorDiaSemana = useMemo(() => {
    const contagem: Record<number, { valor: number; count: number }> = {};
    for (let i = 0; i < 7; i++) contagem[i] = { valor: 0, count: 0 };

    lancamentos.filter((l: any) => idsFiltro.has(l.pessoa_id)).forEach((l: any) => {
      const diaSem = new Date(l.data + 'T00:00:00').getDay();
      if (metricaSel === 'he' && l.tipo.includes('he')) {
        contagem[diaSem].valor += +(l.minutos||0)/60;
        contagem[diaSem].count++;
      } else if (metricaSel === 'abs') {
        let h = 0;
        if (l.tipo === 'falta-injustificada' || l.tipo === 'atestado') h = horasUteisDia;
        else if (l.tipo === 'atraso') h = +(l.minutos||0)/60;
        else if (l.tipo === 'saida-antecipada') h = +(l.minutos||0)/60;
        if (h > 0) { contagem[diaSem].valor += h; contagem[diaSem].count++; }
      }
    });
    return contagem;
  }, [lancamentos, idsFiltro, metricaSel, horasUteisDia]);

  // ── Visão por dia do calendário ───────────────────────────────────────────────
  const dadosPorDiaCalendario = useMemo(() => {
    const ini = `${anoSel}-${String(mesSel+1).padStart(2,'0')}-01`;
    const fim = `${anoSel}-${String(mesSel+1).padStart(2,'0')}-${String(new Date(anoSel,mesSel+1,0).getDate()).padStart(2,'0')}`;
    const lancs = lancamentos.filter((l: any) => l.data >= ini && l.data <= fim && idsFiltro.has(l.pessoa_id));

    const por: Record<string, number> = {};
    lancs.forEach((l: any) => {
      if (!por[l.data]) por[l.data] = 0;
      if (metricaSel === 'he' && l.tipo.includes('he')) por[l.data] += +(l.minutos||0)/60;
      else if (metricaSel === 'abs') {
        if (l.tipo === 'falta-injustificada' || l.tipo === 'atestado') por[l.data] += horasUteisDia;
        else if (l.tipo === 'atraso') por[l.data] += +(l.minutos||0)/60;
        else if (l.tipo === 'saida-antecipada') por[l.data] += +(l.minutos||0)/60;
      }
    });
    return por;
  }, [lancamentos, idsFiltro, metricaSel, horasUteisDia, mesSel, anoSel]);

  const maxSemana = Math.max(...Object.values(dadosPorDiaSemana).map(d => d.valor), 1);
  const maxCalendario = Math.max(...Object.values(dadosPorDiaCalendario), 1);

  const corCalor = (valor: number, max: number) => {
    const pct = valor / max;
    if (valor === 0) return 'bg-gray-100 text-gray-300';
    if (pct < 0.25) return metricaSel === 'he' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700';
    if (pct < 0.5)  return metricaSel === 'he' ? 'bg-blue-300 text-blue-800' : 'bg-red-300 text-red-800';
    if (pct < 0.75) return metricaSel === 'he' ? 'bg-blue-500 text-white'    : 'bg-red-500 text-white';
    return metricaSel === 'he' ? 'bg-blue-700 text-white' : 'bg-red-700 text-white';
  };

  const totalDias = new Date(anoSel, mesSel + 1, 0).getDate();
  const primeiroDia = new Date(anoSel, mesSel, 1).getDay();
  const pad = (n: number) => String(n).padStart(2, '0');

  const mudarMes = (delta: number) => {
    let novoMes = mesSel + delta;
    let novoAno = anoSel;
    if (novoMes > 11) { novoMes = 0; novoAno++; }
    if (novoMes < 0) { novoMes = 11; novoAno--; }
    setMesSel(novoMes);
    setAnoSel(novoAno);
  };

  return (
    <div className="pb-20 md:pb-0 space-y-4">
      {/* Controles */}
      <div className="bg-white rounded-xl shadow p-4 flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setMetricaSel('abs')}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition ${metricaSel==='abs'?'bg-red-600 text-white':'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            📉 Absenteísmo
          </button>
          <button onClick={() => setMetricaSel('he')}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition ${metricaSel==='he'?'bg-blue-600 text-white':'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            💰 HE
          </button>
          <div className="w-px bg-gray-200"/>
          <button onClick={() => setVisaoSel('semana')}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition ${visaoSel==='semana'?'bg-gray-700 text-white':'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            📆 Por dia da semana
          </button>
          <button onClick={() => setVisaoSel('calendario')}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition ${visaoSel==='calendario'?'bg-gray-700 text-white':'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            🗓 Por calendário
          </button>
        </div>
        <select value={setorFiltro} onChange={e => setSetorFiltro(e.target.value)}
          className="border-2 border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500">
          <option value="">Todos os setores</option>
          {['Inbound','Outbound','Projetos/Estoques/Custos'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Legenda de intensidade */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">Menos</span>
        {[0, 0.2, 0.4, 0.7, 1].map((v, i) => (
          <div key={i} className={`w-6 h-6 rounded ${corCalor(v, 1).split(' ')[0]}`}/>
        ))}
        <span className="text-xs text-gray-500">Mais</span>
      </div>

      {/* ── Visão por dia da semana ── */}
      {visaoSel === 'semana' && (
        <div className="bg-white rounded-xl shadow p-5">
          <h2 className="text-lg font-bold text-gray-700 mb-1">
            {metricaSel === 'he' ? '💰 HE por Dia da Semana' : '📉 Absenteísmo por Dia da Semana'}
          </h2>
          <p className="text-xs text-gray-400 mb-6">Acumulado de todo o histórico disponível</p>
          <div className="space-y-3">
            {diasSemana.map((dia, i) => {
              const dado = dadosPorDiaSemana[i];
              const pct = dado.valor > 0 ? (dado.valor / maxSemana) * 100 : 0;
              const cor = corCalor(dado.valor, maxSemana);
              const corBarra = metricaSel === 'he' ? 'bg-blue-500' : 'bg-red-500';
              return (
                <div key={dia} className="flex items-center gap-3">
                  <span className="text-sm font-bold text-gray-600 w-8">{dia}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-8 overflow-hidden">
                    <div className={`h-8 rounded-full flex items-center px-3 transition-all duration-700 ${dado.valor > 0 ? corBarra : ''}`}
                      style={{ width: `${Math.max(pct, dado.valor > 0 ? 5 : 0)}%` }}>
                      {dado.valor > 0 && (
                        <span className="text-white text-xs font-bold whitespace-nowrap">
                          {dado.valor.toFixed(1)}h
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 w-20 text-right">
                    {dado.count > 0 ? `${dado.count} ocorr.` : 'sem dados'}
                  </span>
                </div>
              );
            })}
          </div>
          {/* Insight automático */}
          {(() => {
            const top = Object.entries(dadosPorDiaSemana)
              .filter(([,d]) => d.valor > 0)
              .sort(([,a],[,b]) => b.valor - a.valor)[0];
            if (!top) return null;
            return (
              <div className={`mt-4 p-3 rounded-lg border-l-4 text-sm font-semibold
                ${metricaSel==='he'?'bg-blue-50 border-blue-500 text-blue-800':'bg-red-50 border-red-500 text-red-800'}`}>
                💡 {diasSemana[+top[0]]} concentra mais {metricaSel === 'he' ? 'horas extras' : 'absenteísmo'}: {top[1].valor.toFixed(1)}h no total
              </div>
            );
          })()}
        </div>
      )}

      {/* ── Visão por calendário ── */}
      {visaoSel === 'calendario' && (
        <div className="bg-white rounded-xl shadow p-5">
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => mudarMes(-1)}
              className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 font-bold text-gray-600 flex items-center justify-center">‹</button>
            <h2 className="text-base font-bold text-gray-700 min-w-[160px] text-center">
              {metricaSel === 'he' ? '💰 HE — ' : '📉 Abs — '}{nomeMes[mesSel]} {anoSel}
            </h2>
            <button onClick={() => mudarMes(1)}
              className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 font-bold text-gray-600 flex items-center justify-center">›</button>
          </div>

          <div className="grid grid-cols-7 mb-1">
            {diasSemana.map(d => (
              <div key={d} className="text-center text-xs font-bold text-gray-400 py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: primeiroDia }).map((_, i) => <div key={`v${i}`}/>)}
            {Array.from({ length: totalDias }).map((_, i) => {
              const dia = i + 1;
              const data = `${anoSel}-${pad(mesSel+1)}-${pad(dia)}`;
              const valor = dadosPorDiaCalendario[data] || 0;
              const cor = corCalor(valor, maxCalendario);
              const diaSem = new Date(data+'T00:00:00').getDay();
              const fimSemana = diaSem === 0 || diaSem === 6;
              return (
                <div key={dia}
                  className={`rounded-lg p-1.5 min-h-[52px] flex flex-col items-center justify-center
                    ${fimSemana ? 'bg-gray-50 opacity-50' : cor}`}
                  title={valor > 0 ? `${dia}/${mesSel+1}: ${valor.toFixed(1)}h` : ''}>
                  <span className={`text-xs font-bold ${fimSemana?'text-gray-300':valor>0?'':'text-gray-400'}`}>{dia}</span>
                  {valor > 0 && !fimSemana && (
                    <span className="text-xs font-bold mt-0.5">{valor.toFixed(1)}h</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Insight do mês */}
          {(() => {
            const top = Object.entries(dadosPorDiaCalendario).sort(([,a],[,b])=>b-a)[0];
            if (!top || top[1] === 0) return null;
            const dt = new Date(top[0]+'T00:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'});
            return (
              <div className={`mt-4 p-3 rounded-lg border-l-4 text-sm font-semibold
                ${metricaSel==='he'?'bg-blue-50 border-blue-500 text-blue-800':'bg-red-50 border-red-500 text-red-800'}`}>
                💡 Pico em {dt}: {top[1].toFixed(1)}h de {metricaSel === 'he' ? 'horas extras' : 'absenteísmo'}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
