// @ts-nocheck
'use client';

import { useState, useMemo, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const SUPABASE_URL = 'https://blsdahvliocoqqdzkzym.supabase.co';
const SUPABASE_KEY = 'sb_publishable_XNUPzuPEgFil7C736xv_5Q_WzNDRuzp';
const APP_PASSWORD = 'DAXIATEC465';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function PasswordScreen({ onAuthenticate }) {
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (passwordInput === APP_PASSWORD) {
      sessionStorage.setItem('daxia_auth', 'true');
      onAuthenticate();
      setPasswordError('');
    } else {
      setPasswordError('❌ Senha incorreta! Tente novamente.');
      setPasswordInput('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-6">
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-blue-600 mb-2">🔐</h1>
          <h2 className="text-2xl font-bold text-gray-800">Daxia People Analytics</h2>
          <p className="text-gray-600 mt-2">Acesso Protegido</p>
        </div>

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Digite a Senha de Acesso:
            </label>
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="••••••••••"
              className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 text-center text-lg"
              autoFocus
            />
          </div>

          {passwordError && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
              <p className="text-red-700 text-sm font-semibold">{passwordError}</p>
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition duration-200"
          >
            🔓 Acessar
          </button>
        </form>

        <p className="text-center text-gray-500 text-xs mt-6">
          Você será desconectado ao fechar o navegador
        </p>
      </div>
    </div>
  );
}

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const auth = sessionStorage.getItem('daxia_auth');
    if (auth === 'true') {
      setIsAuthenticated(true);
    }
    setIsCheckingAuth(false);
  }, []);

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl font-bold text-blue-600 mb-4">⏳ Verificando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <PasswordScreen onAuthenticate={() => setIsAuthenticated(true)} />;
  }

  return <AppContent onLogout={() => {
    sessionStorage.removeItem('daxia_auth');
    setIsAuthenticated(false);
  }} />;
}

function AppContent({ onLogout }) {
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
  const VALOR_BONUS = 100;

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
  const [auditoria, setAuditoria] = useState([]);
  const [bonusElegibilidade, setBonusElegibilidade] = useState([]);

  const [formPessoa, setFormPessoa] = useState({ nome: '', cargo: 'AJUDANTE GERAL', setor: 'Inbound' });
  const [formCargo, setFormCargo] = useState({ nome: '', he60: '', he100: '' });
  const [formLançamento, setFormLançamento] = useState({ 
    pessoaId: 1, 
    tipo: 'he-60', 
    data: '', 
    horas: 0, 
    minutos: 0, 
    descricao: '',
    avisoComunicado: true
  });

  const cargosArray = Object.keys(tabelaHE);

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: pessoasData } = await supabase.from('pessoas').select('*');
        if (pessoasData) setPessoas(pessoasData);

        const { data: lancamentosData } = await supabase.from('lancamentos').select('*');
        if (lancamentosData) setLançamentos(lancamentosData);

        const { data: heData } = await supabase.from('tabela_he').select('*');
        if (heData && heData.length > 0) {
          const heObj = {};
          heData.forEach(item => {
            heObj[item.cargo] = { he60: parseFloat(item.he60), he100: parseFloat(item.he100) };
          });
          setTabelaHE({ ...cargosIniciais, ...heObj });
        }

        const { data: auditData } = await supabase.from('auditoria').select('*').order('criado_em', { ascending: false });
        if (auditData) setAuditoria(auditData);

        const { data: bonusData } = await supabase.from('bonus_elegibilidade').select('*');
        if (bonusData) setBonusElegibilidade(bonusData);

        setIsHydrated(true);
      } catch (error) {
        console.error('Erro ao carregar:', error);
        setIsHydrated(true);
      }
    };

    loadData();
  }, []);

  const registrarAuditoria = async (tabela, acao, dados, detalhes = null) => {
    if (!isHydrated) return;
    try {
      await supabase.from('auditoria').insert([{
        tabela,
        acao,
        usuario: 'Usuário Sistema',
        dados_novos: dados,
        dados_anteriores: detalhes
      }]);
      
      const { data: auditData } = await supabase.from('auditoria').select('*').order('criado_em', { ascending: false });
      if (auditData) setAuditoria(auditData);
    } catch (error) {
      console.error('Erro ao registrar auditoria:', error);
    }
  };

  const desclassificarBonus = async (pessoaId, motivo) => {
    if (!isHydrated) return;
    try {
      const hoje = new Date().toISOString().split('T')[0];
      
      const { data: existing } = await supabase
        .from('bonus_elegibilidade')
        .select('*')
        .eq('pessoa_id', pessoaId);
      
      if (existing && existing.length > 0) {
        await supabase
          .from('bonus_elegibilidade')
          .update({
            elegivel: false,
            data_desclassificacao: hoje,
            motivo_desclassificacao: motivo
          })
          .eq('pessoa_id', pessoaId);
      } else {
        await supabase
          .from('bonus_elegibilidade')
          .insert([{
            pessoa_id: pessoaId,
            elegivel: false,
            data_desclassificacao: hoje,
            motivo_desclassificacao: motivo
          }]);
      }
      
      const { data: bonusData } = await supabase.from('bonus_elegibilidade').select('*');
      if (bonusData) setBonusElegibilidade(bonusData);
    } catch (error) {
      console.error('Erro ao desclassificar bonus:', error);
    }
  };

  const inicializarBonusPessoa = async (pessoaId) => {
    if (!isHydrated) return;
    try {
      const { data: existing } = await supabase
        .from('bonus_elegibilidade')
        .select('*')
        .eq('pessoa_id', pessoaId);
      
      if (!existing || existing.length === 0) {
        await supabase
          .from('bonus_elegibilidade')
          .insert([{
            pessoa_id: pessoaId,
            elegivel: true,
            data_inicio_elegibilidade: new Date().toISOString().split('T')[0]
          }]);
        
        const { data: bonusData } = await supabase.from('bonus_elegibilidade').select('*');
        if (bonusData) setBonusElegibilidade(bonusData);
      }
    } catch (error) {
      console.error('Erro ao inicializar bonus:', error);
    }
  };

  useEffect(() => {
    if (!isHydrated) return;

    const channel = supabase.channel('db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pessoas' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setPessoas(p => [...p, payload.new]);
            inicializarBonusPessoa(payload.new.id);
          } else if (payload.eventType === 'DELETE') {
            setPessoas(p => p.filter(x => x.id !== payload.old.id));
          } else if (payload.eventType === 'UPDATE') {
            setPessoas(p => p.map(x => x.id === payload.new.id ? payload.new : x));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lancamentos' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setLançamentos(p => [...p, payload.new]);
          } else if (payload.eventType === 'DELETE') {
            setLançamentos(p => p.filter(x => x.id !== payload.old.id));
          } else if (payload.eventType === 'UPDATE') {
            setLançamentos(p => p.map(x => x.id === payload.new.id ? payload.new : x));
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
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

  const dadosGraficoHELinha = useMemo(() => {
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
      .map(([data, valor]) => ({
        data: new Date(data + 'T00:00:00').toLocaleDateString('pt-BR', { month: '2-digit', day: '2-digit' }),
        dataFull: data,
        valor: parseFloat(valor.toFixed(2))
      }));
  }, [lançamentosFiltrados, pessoas, tabelaHE]);

  const dadosGraficoAbsArea = useMemo(() => {
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
      .map(([data, horas]) => ({
        data: new Date(data + 'T00:00:00').toLocaleDateString('pt-BR', { month: '2-digit', day: '2-digit' }),
        dataFull: data,
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
      const { data, error } = await supabase.from('pessoas').insert([formPessoa]).select();
      if (error) throw error;
      registrarAuditoria('pessoas', 'INSERT', data[0]);
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
      const { data, error } = await supabase.from('tabela_he').insert([{
        cargo: nomeCargo,
        he60: parseFloat(formCargo.he60),
        he100: parseFloat(formCargo.he100)
      }]).select();
      if (error) throw error;
      registrarAuditoria('tabela_he', 'INSERT', data[0]);
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
        const cargoData = { cargo: nomeCargo, he60: tabelaHE[nomeCargo].he60, he100: tabelaHE[nomeCargo].he100 };
        await supabase.from('tabela_he').delete().eq('cargo', nomeCargo);
        registrarAuditoria('tabela_he', 'DELETE', null, cargoData);
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
      const lancamentoData = {
        pessoa_id: parseInt(formLançamento.pessoaId),
        tipo: formLançamento.tipo,
        data: formLançamento.data,
        horas: ['he-60', 'he-100', 'atestado-horas', 'saida-antecipada'].includes(formLançamento.tipo) ? parseFloat(formLançamento.horas) || 0 : horas,
        minutos: formLançamento.tipo === 'atraso' ? parseInt(formLançamento.minutos) || 0 : 0,
        descricao: formLançamento.descricao
      };
      const { data, error } = await supabase.from('lancamentos').insert([lancamentoData]).select();
      if (error) throw error;
      registrarAuditoria('lancamentos', 'INSERT', data[0]);
      
      const pessoaId = parseInt(formLançamento.pessoaId);
      if (formLançamento.tipo === 'falta-total') {
        await desclassificarBonus(pessoaId, `Falta injustificada - ${formLançamento.data}`);
      } else if (formLançamento.tipo === 'atraso' && parseInt(formLançamento.minutos) > 10 && !formLançamento.avisoComunicado) {
        await desclassificarBonus(pessoaId, `Atraso não comunicado - ${formLançamento.minutos} min em ${formLançamento.data}`);
      } else if (formLançamento.tipo === 'saida-antecipada' && !formLançamento.avisoComunicado) {
        await desclassificarBonus(pessoaId, `Saída antecipada não comunicada - ${formLançamento.horas}h em ${formLançamento.data}`);
      } else if (formLançamento.tipo === 'advertencia') {
        await desclassificarBonus(pessoaId, `Advertência registrada em ${formLançamento.data}`);
      }
      
      setFormLançamento({ pessoaId: pessoas[0]?.id || 1, tipo: 'he-60', data: '', horas: 0, minutos: 0, descricao: '', avisoComunicado: true });
      
    } catch (error) {
      alert('Erro: ' + error.message);
    }
  };

 const handleDeletarPessoa = async (id) => {
    const pessoa = pessoas.find(p => p.id === id);
    const senhaDelete = prompt(`⚠️ CUIDADO!\n\nVocê está deletando: ${pessoa?.nome}\n\nDigite a senha de SUPER ADMIN para confirmar:`);
    
    if (senhaDelete === null) {
      return;
    }
    if (senhaDelete === 'DELETAR2026') {
      try {
        // Deletar do bonus primeiro
        await supabase.from('bonus_elegibilidade').delete().eq('pessoa_id', id);
        
        // Depois deletar a pessoa
        await supabase.from('pessoas').delete().eq('id', id);
        registrarAuditoria('pessoas', 'DELETE', null, pessoa);
        
        // Atualizar tela
        setPessoas(p => p.filter(x => x.id !== id));
        setBonusElegibilidade(b => b.filter(x => x.pessoa_id !== id));
        
        alert('✅ Colaborador deletado com sucesso!');
      } catch (error) {
        alert('❌ Erro ao deletar: ' + error.message);
      }
    } else {
      alert('❌ Senha incorreta! Operação cancelada.');
    }
  };
const handleDeletarLançamento = async (id) => {
    const lançamento = lançamentos.find(l => l.id === id);
    const pessoa = pessoas.find(p => p.id === lançamento.pessoa_id);
    
    if (confirm(`Deletar lançamento de ${pessoa?.nome}?\n\nTipo: ${getTipoLabel(lançamento.tipo)}\nData: ${new Date(lançamento.data + 'T00:00:00').toLocaleDateString('pt-BR')}`)) {
      try {
        await supabase.from('lancamentos').delete().eq('id', id);
        registrarAuditoria('lancamentos', 'DELETE', null, lançamento);
        alert('✅ Lançamento deletado!');
      } catch (error) {
        alert('❌ Erro: ' + error.message);
      }
    }
  };
const handleToggleAtivoColaborador = async (pessoaId, ativo) => {
    try {
      const { error } = await supabase
        .from('pessoas')
        .update({ ativo: !ativo })
        .eq('id', pessoaId);

      if (error) throw error;

      setPessoas(p => p.map(x => x.id === pessoaId ? { ...x, ativo: !ativo } : x));

      alert(`✅ Colaborador ${!ativo ? 'ativado' : 'desativado'}!`);
    } catch (error) {
      alert('❌ Erro: ' + error.message);
    }
  };
  
  const handleToggleBonusElegibilidade = async (pessoaId, elegivel) => {
    try {
      const { data: existing } = await supabase
        .from('bonus_elegibilidade')
        .select('*')
        .eq('pessoa_id', pessoaId);
      
      if (existing && existing.length > 0) {
        await supabase
          .from('bonus_elegibilidade')
          .update({
            elegivel: elegivel,
            data_desclassificacao: !elegivel ? new Date().toISOString().split('T')[0] : null,
            motivo_desclassificacao: !elegivel ? 'Ajuste manual do gerente' : null
          })
          .eq('pessoa_id', pessoaId);
      } else {
        await supabase
          .from('bonus_elegibilidade')
          .insert([{
            pessoa_id: pessoaId,
            elegivel: elegivel,
            data_desclassificacao: !elegivel ? new Date().toISOString().split('T')[0] : null,
            motivo_desclassificacao: !elegivel ? 'Ajuste manual do gerente' : null,
            data_inicio_elegibilidade: new Date().toISOString().split('T')[0]
          }]);
      }
      
      const { data: bonusData } = await supabase.from('bonus_elegibilidade').select('*');
      if (bonusData) setBonusElegibilidade(bonusData);
      alert(`✅ ${elegivel ? 'Elegível' : 'Desclassificado'} com sucesso!`);
    } catch (error) {
      alert('Erro: ' + error.message);
    }
  };

  const handleReversaoBonusDesclassificacao = async (pessoaId) => {
    if (confirm('Reverter desclassificação? Pessoa volta a ser elegível?')) {
      try {
        await supabase
          .from('bonus_elegibilidade')
          .update({
            elegivel: true,
            data_desclassificacao: null,
            motivo_desclassificacao: null
          })
          .eq('pessoa_id', pessoaId);
        
        const { data: bonusData } = await supabase.from('bonus_elegibilidade').select('*');
        if (bonusData) setBonusElegibilidade(bonusData);
        alert('✅ Desclassificação revertida!');
      } catch (error) {
        alert('Erro: ' + error.message);
      }
    }
  };

  const handleResetBonusmensal = async () => {
    if (confirm('⚠️ RESET MENSAL - Todos ATIVOS voltarão a ser elegíveis. Tem certeza?')) {
      try {
        const { data: allBonus } = await supabase.from('bonus_elegibilidade').select('*');
        
        if (allBonus && allBonus.length > 0) {
          for (const bonus of allBonus) {
            const pessoa = pessoas.find(p => p.id === bonus.pessoa_id);
            
            // Só reseta se a pessoa está ATIVA
            if (pessoa && pessoa.ativo) {
              await supabase
                .from('bonus_elegibilidade')
                .update({
                  elegivel: true,
                  data_desclassificacao: null,
                  motivo_desclassificacao: null
                })
                .eq('id', bonus.id);
            }
          }
        }
        
        const { data: bonusData } = await supabase.from('bonus_elegibilidade').select('*');
        if (bonusData) setBonusElegibilidade(bonusData);
        alert('✅ Reset mensal realizado! Apenas colaboradores ATIVOS foram resetados.');
      } catch (error) {
        alert('Erro: ' + error.message);
      }
    }
  };
  const getTipoLabel = (tipo) => {
    const labels = { 
      'he-60': '⏰ HE 60%', 
      'he-100': '⏰ HE 100%', 
      'atraso': '🔴 Atraso', 
      'atestado-horas': '📋 Atestado de Horas', 
      'falta-total': '❌ Falta Total', 
      'atestado': '📄 Atestado', 
      'saida-antecipada': '🚪 Saída Antecipada',
      'advertencia': '⚠️ Advertência'
    };
    return labels[tipo] || tipo;
  };

  const getTipoCor = (tipo) => {
    if (tipo.includes('he')) return 'bg-blue-100 text-blue-800';
    if (tipo === 'atraso') return 'bg-orange-100 text-orange-800';
    if (tipo === 'falta-total' || tipo === 'atestado-horas') return 'bg-red-100 text-red-800';
    if (tipo === 'atestado' || tipo === 'saida-antecipada') return 'bg-yellow-100 text-yellow-800';
    if (tipo === 'advertencia') return 'bg-purple-100 text-purple-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getNomePessoa = (id) => {
    const pessoa = pessoas.find(p => p.id === id);
    return pessoa?.nome || 'Desconhecido';
  };

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
const recalcularBonusComFerias = async () => {
    try {
      const { data: allPessoas } = await supabase.from('pessoas').select('*');
      const { data: allLancamentos } = await supabase.from('lancamentos').select('*');
      const { data: allBonus } = await supabase.from('bonus_elegibilidade').select('*');
      
      if (!allPessoas || !allLancamentos || !allBonus) return;
      
      for (const pessoa of allPessoas) {
        const lancamentosPessoa = allLancamentos.filter(l => l.pessoa_id === pessoa.id);
        const feriasPessoa = lancamentosPessoa.filter(l => l.tipo === 'férias');
        
        if (feriasPessoa.length > 0) {
          let diasUteisFérias = 0;
          for (const férias of feriasPessoa) {
            const inicio = new Date(férias.data_inicio || férias.data);
            const fim = new Date(férias.data_fim || férias.data);
            
            for (let d = new Date(inicio); d <= fim; d.setDate(d.getDate() + 1)) {
              const dia = d.getDay();
              if (dia !== 0 && dia !== 6) diasUteisFérias++;
            }
          }
          
          const diasUteisTotal = 22;
          const proporção = Math.max(0, (diasUteisTotal - diasUteisFérias) / diasUteisTotal);
          
          const bonusAtual = allBonus.find(b => b.pessoa_id === pessoa.id);
          if (bonusAtual && bonusAtual.elegivel) {
            const valorBonusOriginal = 100;
            const valorProporcional = valorBonusOriginal * proporção;
            
            await supabase
              .from('bonus_elegibilidade')
              .update({ valor_bonus: valorProporcional })
              .eq('id', bonusAtual.id);
          }
        }
      }
    } catch (error) {
      console.error('Erro ao recalcular bônus com férias:', error);
    }
  };

  const handleAdicionarFérias = async (e) => {
    e.preventDefault();
    
    try {
      const pessoaSelectEl = document.getElementById('feriasPessoa');
      const inicioInputEl = document.getElementById('feriasinicio');
      const fimInputEl = document.getElementById('feriasfim');
      
      if (!pessoaSelectEl || !inicioInputEl || !fimInputEl) {
        alert('❌ Erro: campos de férias não encontrados');
        return;
      }
      
      const pessoaId = pessoaSelectEl.value;
      const dataInicio = inicioInputEl.value;
      const dataFim = fimInputEl.value;
      
      if (!pessoaId || !dataInicio || !dataFim) {
        alert('❌ Preencha todos os campos!');
        return;
      }
      
      const { data, error } = await supabase.from('lancamentos').insert({
        pessoa_id: pessoaId,
        tipo: 'férias',
        data: dataInicio,
        data_inicio: dataInicio,
        data_fim: dataFim,
        descricao: `Férias de ${new Date(dataInicio).toLocaleDateString('pt-BR')} a ${new Date(dataFim).toLocaleDateString('pt-BR')}`,
        criado_em: new Date().toISOString()
      });
      
      if (error) throw error;
      
      const pessoa = pessoas.find(p => p.id === pessoaId);
      await registrarAuditoria('lancamentos', 'INSERT', data?.[0], { pessoa_id: pessoaId, tipo: 'férias' });
      
      await recalcularBonusComFerias();
      const { data: bonusAtualizado } = await supabase
  .from('bonus_elegibilidade')
  .select('*');

if (bonusAtualizado) {
  setBonusElegibilidade(bonusAtualizado);
}
      
      const { data: novosDados } = await supabase.from('lancamentos').select('*');
      if (novosDados) setLançamentos(novosDados);
      
      alert('✅ Férias registradas com sucesso!');
      
     if (pessoaSelectEl) pessoaSelectEl.value = '';
if (inicioInputEl) inicioInputEl.value = '';
if (fimInputEl) fimInputEl.value = '';
      
    } catch (error) {
      alert('❌ Erro ao registrar férias: ' + error.message);
    }
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
          <div className="flex gap-2">
            <button onClick={() => {
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
            }} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2">📊 Exportar CSV</button>
            <button onClick={onLogout} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold">🔒 Sair</button>
          </div>
        </div>

        <div className="flex gap-2 mb-8 border-b-2 border-gray-300 overflow-x-auto">
          <button onClick={() => setAbaAtiva('resumos')} className={`px-6 py-3 font-bold transition whitespace-nowrap ${abaAtiva === 'resumos' ? 'text-blue-600 border-b-4 border-blue-600' : 'text-gray-600 hover:text-gray-800'}`}>📊 Resumos</button>
          <button onClick={() => setAbaAtiva('dashboard')} className={`px-6 py-3 font-bold transition whitespace-nowrap ${abaAtiva === 'dashboard' ? 'text-blue-600 border-b-4 border-blue-600' : 'text-gray-600 hover:text-gray-800'}`}>📈 Dashboard</button>
          <button onClick={() => setAbaAtiva('lançamentos')} className={`px-6 py-3 font-bold transition whitespace-nowrap ${abaAtiva === 'lançamentos' ? 'text-blue-600 border-b-4 border-blue-600' : 'text-gray-600 hover:text-gray-800'}`}>📝 Lançamentos</button>
          <button onClick={() => setAbaAtiva('auditoria')} className={`px-6 py-3 font-bold transition whitespace-nowrap ${abaAtiva === 'auditoria' ? 'text-blue-600 border-b-4 border-blue-600' : 'text-gray-600 hover:text-gray-800'}`}>🔍 Auditoria</button>
          <button onClick={() => setAbaAtiva('bonus')} className={`px-6 py-3 font-bold transition whitespace-nowrap ${abaAtiva === 'bonus' ? 'text-blue-600 border-b-4 border-blue-600' : 'text-gray-600 hover:text-gray-800'}`}>🎁 Bonus</button>
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
              <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-red-500 transform transition hover:scale-105">
                <p className="text-gray-600 text-sm font-semibold">📉 Taxa Absenteísmo</p>
                <p className="text-4xl font-bold text-red-600 mt-3">{abs.taxaAbs}%</p>
                <p className="text-red-500 text-xs mt-2">{abs.horasAbsenteísmo}h / {abs.horasUteisDisponiveis}h</p>
              </div>
              <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-500 transform transition hover:scale-105">
                <p className="text-gray-600 text-sm font-semibold">💰 Total HE</p>
                <p className="text-4xl font-bold text-blue-600 mt-3">R$ {totalHE.toFixed(2)}</p>
                <p className="text-blue-500 text-xs mt-2">{lançamentosFiltrados.filter(l => l.tipo.includes('he')).length} registros</p>
              </div>
              <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-green-500 transform transition hover:scale-105">
                <p className="text-gray-600 text-sm font-semibold">👥 Pessoas</p>
                <p className="text-4xl font-bold text-green-600 mt-3">{setorFiltro ? pessoas.filter(p => p.setor === setorFiltro).length : pessoas.length}</p>
                <p className="text-green-500 text-xs mt-2">No período</p>
              </div>
              <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-purple-500 transform transition hover:scale-105">
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
                <h2 className="text-xl font-bold text-gray-800 mb-4">💰 HE ao Longo do Tempo</h2>
                {dadosGraficoHELinha.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={dadosGraficoHELinha}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="data" />
                      <YAxis />
                      <Tooltip formatter={(value) => `R$ ${value.toFixed(2)}`} />
                      <Legend />
                      <Line type="monotone" dataKey="valor" stroke="#3b82f6" name="HE (R$)" strokeWidth={2} dot={{ fill: '#3b82f6' }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (<p className="text-gray-500 text-center py-8">Sem dados</p>)}
              </div>
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">📉 Absenteísmo ao Longo do Tempo</h2>
                {dadosGraficoAbsArea.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={dadosGraficoAbsArea}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="data" />
                      <YAxis />
                      <Tooltip formatter={(value) => `${value.toFixed(2)}h`} />
                      <Legend />
                      <Area type="monotone" dataKey="valor" stroke="#ef4444" fill="#fecaca" name="Absenteísmo (h)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (<p className="text-gray-500 text-center py-8">Sem dados</p>)}
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
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg shadow-lg p-6 transform transition hover:scale-105">
                <p className="text-sm font-semibold opacity-80">Total HE</p>
                <p className="text-3xl font-bold mt-2">R$ {totalHE.toFixed(2)}</p>
                <p className="text-xs opacity-80 mt-2">Meta: R$ {metaHE}</p>
              </div>
              <div className="bg-gradient-to-br from-red-500 to-red-600 text-white rounded-lg shadow-lg p-6 transform transition hover:scale-105">
                <p className="text-sm font-semibold opacity-80">Absenteísmo</p>
                <p className="text-3xl font-bold mt-2">{abs.taxaAbs}%</p>
                <p className="text-xs opacity-80 mt-2">Meta: {metaAbsenteismo}%</p>
              </div>
              <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg shadow-lg p-6 transform transition hover:scale-105">
                <p className="text-sm font-semibold opacity-80">Colaboradores</p>
                <p className="text-3xl font-bold mt-2">{pessoas.length}</p>
                <p className="text-xs opacity-80 mt-2">Ativos</p>
              </div>
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg shadow-lg p-6 transform transition hover:scale-105">
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
              <form onSubmit={handleAdicionarLançamento} className="grid grid-cols-1 md:grid-cols-6 gap-4">
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
                  <option value="advertencia">⚠️ Advertência</option>
                </select>
                <input type="date" value={formLançamento.data} onChange={(e) => setFormLançamento({ ...formLançamento, data: e.target.value })} className="border-2 border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500" required />
                {['he-60', 'he-100', 'atestado-horas', 'saida-antecipada'].includes(formLançamento.tipo) ? (
                  <input type="number" step="0.5" min="0" placeholder="Horas" value={formLançamento.horas} onChange={(e) => setFormLançamento({ ...formLançamento, horas: e.target.value })} className="border-2 border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500" required />
                ) : (
                  <input type="number" min="0" placeholder="Minutos" value={formLançamento.minutos} onChange={(e) => setFormLançamento({ ...formLançamento, minutos: e.target.value })} className="border-2 border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500" />
                )}
                <button type="submit" className="bg-blue-600 text-white rounded-lg px-6 py-3 font-bold hover:bg-blue-700">📤 Registrar</button>
              </form>
              {(formLançamento.tipo === 'atraso' || formLançamento.tipo === 'saida-antecipada') && (
                <div className="mt-4 bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
                  <label className="text-sm font-semibold text-yellow-800 flex items-center gap-2">
                    <input type="checkbox" checked={formLançamento.avisoComunicado} onChange={(e) => setFormLançamento({ ...formLançamento, avisoComunicado: e.target.checked })} />
                    ✅ Aviso comunicado com antecedência?
                  </label>
                  <p className="text-xs text-yellow-700 mt-2">Se NÃO marcar, a pessoa será desclassificada do bonus!</p>
                </div>
              )}
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

        {abaAtiva === 'auditoria' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">🔍 Histórico de Alterações</h2>
            {auditoria.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Sem alterações registradas</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-blue-600 text-white">
                      <th className="text-left py-3 px-3 font-bold">Tabela</th>
                      <th className="text-left py-3 px-3 font-bold">Ação</th>
                      <th className="text-left py-3 px-3 font-bold">Usuário</th>
                      <th className="text-left py-3 px-3 font-bold">Data/Hora</th>
                      <th className="text-left py-3 px-3 font-bold">Detalhes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditoria.slice(0, 50).map((a, index) => (
                      <tr key={a.id} className={`border-b ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                        <td className="py-3 px-3 font-semibold text-gray-800">{a.tabela}</td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            a.acao === 'INSERT' ? 'bg-green-100 text-green-800' :
                            a.acao === 'UPDATE' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {a.acao}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-xs text-gray-600">{a.usuario}</td>
                        <td className="py-3 px-3 text-xs text-gray-600">{new Date(new Date(a.criado_em).getTime() - (3 * 60 * 60 * 1000)).toLocaleString('pt-BR')}</td>
                        <td className="py-3 px-3 text-xs text-gray-600">
                          {a.dados_novos ? `ID: ${a.dados_novos?.id || a.dados_novos?.cargo || '-'}` : (a.dados_anteriores ? `ID: ${a.dados_anteriores?.id || a.dados_anteriores?.cargo || '-'}` : '-')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {abaAtiva === 'bonus' && (
          <div className="space-y-8">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">🎁 Gestão de Bonus</h2>
                <button onClick={handleResetBonusmensal} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold text-sm">🔄 Reset Mensal</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg shadow-lg p-6">
                  <p className="text-sm font-semibold opacity-80">Elegiveis</p>
                  <p className="text-4xl font-bold mt-2">{bonusElegibilidade.filter(b => b.elegivel).length}</p>
                  <p className="text-xs opacity-80 mt-2">R$ {bonusElegibilidade.filter(b => b.elegivel).length * VALOR_BONUS}</p>
                </div>
                <div className="bg-gradient-to-br from-red-500 to-red-600 text-white rounded-lg shadow-lg p-6">
                  <p className="text-sm font-semibold opacity-80">Desclassificados</p>
                  <p className="text-4xl font-bold mt-2">{bonusElegibilidade.filter(b => !b.elegivel).length}</p>
                  <p className="text-xs opacity-80 mt-2">Retirados do bonus</p>
                </div>
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg shadow-lg p-6">
                  <p className="text-sm font-semibold opacity-80">Valor Total</p>
                  <p className="text-4xl font-bold mt-2"> R$ {bonusElegibilidade.filter(b => b.elegivel).reduce((acc, b) => acc + (b.valor_bonus ?? VALOR_BONUS), 0).toFixed(2)}</p>
                  <p className="text-xs opacity-80 mt-2">A pagar</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-green-50 rounded-lg shadow-lg p-6 border-l-4 border-green-500">
                  <h3 className="text-xl font-bold text-green-800 mb-4">✅ Elegiveis para Bonus</h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {bonusElegibilidade.filter(b => b.elegivel && pessoas.find(p => p.id === b.pessoa_id)).length > 0 ? (
                      bonusElegibilidade.filter(b => b.elegivel).map(bonus => {const pessoa = pessoas.find(p => p.id === bonus.pessoa_id);
                        return (
                          <div key={bonus.id} className="flex justify-between items-center bg-white p-3 rounded border border-green-300">
                            <div>
                              <p className="font-semibold text-gray-800">✅ {pessoa?.nome}</p>
                              <p className="text-xs text-gray-600">{pessoa?.setor} • {pessoa?.cargo}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-green-600">
  R$ {(bonus.valor_bonus ?? VALOR_BONUS).toFixed(2)}
</p>
                              <button onClick={() => handleToggleBonusElegibilidade(bonus.pessoa_id, false)} className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs font-bold mt-1">Desclassificar</button>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-gray-600 text-center py-4">Nenhum elegível</p>
                    )}
                  </div>
                </div>

                <div className="bg-red-50 rounded-lg shadow-lg p-6 border-l-4 border-red-500">
                  <h3 className="text-xl font-bold text-red-800 mb-4">❌ Desclassificados</h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {bonusElegibilidade.filter(b => !b.elegivel && pessoas.find(p => p.id === b.pessoa_id)).length > 0 ? (
                      bonusElegibilidade.filter(b => !b.elegivel).map(bonus => {
                        const pessoa = pessoas.find(p => p.id === bonus.pessoa_id);
                        return (
                          <div key={bonus.id} className="bg-white p-3 rounded border border-red-300 opacity-70">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-semibold text-gray-800 line-through">❌ {pessoa?.nome}</p>
                                <p className="text-xs text-gray-600">{pessoa?.setor} • {pessoa?.cargo}</p>
                                <p className="text-xs text-red-600 font-semibold mt-1">Motivo: {bonus.motivo_desclassificacao || 'Não especificado'}</p>
                                <p className="text-xs text-gray-500">Data: {new Date(bonus.data_desclassificacao + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                              </div>
                              {bonus.reversivel && (
                                <button onClick={() => handleReversaoBonusDesclassificacao(bonus.pessoa_id)} className="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded text-xs font-bold">↩️</button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-gray-600 text-center py-4">Nenhum desclassificado</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">📄 Relatório para RH</h2>
              <button onClick={() => {
                const hoje = new Date().toLocaleDateString('pt-BR');
                const elegiveis = bonusElegibilidade.filter(b => b.elegivel);
                const desclassificados = bonusElegibilidade.filter(b => !b.elegivel);
                const totalBonus = elegiveis.reduce((acc, b) => acc + (b.valor_bonus ?? VALOR_BONUS),0
          );

                let conteudo = `DAXIA PEOPLE ANALYTICS - RELATÓRIO DE BONUS\n`;
                conteudo += `Data: ${hoje}\n`;
                conteudo += `=${"=".repeat(60)}\n\n`;
                
                conteudo += `RESUMO\n`;
                conteudo += `-${"-".repeat(60)}\n`;
                conteudo += `Total de Colaboradores: ${pessoas.length}\n`;
                conteudo += `Elegiveis: ${elegiveis.length}\n`;
                conteudo += `Desclassificados: ${desclassificados.length}\n`;
                conteudo += `Valor do Bonus: R$ ${VALOR_BONUS} (cada)\n`;
                conteudo += `Total a Pagar: R$ ${totalBonus}\n\n`;

                conteudo += `COLABORADORES ELEGIVEIS\n`;
                conteudo += `-${"-".repeat(60)}\n`;
                elegiveis.forEach((bonus, idx) => {
                  const pessoa = pessoas.find(p => p.id === bonus.pessoa_id);
                  conteudo += `${idx + 1}. ${pessoa?.nome} (${pessoa?.cargo}) - R$ ${(bonus.valor_bonus ?? VALOR_BONUS).toFixed(2)}\n`;
                });

                conteudo += `\nCOLABORADORES DESCLASSIFICADOS\n`;
                conteudo += `-${"-".repeat(60)}\n`;
                desclassificados.forEach((bonus, idx) => {
                  const pessoa = pessoas.find(p => p.id === bonus.pessoa_id);
                  conteudo += `${idx + 1}. ${pessoa?.nome} (${pessoa?.cargo})\n`;
                  conteudo += `   Motivo: ${bonus.motivo_desclassificacao}\n`;
                  conteudo += `   Data: ${new Date(bonus.data_desclassificacao + 'T00:00:00').toLocaleDateString('pt-BR')}\n`;
                });

                conteudo += `\n=${"=".repeat(60)}\n`;
                conteudo += `Gerado automaticamente pelo Daxia People Analytics\n`;

                const blob = new Blob([conteudo], { type: 'text/plain;charset=utf-8;' });
                const link = document.createElement('a');
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', `Relatorio_Bonus_${new Date().toISOString().split('T')[0]}.txt`);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold">📥 Baixar Relatório (TXT)</button>
            </div>
          </div>
        )}

        {abaAtiva === 'configuracao' && (
          <div className="space-y-8">
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
  <h2 className="text-2xl font-bold text-gray-800 mb-4">🏖️ Registrar Férias</h2>
  <form onSubmit={handleAdicionarFérias} className="space-y-4">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">👤 Colaborador</label>
        <select id="feriasPessoa" className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500">
          <option value="">Selecione um colaborador</option>
          {pessoas.map(p => (<option key={p.id} value={p.id}>{p.nome} ({p.setor})</option>))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">📅 Data Início</label>
        <input type="date" id="feriasinicio" className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500" required />
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">📅 Data Fim</label>
        <input type="date" id="feriasfim" className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500" required />
      </div>
    </div>
    <button type="submit" className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg font-bold hover:bg-blue-700">🏖️ Registrar Férias</button>
  </form>
</div>
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

            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">🎁 Marcar Elegibilidade para Bonus</h2>
              <p className="text-gray-600 mb-4">Clique para marcar/desmarcar como elegível:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pessoas.map(p => {
                  const bonus = bonusElegibilidade.find(b => b.pessoa_id === p.id);
                  const elegivel = bonus?.elegivel ?? true;
                  return (
                    <button
                      key={p.id}
                      onClick={() => handleToggleBonusElegibilidade(p.id, !elegivel)}
                      className={`p-4 rounded-lg font-bold transition ${
                        elegivel
                          ? 'bg-green-100 text-green-800 border-2 border-green-500'
                          : 'bg-red-100 text-red-800 border-2 border-red-500'
                      }`}
                    >
                      {elegivel ? '✅' : '❌'} {p.nome} ({p.setor})
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">🔄 Ativar/Desativar Colaboradores</h2>
              <p className="text-gray-600 mb-4">Inativo não aparece no bônus e não é resetado mensalmente:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pessoas.map(p => (
                  <button
                    key={p.id}
                    onClick={() => handleToggleAtivoColaborador(p.id, p.ativo ?? true)}
                    className={`p-4 rounded-lg font-bold transition ${
                      (p.ativo ?? true)
                        ? 'bg-green-100 text-green-800 border-2 border-green-500'
                        : 'bg-gray-100 text-gray-800 border-2 border-gray-400'
                    }`}
                  >
                    {(p.ativo ?? true) ? '✅ ATIVO' : '❌ INATIVO'} - {p.nome} ({p.setor})
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
