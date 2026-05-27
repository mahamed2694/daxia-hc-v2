// @ts-nocheck
'use client';

import { useState, useMemo, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://blsdahvliocoqqdzkzym.supabase.co';
const SUPABASE_KEY = 'sb_publishable_XNUPzuPEgFil7C736xv_5Q_WzNDRuzp';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export default function Home() {
  const cargosIniciais = {
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
    'OP EMPILHADEIRA PL': { he60: 26.18, he100: 32.73 }
  };

  const setores = ['Inbound', 'Outbound', 'Projetos/Estoques/Custos'];

  const [isHydrated, setIsHydrated] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState('resumos');
  const [horasUteisDia, setHorasUteisDia] = useState(10);
  const [metaHE, setMetaHE] = useState(1000);
  const [metaAbsenteismo, setMetaAbsenteismo] = useState(5);
  const [dataInicio, setDataInicio] = useState(new Date().toISOString().slice(0, 7) + '-01');
  const [dataFim, setDataFim] = useState(new Date().toISOString().slice(0, 10));
  const [setorFiltro, setSetorFiltro] = useState('');
  
  const [tabelaHE, setTabelaHE] = useState(cargosIniciais);
  const [pessoas, setPessoas] = useState([]);
  const [lançamentos, setLançamentos] = useState([]);

  const [formPessoa, setFormPessoa] = useState({ nome: '', cargo: 'AJUDANTE GERAL', setor: 'Inbound' });
  const [formCargo, setFormCargo] = useState({ nome: '', he60: '', he100: '' });
  const [formLançamento, setFormLançamento] = useState({ 
    pessoaId: 1, 
    tipo: 'he-60', 
    data: '', 
    horas: 0, 
    minutos: 0, 
    descricao: '' 
  });

  const cargosArray = Object.keys(tabelaHE);

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: pessoasData, error: pessoasError } = await supabase.from('pessoas').select('*');
        if (pessoasError) throw pessoasError;
        if (pessoasData) setPessoas(pessoasData);

        const { data: lancamentosData, error: lancError } = await supabase.from('lancamentos').select('*');
        if (lancError) throw lancError;
        if (lancamentosData) setLançamentos(lancamentosData);

        const { data: heData, error: heError } = await supabase.from('tabela_he').select('*');
        if (heError) throw heError;
        if (heData && heData.length > 0) {
          const heObj = {};
          heData.forEach(item => {
            heObj[item.cargo] = { he60: parseFloat(item.he60), he100: parseFloat(item.he100) };
          });
          setTabelaHE({ ...cargosIniciais, ...heObj });
        }
      } catch (error) {
        console.error('Erro ao carregar:', error);
      }
      setIsHydrated(true);
    };

    loadData();
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    const pessoasSubscription = supabase
      .channel('pessoas-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pessoas' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setPessoas(p => [...p, payload.new]);
        } else if (payload.eventType === 'DELETE') {
          setPessoas(p => p.filter(x => x.id !== payload.old.id));
        } else if (payload.eventType === 'UPDATE') {
          setPessoas(p => p.map(x => x.id === payload.new.id ? payload.new : x));
        }
      })
      .subscribe();

    const lancamentosSubscription = supabase
      .channel('lancamentos-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lancamentos' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setLançamentos(p => [...p, payload.new]);
        } else if (payload.eventType === 'DELETE') {
          setLançamentos(p => p.filter(x => x.id !== payload.old.id));
        } else if (payload.eventType === 'UPDATE') {
          setLançamentos(p => p.map(x => x.id === payload.new.id ? payload.new : x));
        }
      })
      .subscribe();

    return () => {
      pessoasSubscription.unsubscribe();
      lancamentosSubscription.unsubscribe();
    };
  }, [isHydrated]);

  const lançamentosFiltrados = useMemo(() => {
    return lançamentos.filter(l => {
      const dentroData = l.data >= dataInicio && l.data <= dataFim;
      if (!dentroData) return false;
      if (setorFiltro === '') return true;
      const pessoa = pessoas.find(p => p.id === l.pessoa_id);
      return pessoa?.setor === setorFiltro;
    });
  }, [lançamentos, dataInicio, dataFim, setorFiltro, pessoas]);

  const contarDiasUteis = (dataInStr, dataFimStr) => {
    const inicio = new Date(dataInStr);
    const fim = new Date(dataFimStr);
    let diasUteis = 0;
    for (let d = new Date(inicio); d <= fim; d.setDate(d.getDate() + 1)) {
      const diaSemana = d.getDay();
      if (diaSemana >= 1 && diaSemana <= 5) diasUteis++;
    }
    return diasUteis;
  };

  const dadosGraficoHE = useMemo(() => {
    const dados = {};
    lançamentosFiltrados.filter(l => l.tipo.includes('he')).forEach(l => {
      if (!dados[l.data]) dados[l.data] = 0;
      const pessoa = pessoas.find(p => p.id === l.pessoa_id);
      const tabela = tabelaHE[pessoa?.cargo];
      const valor = l.tipo === 'he-60' ? (tabela?.he60 || 0) * l.horas : (tabela?.he100 || 0) * l.horas;
      dados[l.data] += valor;
    });
    return Object.entries(dados)
      .sort(([a], [b]) => a.localeCompare(b))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([data, valor]) => ({
        data: new Date(data + 'T00:00:00').toLocaleDateString('pt-BR'),
        valor: parseFloat(valor.toFixed(2))
      }));
  }, [lançamentosFiltrados, pessoas, tabelaHE]);

  const dadosGraficoABS = useMemo(() => {
    const dados = {};
    lançamentosFiltrados.forEach(l => {
      if (!dados[l.data]) dados[l.data] = 0;
      if (l.tipo === 'falta-total' || l.tipo === 'atestado') {
        dados[l.data] += horasUteisDia;
      } else if (l.tipo === 'atestado-horas') {
        dados[l.data] += l.horas || horasUteisDia;
      } else if (l.tipo === 'atraso' && l.minutos > 10) {
        dados[l.data] += l.minutos / 60;
      } else if (l.tipo === 'saida-antecipada') {
        dados[l.data] += l.horas || horasUteisDia;
      }
    });
    return Object.entries(dados)
      .sort(([a], [b]) => a.localeCompare(b))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([data, horas]) => ({
        data: new Date(data + 'T00:00:00').toLocaleDateString('pt-BR'),
        valor: parseFloat(horas.toFixed(2))
      }));
  }, [lançamentosFiltrados, horasUteisDia]);

  const calcularAbsenteísmo = () => {
    const diasUteis = contarDiasUteis(dataInicio, dataFim);
    let pessoasNoFiltro = pessoas;
    if (setorFiltro !== '') pessoasNoFiltro = pessoas.filter(p => p.setor === setorFiltro);
    const horasUteisDisponiveis = horasUteisDia * pessoasNoFiltro.length * diasUteis;
    let horasAbsenteísmo = 0;
    lançamentosFiltrados.forEach(l => {
      if (l.tipo === 'falta-total' || l.tipo === 'atestado') {
        horasAbsenteísmo += horasUteisDia;
      } else if (l.tipo === 'atestado-horas') {
        horasAbsenteísmo += l.horas || horasUteisDia;
      } else if (l.tipo === 'atraso' && l.minutos > 10) {
        horasAbsenteísmo += l.minutos / 60;
      } else if (l.tipo === 'saida-antecipada') {
        horasAbsenteísmo += l.horas || horasUteisDia;
      }
    });
    const taxaAbs = horasUteisDisponiveis > 0 ? (horasAbsenteísmo / horasUteisDisponiveis * 100).toFixed(2) : 0;
    return { horasAbsenteísmo: horasAbsenteísmo.toFixed(2), taxaAbs, horasUteisDisponiveis };
  };

  const calcularHETotal = () => {
    return lançamentosFiltrados.filter(l => l.tipo.includes('he')).reduce((acc, l) => {
      const pessoa = pessoas.find(p => p.id === l.pessoa_id);
      const tabela = tabelaHE[pessoa?.cargo];
      const valor = l.tipo === 'he-60' ? (tabela?.he60 || 0) * l.horas : (tabela?.he100 || 0) * l.horas;
      return acc + valor;
    }, 0);
  };

  const topHEPessoas = useMemo(() => {
    const dados = {};
    lançamentosFiltrados.filter(l => l.tipo.includes('he')).forEach(l => {
      const pessoa = pessoas.find(p => p.id === l.pessoa_id);
      if (!dados[l.pessoa_id]) dados[l.pessoa_id] = { nome: pessoa?.nome, valor: 0 };
      const tabela = tabelaHE[pessoa?.cargo];
      const valor = l.tipo === 'he-60' ? (tabela?.he60 || 0) * l.horas : (tabela?.he100 || 0) * l.horas;
      dados[l.pessoa_id].valor += valor;
    });
    return Object.values(dados).sort((a, b) => b.valor - a.valor).slice(0, 10);
  }, [lançamentosFiltrados, pessoas, tabelaHE]);

  const bottomHEPessoas = useMemo(() => {
    const dados = {};
    pessoas.forEach(p => { dados[p.id] = { nome: p.nome, valor: 0 }; });
    lançamentosFiltrados.filter(l => l.tipo.includes('he')).forEach(l => {
      const pessoa = pessoas.find(p => p.id === l.pessoa_id);
      const tabela = tabelaHE[pessoa?.cargo];
      const valor = l.tipo === 'he-60' ? (tabela?.he60 || 0) * l.horas : (tabela?.he100 || 0) * l.horas;
      dados[l.pessoa_id].valor += valor;
    });
    return Object.values(dados).sort((a, b) => a.valor - b.valor).slice(0, 10);
  }, [lançamentosFiltrados, pessoas, tabelaHE]);

  const topAbsenteismoPessoas = useMemo(() => {
    const dados = {};
    pessoas.forEach(p => { dados[p.id] = { nome: p.nome, valor: 0 }; });
    lançamentosFiltrados.forEach(l => {
      if (l.tipo === 'falta-total' || l.tipo === 'atestado') {
        dados[l.pessoa_id].valor += horasUteisDia;
      } else if (l.tipo === 'atestado-horas') {
        dados[l.pessoa_id].valor += l.horas || horasUteisDia;
      } else if (l.tipo === 'atraso' && l.minutos > 10) {
        dados[l.pessoa_id].valor += l.minutos / 60;
      } else if (l.tipo === 'saida-antecipada') {
        dados[l.pessoa_id].valor += l.horas || horasUteisDia;
      }
    });
    return Object.values(dados).sort((a, b) => b.valor - a.valor).slice(0, 10);
  }, [lançamentosFiltrados, horasUteisDia, pessoas]);

  const bottomAbsenteismoPessoas = useMemo(() => {
    const dados = {};
    pessoas.forEach(p => { dados[p.id] = { nome: p.nome, valor: 0 }; });
    lançamentosFiltrados.forEach(l => {
      if (l.tipo === 'falta-total' || l.tipo === 'atestado') {
        dados[l.pessoa_id].valor += horasUteisDia;
      } else if (l.tipo === 'atestado-horas') {
        dados[l.pessoa_id].valor += l.horas || horasUteisDia;
      } else if (l.tipo === 'atraso' && l.minutos > 10) {
        dados[l.pessoa_id].valor += l.minutos / 60;
      } else if (l.tipo === 'saida-antecipada') {
        dados[l.pessoa_id].valor += l.horas || horasUteisDia;
      }
    });
    return Object.values(dados).sort((a, b) => a.valor - b.valor).slice(0, 10);
  }, [lançamentosFiltrados, horasUteisDia, pessoas]);

  const gerarInsights = () => {
    const insights = [];
    const totalHE = calcularHETotal();
    const abs = calcularAbsenteísmo();
    const finalMes = parseInt(dataFim.split('-')[2]) >= 24;
    
    if (totalHE > metaHE * 0.8) insights.push('⚠️ HE acima do esperado');
    if (abs.taxaAbs > metaAbsenteismo) insights.push('⚠️ Absenteísmo acima da meta');
    if (finalMes) insights.push('📈 Pico de HE em fechamento de mês');
    if (totalHE === 0) insights.push('✅ Sem horas extras registradas');
    if (abs.taxaAbs < metaAbsenteismo * 0.5) insights.push('✅ Absenteísmo controlado');
    
    return insights.length > 0 ? insights : ['📊 Análise normal'];
  };

  const abs = calcularAbsenteísmo();
  const totalHE = calcularHETotal();
  const insights = gerarInsights();

  const handleAdicionarPessoa = async (e) => {
    e.preventDefault();
    if (!formPessoa.nome || formPessoa.nome.trim() === '') {
      alert('Preencha o nome!');
      return;
    }
    try {
      const { error } = await supabase.from('pessoas').insert([formPessoa]);
      if (error) throw error;
      setFormPessoa({ nome: '', cargo: 'AJUDANTE GERAL', setor: 'Inbound' });
    } catch (error) {
      alert('Erro: ' + error.message);
    }
  };

  const handleAdicionarCargo = async (e) => {
    e.preventDefault();
    if (!formCargo.nome || !formCargo.he60 || !formCargo.he100) {
      alert('Preencha todos os campos!');
      return;
    }
    const nomeCargo = formCargo.nome.toUpperCase();
    if (tabelaHE[nomeCargo]) {
      alert('Este cargo já existe!');
      return;
    }
    try {
      const { error } = await supabase.from('tabela_he').insert([{
        cargo: nomeCargo,
        he60: parseFloat(formCargo.he60),
        he100: parseFloat(formCargo.he100)
      }]);
      if (error) throw error;
      setTabelaHE({ ...tabelaHE, [nomeCargo]: { he60: parseFloat(formCargo.he60), he100: parseFloat(formCargo.he100) } });
      setFormCargo({ nome: '', he60: '', he100: '' });
      alert('✅ Cargo adicionado!');
    } catch (error) {
      alert('Erro: ' + error.message);
    }
  };

  const handleDeletarCargo = async (nomeCargo) => {
    if (pessoas.some(p => p.cargo === nomeCargo)) {
      alert('❌ Não pode deletar! Pessoas cadastradas com este cargo.');
      return;
    }
    if (confirm(`Deletar "${nomeCargo}"?`)) {
      try {
        const { error } = await supabase.from('tabela_he').delete().eq('cargo', nomeCargo);
        if (error) throw error;
        const novaTabela = { ...tabelaHE };
        delete novaTabela[nomeCargo];
        setTabelaHE(novaTabela);
        alert('✅ Deletado!');
      } catch (error) {
        alert('Erro: ' + error.message);
      }
    }
  };

  const handleAdicionarLançamento = async (e) => {
    e.preventDefault();
    if (!formLançamento.data) {
      alert('Selecione a data!');
      return;
    }
    try {
      let horas = formLançamento.horas;
      if (formLançamento.tipo === 'falta-total' || formLançamento.tipo === 'atestado') {
        horas = horasUteisDia;
      }
      const { error } = await supabase.from('lancamentos').insert([{
        pessoa_id: parseInt(formLançamento.pessoaId),
        tipo: formLançamento.tipo,
        data: formLançamento.data,
        horas: ['he-60', 'he-100', 'atestado-horas', 'saida-antecipada'].includes(formLançamento.tipo) ? parseFloat(formLançamento.horas) || 0 : horas,
        minutos: formLançamento.tipo === 'atraso' ? parseInt(formLançamento.minutos) || 0 : 0,
        descricao: formLançamento.descricao
      }]);
      if (error) throw error;
      setFormLançamento({ pessoaId: pessoas[0]?.id || 1, tipo: 'he-60', data: '', horas: 0, minutos: 0, descricao: '' });
    } catch (error) {
      alert('Erro: ' + error.message);
    }
  };

  const handleDeletarPessoa = async (id) => {
    if (confirm('Deletar pessoa?')) {
      try {
        const { error } = await supabase.from('pessoas').delete().eq('id', id);
        if (error) throw error;
      } catch (error) {
        alert('Erro: ' + error.message);
      }
    }
  };

  const handleDeletarLançamento = async (id) => {
    try {
      const { error } = await supabase.from('lancamentos').delete().eq('id', id);
      if (error) throw error;
    } catch (error) {
      alert('Erro: ' + error.message);
    }
  };

  const handleExportarCSV = () => {
    const dados = lançamentos.map(l => {
      const pessoa = pessoas.find(p => p.id === l.pessoa_id);
      const tabela = tabelaHE[pessoa?.cargo];
      const valor = l.tipo === 'he-60' ? (tabela?.he60 || 0) * l.horas : l.tipo === 'he-100' ? (tabela?.he100 || 0) * l.horas : 0;
      return { Pessoa: pessoa?.nome, Setor: pessoa?.setor, Cargo: pessoa?.cargo, Tipo: l.tipo, Data: new Date(l.data + 'T00:00:00').toLocaleDateString('pt-BR'), Horas: l.horas || (l.minutos + ' min'), 'Valor (R$)': valor.toFixed(2) };
    });
    const headers = ['Pessoa', 'Setor', 'Cargo', 'Tipo', 'Data', 'Horas', 'Valor (R$)'];
    const csv = [headers.join(','), ...dados.map(row => headers.map(h => { const v = row[h]; return typeof v === 'string' && v.includes(',') ? `"${v}"` : v; }).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'Daxia_Lancamentos.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getTipoLabel = (tipo) => {
    const labels = { 'he-60': '⏰ HE 60%', 'he-100': '⏰ HE 100%', 'atraso': '🔴 Atraso', 'atestado-horas': '📋 Atestado de Horas', 'falta-total': '❌ Falta Total', 'atestado': '📄 Atestado', 'saida-antecipada': '🚪 Saída Antecipada' };
    return labels[tipo] || tipo;
  };

  const getTipoCor = (tipo) => {
    if (tipo.includes('he')) return 'bg-blue-100 text-blue-800';
    if (tipo === 'atraso') return 'bg-orange-100 text-orange-800';
    if (tipo === 'falta-total' || tipo === 'atestado-horas') return 'bg-red-100 text-red-800';
    if (tipo === 'atestado' || tipo === 'saida-antecipada') return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getNomePessoa = (id) => {
    const pessoa = pessoas.find(p => p.id === id);
    return pessoa?.nome || 'Desconhecido';
  };

  const maxValorHE = Math.max(...dadosGraficoHE.map(d => d.valor), 1);
  const maxValorABS = Math.max(...dadosGraficoABS.map(d => d.valor), 1);

  const Gauge = ({ value, max, label }) => {
    const numValue = parseFloat(value) || 0;
    const numMax = parseFloat(max) || 1;
    const percentage = Math.min((numValue / numMax) * 100, 100);
    let barColor = '#10B981';
    let textColor = 'text-green-700';
    let bgColor = 'bg-green-50';
    if (percentage >= 80) {
      barColor = '#EF4444';
      textColor = 'text-red-700';
      bgColor = 'bg-red-50';
    } else if (percentage >= 50) {
      barColor = '#F59E0B';
      textColor = 'text-yellow-700';
      bgColor = 'bg-yellow-50';
    }
    return (
      <div className={`flex flex-col items-center gap-4 p-6 rounded-lg ${bgColor}`}>
        <svg width="120" height="120" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="50" fill="none" stroke="#E5E7EB" strokeWidth="8" />
          <circle cx="60" cy="60" r="50" fill="none" stroke={barColor} strokeWidth="8" strokeDasharray={`${(percentage / 100) * 314.159} 314.159`} strokeLinecap="round" style={{ transform: 'rotate(-90deg)', transformOrigin: '60px 60px', transition: 'stroke-dasharray 0.5s ease' }} />
          <text x="60" y="65" textAnchor="middle" fontSize="28" fontWeight="bold" fill="#111827">{percentage.toFixed(0)}%</text>
        </svg>
        <div className="text-center">
          <p className={`text-lg font-bold ${textColor}`}>{label}</p>
          <p className="text-sm text-gray-600 mt-1">{numValue.toFixed(0)} / {numMax.toFixed(0)}</p>
        </div>
      </div>
    );
  };

  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl font-bold text-blue-600 mb-4">⏳ Carregando...</p>
          <p className="text-gray-600">Conectando ao Supabase...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-5xl font-bold text-blue-600 mb-2">📊 Daxia People Analytics</h1>
            <p className="text-gray-600 text-lg">Controle de Absenteísmo e Horas Extras | Dados Sincronizados ✅</p>
          </div>
          <button onClick={handleExportarCSV} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2">📊 Exportar CSV</button>
        </div>

        <div className="flex gap-2 mb-8 border-b-2 border-gray-300 overflow-x-auto">
          <button onClick={() => setAbaAtiva('resumos')} className={`px-6 py-3 font-bold transition whitespace-nowrap ${abaAtiva === 'resumos' ? 'text-blue-600 border-b-4 border-blue-600' : 'text-gray-600 hover:text-gray-800'}`}>📊 Resumos</button>
          <button onClick={() => setAbaAtiva('dashboard')} className={`px-6 py-3 font-bold transition whitespace-nowrap ${abaAtiva === 'dashboard' ? 'text-blue-600 border-b-4 border-blue-600' : 'text-gray-600 hover:text-gray-800'}`}>📈 Dashboard</button>
          <button onClick={() => setAbaAtiva('lançamentos')} className={`px-6 py-3 font-bold transition whitespace-nowrap ${abaAtiva === 'lançamentos' ? 'text-blue-600 border-b-4 border-blue-600' : 'text-gray-600 hover:text-gray-800'}`}>📝 Lançamentos</button>
          <button onClick={() => setAbaAtiva('configuracao')} className={`px-6 py-3 font-bold transition whitespace-nowrap ${abaAtiva === 'configuracao' ? 'text-blue-600 border-b-4 border-blue-600' : 'text-gray-600 hover:text-gray-800'}`}>⚙️ Configuração</button>
        </div>

        {abaAtiva === 'resumos' && (
          <div>
            <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
              <h2 className="text-xl font-bold text-gray-800 mb-4">🔍 Filtros</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">📅 Data Início</label>
                  <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">📅 Data Fim</label>
                  <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">🏢 Setor</label>
                  <select value={setorFiltro} onChange={(e) => setSetorFiltro(e.target.value)} className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500">
                    <option value="">Todos os setores</option>
                    {setores.map(setor => (<option key={setor} value={setor}>{setor}</option>))}
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-red-500">
                <p className="text-gray-600 text-sm font-semibold">📉 Taxa Absenteísmo</p>
                <p className="text-4xl font-bold text-red-600 mt-3">{abs.taxaAbs}%</p>
                <p className="text-red-500 text-xs mt-2">{abs.horasAbsenteísmo}h / {abs.horasUteisDisponiveis}h</p>
              </div>
              <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-500">
                <p className="text-gray-600 text-sm font-semibold">💰 Total HE</p>
                <p className="text-4xl font-bold text-blue-600 mt-3">R$ {totalHE.toFixed(2)}</p>
                <p className="text-blue-500 text-xs mt-2">{lançamentosFiltrados.filter(l => l.tipo.includes('he')).length} registros</p>
              </div>
              <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-green-500">
                <p className="text-gray-600 text-sm font-semibold">👥 Pessoas</p>
                <p className="text-4xl font-bold text-green-600 mt-3">{setorFiltro ? pessoas.filter(p => p.setor === setorFiltro).length : pessoas.length}</p>
                <p className="text-green-500 text-xs mt-2">No período</p>
              </div>
              <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-purple-500">
                <p className="text-gray-600 text-sm font-semibold">📋 Lançamentos</p>
                <p className="text-4xl font-bold text-purple-600 mt-3">{lançamentosFiltrados.length}</p>
                <p className="text-purple-500 text-xs mt-2">Neste período</p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
              <h2 className="text-xl font-bold text-gray-800 mb-4">💡 Insights Automáticos</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {insights.map((insight, idx) => (<div key={idx} className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-4 border-l-4 border-yellow-500"><p className="text-gray-800 font-semibold">{insight}</p></div>))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">💰 Top 10 HE por Data</h2>
                {dadosGraficoHE.length > 0 ? (<div className="space-y-2 max-h-80 overflow-y-auto">{dadosGraficoHE.map((item, idx) => (<div key={idx} className="flex items-center gap-2"><span className="text-xs font-semibold text-gray-700 w-16">{item.data}</span><div className="flex-1 bg-gray-200 rounded-full h-6 overflow-hidden"><div className="bg-blue-500 h-full flex items-center justify-end pr-2" style={{ width: `${(item.valor / maxValorHE) * 100}%` }}><span className="text-xs text-white font-bold">R$ {item.valor.toFixed(2)}</span></div></div></div>))}</div>) : (<p className="text-gray-500 text-center py-8">Sem dados</p>)}
              </div>
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">📉 Top 10 Absenteísmo por Data</h2>
                {dadosGraficoABS.length > 0 ? (<div className="space-y-2 max-h-80 overflow-y-auto">{dadosGraficoABS.map((item, idx) => (<div key={idx} className="flex items-center gap-2"><span className="text-xs font-semibold text-gray-700 w-16">{item.data}</span><div className="flex-1 bg-gray-200 rounded-full h-6 overflow-hidden"><div className="bg-red-500 h-full flex items-center justify-end pr-2" style={{ width: `${(item.valor / maxValorABS) * 100}%` }}><span className="text-xs text-white font-bold">{item.valor.toFixed(2)}h</span></div></div></div>))}</div>) : (<p className="text-gray-500 text-center py-8">Sem dados</p>)}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">🏆 Top 10 - Maior HE</h2>
                <div className="space-y-2">{topHEPessoas.length > 0 ? topHEPessoas.map((p, idx) => (<div key={idx} className="flex justify-between items-center p-2 bg-blue-50 rounded"><span className="font-semibold text-gray-800">{idx + 1}. {p.nome}</span><span className="text-blue-600 font-bold">R$ {p.valor.toFixed(2)}</span></div>)) : (<p className="text-gray-500 text-center py-4">Sem dados</p>)}</div>
              </div>
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">🏆 Top 10 - Maior Absenteísmo</h2>
                <div className="space-y-2">{topAbsenteismoPessoas.length > 0 ? topAbsenteismoPessoas.map((p, idx) => (<div key={idx} className="flex justify-between items-center p-2 bg-red-50 rounded"><span className="font-semibold text-gray-800">{idx + 1}. {p.nome}</span><span className="text-red-600 font-bold">{p.valor.toFixed(1)}h</span></div>)) : (<p className="text-gray-500 text-center py-4">Sem dados</p>)}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">⭐ Top 10 - Menor HE</h2>
                <div className="space-y-2">{bottomHEPessoas.length > 0 ? bottomHEPessoas.map((p, idx) => (<div key={idx} className="flex justify-between items-center p-2 bg-green-50 rounded"><span className="font-semibold text-gray-800">{idx + 1}. {p.nome}</span><span className="text-green-600 font-bold">R$ {p.valor.toFixed(2)}</span></div>)) : (<p className="text-gray-500 text-center py-4">Sem dados</p>)}</div>
              </div>
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">⭐ Top 10 - Menor Absenteísmo</h2>
                <div className="space-y-2">{bottomAbsenteismoPessoas.length > 0 ? bottomAbsenteismoPessoas.map((p, idx) => (<div key={idx} className="flex justify-between items-center p-2 bg-green-50 rounded"><span className="font-semibold text-gray-800">{idx + 1}. {p.nome}</span><span className="text-green-600 font-bold">{p.valor.toFixed(1)}h</span></div>)) : (<p className="text-gray-500 text-center py-4">Sem dados</p>)}</div>
              </div>
            </div>
          </div>
        )}

        {abaAtiva === 'dashboard' && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div className="bg-white rounded-lg shadow-lg"><Gauge value={totalHE} max={metaHE} label="HE vs Meta" /></div>
              <div className="bg-white rounded-lg shadow-lg"><Gauge value={abs.taxaAbs} max={metaAbsenteismo} label="Absenteísmo vs Meta" /></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg shadow-lg p-6">
                <p className="text-sm font-semibold opacity-80">Total HE</p>
                <p className="text-3xl font-bold mt-2">R$ {totalHE.toFixed(2)}</p>
                <p className="text-xs opacity-80 mt-2">Meta: R$ {metaHE}</p>
              </div>
              <div className="bg-gradient-to-br from-red-500 to-red-600 text-white rounded-lg shadow-lg p-6">
                <p className="text-sm font-semibold opacity-80">Absenteísmo</p>
                <p className="text-3xl font-bold mt-2">{abs.taxaAbs}%</p>
                <p className="text-xs opacity-80 mt-2">Meta: {metaAbsenteismo}%</p>
              </div>
              <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg shadow-lg p-6">
                <p className="text-sm font-semibold opacity-80">Colaboradores</p>
                <p className="text-3xl font-bold mt-2">{pessoas.length}</p>
                <p className="text-xs opacity-80 mt-2">Ativos</p>
              </div>
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg shadow-lg p-6">
                <p className="text-sm font-semibold opacity-80">Lançamentos</p>
                <p className="text-3xl font-bold mt-2">{lançamentos.length}</p>
                <p className="text-xs opacity-80 mt-2">Total</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className={`rounded-lg shadow-lg p-8 ${totalHE > metaHE ? 'bg-red-50 border-l-4 border-red-500' : 'bg-green-50 border-l-4 border-green-500'}`}>
                <h3 className="text-2xl font-bold text-gray-800 mb-4">📊 Status HE</h3>
                <p className={`text-lg font-semibold ${totalHE > metaHE ? 'text-red-600' : 'text-green-600'}`}>{totalHE > metaHE ? '⚠️ Acima da Meta' : '✅ Dentro da Meta'}</p>
                <p className="text-sm text-gray-600 mt-2">{totalHE > metaHE ? `R$ ${(totalHE - metaHE).toFixed(2)} acima do esperado` : `R$ ${(metaHE - totalHE).toFixed(2)} abaixo do esperado`}</p>
              </div>
              <div className={`rounded-lg shadow-lg p-8 ${abs.taxaAbs > metaAbsenteismo ? 'bg-red-50 border-l-4 border-red-500' : 'bg-green-50 border-l-4 border-green-500'}`}>
                <h3 className="text-2xl font-bold text-gray-800 mb-4">📉 Status Absenteísmo</h3>
                <p className={`text-lg font-semibold ${abs.taxaAbs > metaAbsenteismo ? 'text-red-600' : 'text-green-600'}`}>{abs.taxaAbs > metaAbsenteismo ? '⚠️ Acima da Meta' : '✅ Dentro da Meta'}</p>
                <p className="text-sm text-gray-600 mt-2">{abs.taxaAbs > metaAbsenteismo ? `${(abs.taxaAbs - metaAbsenteismo).toFixed(2)}% acima do esperado` : `${(metaAbsenteismo - abs.taxaAbs).toFixed(2)}% abaixo do esperado`}</p>
              </div>
            </div>
          </div>
        )}

        {abaAtiva === 'lançamentos' && (
          <div>
            <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">📝 Registrar Lançamento</h2>
              <form onSubmit={handleAdicionarLançamento} className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <select value={formLançamento.pessoaId} onChange={(e) => setFormLançamento({ ...formLançamento, pessoaId: parseInt(e.target.value) })} className="border-2 border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500">
                  {pessoas.map(p => (<option key={p.id} value={p.id}>{p.nome} ({p.setor})</option>))}
                </select>
                <select value={formLançamento.tipo} onChange={(e) => setFormLançamento({ ...formLançamento, tipo: e.target.value })} className="border-2 border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500">
                  <option value="he-60">⏰ HE 60%</option>
                  <option value="he-100">⏰ HE 100%</option>
                  <option value="atraso">🔴 Atraso</option>
                  <option value="falta-total">❌ Falta Total</option>
                  <option value="atestado-horas">📋 Atestado de Horas</option>
                  <option value="atestado">📄 Atestado</option>
                  <option value="saida-antecipada">🚪 Saída Antecipada</option>
                </select>
                <input type="date" value={formLançamento.data} onChange={(e) => setFormLançamento({ ...formLançamento, data: e.target.value })} className="border-2 border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500" required />
                {['he-60', 'he-100', 'atestado-horas', 'saida-antecipada'].includes(formLançamento.tipo) ? (
                  <input type="number" step="0.5" min="0" placeholder="Horas" value={formLançamento.horas} onChange={(e) => setFormLançamento({ ...formLançamento, horas: e.target.value })} className="border-2 border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500" required />
                ) : (
                  <input type="number" min="0" placeholder="Minutos" value={formLançamento.minutos} onChange={(e) => setFormLançamento({ ...formLançamento, minutos: e.target.value })} className="border-2 border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500" />
                )}
                <button type="submit" className="bg-blue-600 text-white rounded-lg px-6 py-3 font-bold hover:bg-blue-700">📤 Registrar</button>
              </form>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">📋 Histórico ({lançamentos.length})</h2>
              {lançamentos.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Sem lançamentos</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                        <th className="text-left py-3 px-3 font-bold">Pessoa</th>
                        <th className="text-left py-3 px-3 font-bold">Setor</th>
                        <th className="text-left py-3 px-3 font-bold">Tipo</th>
                        <th className="text-left py-3 px-3 font-bold">Data</th>
                        <th className="text-left py-3 px-3 font-bold">Valor</th>
                        <th className="text-center py-3 px-3 font-bold">Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lançamentos.map((l, index) => {
                        const pessoa = pessoas.find(p => p.id === l.pessoa_id);
                        const tabela = tabelaHE[pessoa?.cargo];
                        const valor = l.tipo === 'he-60' ? (tabela?.he60 || 0) * l.horas : l.tipo === 'he-100' ? (tabela?.he100 || 0) * l.horas : 0;
                        return (
                          <tr key={l.id} className={`border-b ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'} hover:bg-blue-50`}>
                            <td className="py-3 px-3 font-semibold text-gray-800">{getNomePessoa(l.pessoa_id)}</td>
                            <td className="py-3 px-3 text-xs text-gray-600">{pessoa?.setor}</td>
                            <td className="py-3 px-3"><span className={`px-2 py-1 rounded text-xs font-semibold ${getTipoCor(l.tipo)}`}>{getTipoLabel(l.tipo)}</span></td>
                            <td className="py-3 px-3 text-gray-800">{new Date(l.data + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                            <td className="py-3 px-3 font-bold text-blue-600">{valor > 0 ? `R$ ${valor.toFixed(2)}` : '-'}</td>
                            <td className="py-3 px-3 text-center"><button onClick={() => handleDeletarLançamento(l.id)} className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs font-bold">🗑️</button></td>
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

        {abaAtiva === 'configuracao' && (
          <div className="space-y-8">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">🎯 Metas</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Meta de HE (R$)</label>
                  <input type="number" value={metaHE} onChange={(e) => setMetaHE(parseInt(e.target.value) || 0)} className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Meta Absenteísmo (%)</label>
                  <input type="number" step="0.1" value={metaAbsenteismo} onChange={(e) => setMetaAbsenteismo(parseFloat(e.target.value) || 0)} className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">⏱️ Horas Úteis/Dia</h2>
              <div className="max-w-xs">
                <input type="number" min="1" max="24" value={horasUteisDia} onChange={(e) => setHorasUteisDia(parseInt(e.target.value) || 10)} className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500" />
                <p className="text-xs text-gray-600 mt-2">⚠️ Cálculo usa apenas seg-sex (dias úteis)</p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">➕ Novo Cargo</h2>
              <form onSubmit={handleAdicionarCargo} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <input type="text" placeholder="Nome do cargo" value={formCargo.nome} onChange={(e) => setFormCargo({ ...formCargo, nome: e.target.value })} className="border-2 border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500" required />
                <input type="number" step="0.01" placeholder="HE 60% (R$)" value={formCargo.he60} onChange={(e) => setFormCargo({ ...formCargo, he60: e.target.value })} className="border-2 border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500" required />
                <input type="number" step="0.01" placeholder="HE 100% (R$)" value={formCargo.he100} onChange={(e) => setFormCargo({ ...formCargo, he100: e.target.value })} className="border-2 border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500" required />
                <button type="submit" className="bg-green-600 text-white rounded-lg px-6 py-3 font-bold hover:bg-green-700">✅ Adicionar</button>
              </form>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">📚 Cargos ({cargosArray.length})</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-blue-600 text-white">
                      <th className="text-left py-3 px-4 font-bold">Cargo</th>
                      <th className="text-left py-3 px-4 font-bold">HE 60%</th>
                      <th className="text-left py-3 px-4 font-bold">HE 100%</th>
                      <th className="text-center py-3 px-4 font-bold">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cargosArray.map((cargo, index) => (
                      <tr key={cargo} className={`border-b ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                        <td className="py-4 px-4 font-semibold text-gray-800">{cargo}</td>
                        <td className="py-4 px-4 font-bold text-blue-600">R$ {tabelaHE[cargo].he60.toFixed(2)}</td>
                        <td className="py-4 px-4 font-bold text-blue-600">R$ {tabelaHE[cargo].he100.toFixed(2)}</td>
                        <td className="py-4 px-4 text-center"><button onClick={() => handleDeletarCargo(cargo)} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs font-bold">🗑️</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">➕ Novo Colaborador</h2>
              <form onSubmit={handleAdicionarPessoa} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <input type="text" placeholder="Nome" value={formPessoa.nome} onChange={(e) => setFormPessoa({ ...formPessoa, nome: e.target.value })} className="border-2 border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500" required />
                <select value={formPessoa.cargo} onChange={(e) => setFormPessoa({ ...formPessoa, cargo: e.target.value })} className="border-2 border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500">
                  {cargosArray.map(cargo => (<option key={cargo} value={cargo}>{cargo}</option>))}
                </select>
                <select value={formPessoa.setor} onChange={(e) => setFormPessoa({ ...formPessoa, setor: e.target.value })} className="border-2 border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500">
                  {setores.map(setor => (<option key={setor} value={setor}>{setor}</option>))}
                </select>
                <button type="submit" className="bg-green-600 text-white rounded-lg px-6 py-3 font-bold hover:bg-green-700">✅ Adicionar</button>
              </form>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">👥 Colaboradores ({pessoas.length})</h2>
              {pessoas.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Sem colaboradores</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-blue-600 text-white">
                        <th className="text-left py-3 px-4 font-bold">Nome</th>
                        <th className="text-left py-3 px-4 font-bold">Cargo</th>
                        <th className="text-left py-3 px-4 font-bold">Setor</th>
                        <th className="text-center py-3 px-4 font-bold">Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pessoas.map((p, index) => (
                        <tr key={p.id} className={`border-b ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                          <td className="py-4 px-4 font-semibold text-gray-800">{p.nome}</td>
                          <td className="py-4 px-4 text-xs text-gray-600">{p.cargo}</td>
                          <td className="py-4 px-4 text-xs text-gray-600">{p.setor}</td>
                          <td className="py-4 px-4 text-center"><button onClick={() => handleDeletarPessoa(p.id)} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs font-bold">🗑️</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
