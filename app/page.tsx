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
          <div className="text-6xl mb-3">🏭</div>
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

  const getTipoLabel = (tipo: string) => ({
    'he-60': '⏰ HE 60%', 'he-100': '⏰ HE 100%', 'atraso': '🔴 Atraso',
    'atestado-horas': '📋 Atestado Hora', 'falta-injustificada': '❌ Falta Injustificada',
    'atestado': '📄 Atestado', 'saida-antecipada': '🚪 Saída Antecipada',
    'advertencia': '⚠️ Advertência', 'férias': '🏖️ Férias'
  }[tipo] || tipo);

  const getTipoCor = (tipo: string) => {
    if (tipo.includes('he')) return 'bg-blue-100 text-blue-800';
    if (tipo === 'atraso') return 'bg-orange-100 text-orange-800';
    if (tipo === 'falta-injustificada' || tipo === 'advertencia') return 'bg-red-100 text-red-800';
    if (tipo === 'atestado') return 'bg-yellow-100 text-yellow-800';
    if (tipo === 'atestado-horas' || tipo === 'saida-antecipada') return 'bg-purple-100 text-purple-800';
    if (tipo === 'férias') return 'bg-green-100 text-green-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getNomePessoa = (id: number) => pessoas.find(p => p.id === id)?.nome || 'Desconhecido';

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

    // Pico de HE com data
    if (dadosGraficoHE.length > 0) {
      const pico = dadosGraficoHE.reduce((a,b)=>b.valor>a.valor?b:a);
      if (pico.valor > 0) lista.push({ msg: `📈 Pico de HE em ${pico.data}: R$ ${pico.valor.toFixed(2)}`, cor: 'neutro' });
    }

    // HE acima da meta
    if (totalHE > metaHE * 0.8)
      lista.push({ msg: `⚠️ Custo HE (R$ ${totalHE.toFixed(0)}) está em ${((totalHE/metaHE)*100).toFixed(0)}% da meta`, cor: 'vermelho' });

    // Absenteísmo acima da meta
    if (+abs.taxa > metaAbsenteismo)
      lista.push({ msg: `⚠️ Absenteísmo ${abs.taxa}% está acima da meta de ${metaAbsenteismo}%`, cor: 'vermelho' });
    else if (+abs.taxa < metaAbsenteismo * 0.5)
      lista.push({ msg: `✅ Absenteísmo ${abs.taxa}% muito abaixo da meta — ótimo desempenho!`, cor: 'verde' });

    // HE > 3h num único dia por colaborador (ilegal)
    const hePorDiaPessoa: Record<string, number> = {};
    lancamentosFiltrados.filter(l=>l.tipo.includes('he')).forEach(l => {
      const chave = `${l.pessoa_id}_${l.data}`;
      hePorDiaPessoa[chave] = (hePorDiaPessoa[chave]||0) + +(l.minutos||0);
    });
    const excedeuLegal = Object.entries(hePorDiaPessoa).find(([,mins])=>mins>180);
    if (excedeuLegal) {
      const [pid, dt] = excedeuLegal[0].split('_');
      const nome = getNomePessoa(+pid);
      lista.push({ msg: `🚨 ${nome} fez mais de 3h extra em ${new Date(dt+'T00:00:00').toLocaleDateString('pt-BR')} — vedado por lei!`, cor: 'vermelho' });
    }

    // HE em domingo ou feriado
    const datasHE = [...new Set(lancamentosFiltrados.filter(l=>l.tipo.includes('he')).map(l=>l.data))];
    const feriadosSet = new Set(feriados.map(f=>f.data));
    const datasHeEmFeriado = datasHE.filter(d => {
      const diaSem = new Date(d+'T00:00:00').getDay();
      return diaSem === 0 || feriadosSet.has(d);
    });
    if (datasHeEmFeriado.length > 0) {
      const totalMinsNessesDias = lancamentosFiltrados
        .filter(l => l.tipo.includes('he') && datasHeEmFeriado.includes(l.data))
        .reduce((acc, l) => acc + +(l.minutos||0), 0);
      const horas = (totalMinsNessesDias/60).toFixed(1);
      const datas = datasHeEmFeriado.map(d => new Date(d+'T00:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})).join(', ');
      lista.push({ msg: `🔴 ${horas}h de HE realizadas em domingo/feriado (${datas}) — são HE 100%!`, cor: 'vermelho' });
    }

    // Por setor: absenteísmo
    const absPorSetor: Record<string, number> = {};
    let totalAbsH = 0;
    lancamentosFiltrados.forEach(l => {
      const p = pessoas.find(x=>x.id===l.pessoa_id);
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

    // Conflito de férias no mesmo time
    const feriasMes = lancamentos.filter(l=>l.tipo==='férias' && l.data>=dataInicio && l.data<=dataFim);
    const feriasPorSetor: Record<string,number> = {};
    feriasMes.forEach(l => {
      const p = pessoas.find(x=>x.id===l.pessoa_id);
      const setor = p?.setor||'';
      feriasPorSetor[setor] = (feriasPorSetor[setor]||0)+1;
    });
    Object.entries(feriasPorSetor).forEach(([setor, qtd]) => {
      if (qtd >= 2)
        lista.push({ msg: `⚠️ ${qtd} colaboradores do time ${setor} em férias no mesmo período — risco operacional!`, cor: 'vermelho' });
    });

    // Sem HE
    if (totalHE === 0)
      lista.push({ msg: `✅ Sem horas extras registradas no período selecionado`, cor: 'verde' });

    return lista;
  }, [dadosGraficoHE, totalHE, abs, metaHE, metaAbsenteismo, lancamentosFiltrados, pessoas, feriados, horasUteisDia, dataInicio, dataFim]);

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

      // Calcular proporcional
      const anoMes = dIni.slice(0, 7);
      const [ano, mes] = anoMes.split('-').map(Number);
      const totalDias = new Date(ano, mes, 0).getDate();
      const inicio = new Date(dIni + 'T00:00:00');
      const fim = new Date(dFim + 'T00:00:00');
      let diasFerias = 0;
      for (let d = new Date(inicio); d <= fim; d.setDate(d.getDate() + 1)) diasFerias++;
      const proporcao = Math.max(0, (totalDias - diasFerias) / totalDias);
      const valorProp = +(VALOR_BONUS * proporcao).toFixed(2);

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
        <div className="text-5xl mb-4">🏭</div>
        <p className="text-2xl font-bold text-blue-600 mb-2">Carregando...</p>
        <p className="text-gray-500">Conectando ao Supabase</p>
      </div>
    </div>
  );


  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">

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
            <span className="text-4xl">🏭</span>
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
            <button onClick={onLogout}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold text-sm">
              🔒 Sair
            </button>
          </div>
        </div>

        {/* Navegação — desktop topo, mobile bottom */}
        <div className="hidden md:flex gap-1 mb-6 border-b-2 border-gray-200 overflow-x-auto">
          {[
            ['resumos','📊 Resumos'],['dashboard','📈 Dashboard'],['lancamentos','📝 Lançamentos'],
            ['ferias','🏖️ Férias'],['bonus','🎁 Bônus'],['auditoria','🔍 Auditoria'],['configuracao','⚙️ Config']
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
            ['resumos','📊'],['lancamentos','📝'],['ferias','🏖️'],['bonus','🎁'],['configuracao','⚙️']
          ].map(([id, icon]) => (
            <button key={id} onClick={() => setAbaAtiva(id)}
              className={`flex flex-col items-center text-xs px-2 py-1 rounded-lg
                ${abaAtiva === id ? 'text-blue-600 font-bold' : 'text-gray-500'}`}>
              <span className="text-xl">{icon}</span>
              <span>{id === 'lancamentos' ? 'Lanç.' : id.charAt(0).toUpperCase() + id.slice(1,5)}</span>
            </button>
          ))}
        </div>

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
