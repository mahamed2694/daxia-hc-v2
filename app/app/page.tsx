'use client';

import { useState, useMemo, useEffect } from 'react';

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
  const [pessoas, setPessoas] = useState([
    { id: 1, nome: 'João Silva', cargo: 'AJUDANTE GERAL', setor: 'Inbound' },
    { id: 2, nome: 'Maria Santos', cargo: 'CONFERENTE JR', setor: 'Outbound' }
  ]);
  const [lançamentos, setLançamentos] = useState([
    { id: 1, pessoaId: 1, tipo: 'he-60', data: '2024-01-15', horas: 2, minutos: 0, descricao: 'Sábado' },
    { id: 2, pessoaId: 2, tipo: 'atraso', data: '2024-01-16', horas: 0, minutos: 30, descricao: 'Atraso 30 min' }
  ]);

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
    const savedTabelaHE = localStorage.getItem('daxia_tabelaHE');
    const savedPessoas = localStorage.getItem('daxia_pessoas');
    const savedLançamentos = localStorage.getItem('daxia_lançamentos');

    if (savedTabelaHE) setTabelaHE(JSON.parse(savedTabelaHE));
    if (savedPessoas) setPessoas(JSON.parse(savedPessoas));
    if (savedLançamentos) setLançamentos(JSON.parse(savedLançamentos));

    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem('daxia_tabelaHE', JSON.stringify(tabelaHE));
  }, [tabelaHE, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem('daxia_pessoas', JSON.stringify(pessoas));
  }, [pessoas, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem('daxia_lançamentos', JSON.stringify(lançamentos));
  }, [lançamentos, isHydrated]);

  const lançamentosFiltrados = useMemo(() => {
    return lançamentos.filter(l => {
      const dentroData = l.data >= dataInicio && l.data <= dataFim;
      if (!dentroData) return false;
      if (setorFiltro === '') return true;
      const pessoa = pessoas.find(p => p.id === l.pessoaId);
      return pessoa?.setor === setorFiltro;
    });
  }, [lançamentos, dataInicio, dataFim, setorFiltro, pessoas]);

  const contarDiasUteis = (dataInStr, dataFimStr) => {
    const inicio = new Date(dataInStr);
    const fim = new Date(dataFimStr);
    let diasUteis = 0;
    
    for (let d = new Date(inicio); d <= fim; d.setDate(d.getDate() + 1)) {
      const diaSemana = d.getDay();
      if (diaSemana >= 1 && diaSemana <= 5) {
        diasUteis++;
      }
    }
    return diasUteis;
  };

  const dadosGraficoHE = useMemo(() => {
    const dados = {};
    lançamentosFiltrados
      .filter(l => l.tipo.includes('he'))
      .forEach(l => {
        if (!dados[l.data]) dados[l.data] = 0;
        const pessoa = pessoas.find(p => p.id === l.pessoaId);
        const tabela = tabelaHE[pessoa?.cargo];
        const valor = l.tipo === 'he-60' 
          ? (tabela?.he60 || 0) * l.horas 
          : (tabela?.he100 || 0) * l.horas;
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
    if (setorFiltro !== '') {
      pessoasNoFiltro = pessoas.filter(p => p.setor === setorFiltro);
    }

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
    return lançamentosFiltrados
      .filter(l => l.tipo.includes('he'))
      .reduce((acc, l) => {
        const pessoa = pessoas.find(p => p.id === l.pessoaId);
        const tabela = tabelaHE[pessoa?.cargo];
        const valor = l.tipo === 'he-60' 
          ? (tabela?.he60 || 0) * l.horas 
          : (tabela?.he100 || 0) * l.horas;
        return acc + valor;
      }, 0);
  };

  const topHEPessoas = useMemo(() => {
    const dados = {};
    lançamentosFiltrados.filter(l => l.tipo.includes('he')).forEach(l => {
      const pessoa = pessoas.find(p => p.id === l.pessoaId);
      if (!dados[l.pessoaId]) {
        dados[l.pessoaId] = { nome: pessoa?.nome, valor: 0 };
      }
      const tabela = tabelaHE[pessoa?.cargo];
      const valor = l.tipo === 'he-60' 
        ? (tabela?.he60 || 0) * l.horas 
        : (tabela?.he100 || 0) * l.horas;
      dados[l.pessoaId].valor += valor;
    });
    return Object.values(dados).sort((a, b) => b.valor - a.valor).slice(0, 10);
  }, [lançamentosFiltrados, pessoas, tabelaHE]);

  const bottomHEPessoas = useMemo(() => {
    const dados = {};
    pessoas.forEach(p => {
      dados[p.id] = { nome: p.nome, valor: 0 };
    });
    lançamentosFiltrados.filter(l => l.tipo.includes('he')).forEach(l => {
      const pessoa = pessoas.find(p => p.id === l.pessoaId);
      const tabela = tabelaHE[pessoa?.cargo];
      const valor = l.tipo === 'he-60' 
        ? (tabela?.he60 || 0) * l.horas 
        : (tabela?.he100 || 0) * l.horas;
      dados[l.pessoaId].valor += valor;
    });
    return Object.values(dados).sort((a, b) => a.valor - b.valor).slice(0, 10);
  }, [lançamentosFiltrados, pessoas, tabelaHE]);

  const topAbsenteismoPessoas = useMemo(() => {
    const dados = {};
    pessoas.forEach(p => {
      dados[p.id] = { nome: p.nome, valor: 0 };
    });
    lançamentosFiltrados.forEach(l => {
      if (l.tipo === 'falta-total' || l.tipo === 'atestado') {
        dados[l.pessoaId].valor += horasUteisDia;
      } else if (l.tipo === 'atestado-horas') {
        dados[l.pessoaId].valor += l.horas || horasUteisDia;
      } else if (l.tipo === 'atraso' && l.minutos > 10) {
        dados[l.pessoaId].valor += l.minutos / 60;
      } else if (l.tipo === 'saida-antecipada') {
        dados[l.pessoaId].valor += l.horas || horasUteisDia;
      }
    });
    return Object.values(dados).sort((a, b) => b.valor - a.valor).slice(0, 10);
  }, [lançamentosFiltrados, horasUteisDia, pessoas]);

  const bottomAbsenteismoPessoas = useMemo(() => {
    const dados = {};
    pessoas.forEach(p => {
      dados[p.id] = { nome: p.nome, valor: 0 };
    });
    lançamentosFiltrados.forEach(l => {
      if (l.tipo === 'falta-total' || l.tipo === 'atestado') {
        dados[l.pessoaId].valor += horasUteisDia;
      } else if (l.tipo === 'atestado-horas') {
        dados[l.pessoaId].valor += l.horas || horasUteisDia;
      } else if (l.tipo === 'atraso' && l.minutos > 10) {
        dados[l.pessoaId].valor += l.minutos / 60;
      } else if (l.tipo === 'saida-antecipada') {
        dados[l.pessoaId].valor += l.horas || horasUteisDia;
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

  const handleAdicionarPessoa = (e) => {
    e.preventDefault();
    if (!formPessoa.nome || formPessoa.nome.trim() === '') {
      alert('Preencha o nome!');
      return;
    }
    const novaId = Math.max(...pessoas.map(p => p.id), 0) + 1;
    setPessoas([...pessoas, { id: novaId, ...formPessoa }]);
    setFormPessoa({ nome: '', cargo: 'AJUDANTE GERAL', setor: 'Inbound' });
  };

  const handleAdicionarCargo = (e) => {
    e.preventDefault();
    if (!formCargo.nome || formCargo.nome.trim() === '') {
      alert('Preencha o nome do cargo!');
      return;
    }
    if (!formCargo.he60 || !formCargo.he100) {
      alert('Preencha os valores de HE!');
      return;
    }

    const nomeCargo = formCargo.nome.toUpperCase();
    
    if (tabelaHE[nomeCargo]) {
      alert('Este cargo já existe!');
      return;
    }

    setTabelaHE({
      ...tabelaHE,
      [nomeCargo]: {
        he60: parseFloat(formCargo.he60),
        he100: parseFloat(formCargo.he100)
      }
    });

    setFormCargo({ nome: '', he60: '', he100: '' });
    alert('✅ Cargo adicionado com sucesso!');
  };

  const handleDeletarCargo = (nomeCargo) => {
    if (pessoas.some(p => p.cargo === nomeCargo)) {
      alert('❌ Não é possível deletar! Existem pessoas cadastradas com este cargo.');
      return;
    }

    if (confirm(`Tem certeza que quer deletar o cargo "${nomeCargo}"?`)) {
      const novaTabela = { ...tabelaHE };
      delete novaTabela[nomeCargo];
      setTabelaHE(novaTabela);
      alert('✅ Cargo deletado com sucesso!');
    }
  };

  const handleAdicionarLançamento = (e) => {
    e.preventDefault();
    if (!formLançamento.data) {
      alert('Selecione uma data!');
      return;
    }

    const novaId = Math.max(...lançamentos.map(l => l.id), 0) + 1;
    
    let horas = formLançamento.horas;
    if (formLançamento.tipo === 'falta-total' || formLançamento.tipo === 'atestado') {
      horas = horasUteisDia;
    }

    const novoLançamento = {
      id: novaId,
      pessoaId: parseInt(formLançamento.pessoaId),
      tipo: formLançamento.tipo,
      data: formLançamento.data,
      horas: (formLançamento.tipo === 'he-60' || formLançamento.tipo === 'he-100' || formLançamento.tipo === 'atestado-horas' || formLançamento.tipo === 'saida-antecipada')
        ? parseFloat(formLançamento.horas) || 0 
        : horas,
      minutos: (formLançamento.tipo === 'atraso') ? parseInt(formLançamento.minutos) || 0 : 0,
      descricao: formLançamento.descricao
    };

    setLançamentos([...lançamentos, novoLançamento]);
    setFormLançamento({ 
      pessoaId: pessoas[0]?.id || 1, 
      tipo: 'he-60', 
      data: '', 
      horas: 0, 
      minutos: 0, 
      descricao: '' 
    });
  };

  const handleDeletarPessoa = (id) => {
    if (confirm('Tem certeza que quer deletar esta pessoa?')) {
      setPessoas(pessoas.filter(p => p.id !== id));
    }
  };

  const handleDeletarLançamento = (id) => {
    setLançamentos(lançamentos.filter(l => l.id !== id));
  };

  const handleExportarCSV = () => {
    const dados = lançamentos.map(l => {
      const pessoa = pessoas.find(p => p.id === l.pessoaId);
      const tabela = tabelaHE[pessoa?.cargo];
      const valor = l.tipo === 'he-60' 
        ? (tabela?.he60 || 0) * l.horas 
        : l.tipo === 'he-100' 
          ? (tabela?.he100 || 0) * l.horas 
          : 0;
      return {
        Pessoa: pessoa?.nome,
        Setor: pessoa?.setor,
        Cargo: pessoa?.cargo,
        Tipo: l.tipo,
        Data: new Date(l.data + 'T00:00:00').toLocaleDateString('pt-BR'),
        Horas: l.horas || (l.minutos + ' min'),
        'Valor (R$)': valor.toFixed(2)
      };
    });

    const headers = ['Pessoa', 'Setor', 'Cargo', 'Tipo', 'Data', 'Horas', 'Valor (R$)'];
    const csv = [
      headers.join(','),
      ...dados.map(row => 
        headers.map(header => {
          const valor = row[header];
          return typeof valor === 'string' && valor.includes(',') ? `"${valor}"` : valor;
        }).join(',')
      )
    ].join('\n');

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
    const labels = {
      'he-60': '⏰ HE 60%',
      'he-100': '⏰ HE 100%',
      'atraso': '🔴 Atraso',
      'atestado-horas': '📋 Atestado de Horas',
      'falta-total': '❌ Falta Total',
      'atestado': '📄 Atestado',
      'saida-antecipada': '🚪 Saída Antecipada',
    };
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
          <circle
            cx="60"
            cy="60"
            r="50"
            fill="none"
            stroke={barColor}
            strokeWidth="8"
            strokeDasharray={`${(percentage / 100) * 314.159} 314.159`}
            strokeLinecap="round"
            style={{
              transform: 'rotate(-90deg)',
              transformOrigin: '60px 60px',
              transition: 'stroke-dasharray 0.5s ease'
            }}
          />
          <text
            x="60"
            y="65"
            textAnchor="middle"
            fontSize="28"
            fontWeight="bold"
            fill="#111827"
          >
            {percentage.toFixed(0)}%
          </text>
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
          <p className="text-gray-600">Aguarde um momento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-5xl font-bold text-blue-600 mb-2">📊 Daxia People Analytics</h1>
            <p className="text-gray-600 text-lg">Controle de Absenteísmo e Horas Extras</p>
          </div>
          <button
            onClick={handleExportarCSV}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2"
          >
            📊 Exportar CSV
          </button>
        </div>

        {/* Abas */}
        <div className="flex gap-2 mb-8 border-b-2 border-gray-300 overflow-x-auto">
          <button
            onClick={() => setAbaAtiva('resumos')}
            className={`px-6 py-3 font-bold transition whitespace-nowrap ${
              abaAtiva === 'resumos'
                ? 'text-blue-600 border-b-4 border-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            📊 Resumos
          </button>
          <button
            onClick={() => setAbaAtiva('dashboard')}
            className={`px-6 py-3 font-bold transition whitespace-nowrap ${
              abaAtiva === 'dashboard'
                ? 'text-blue-600 border-b-4 border-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            📈 Dashboard
          </button>
          <button
            onClick={() => setAbaAtiva('lançamentos')}
            className={`px-6 py-3 font-bold transition whitespace-nowrap ${
              abaAtiva === 'lançamentos'
                ? 'text-blue-600 border-b-4 border-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            📝 Lançamentos
          </button>
          <button
            onClick={() => setAbaAtiva('configuracao')}
            className={`px-6 py-3 font-bold transition whitespace-nowrap ${
              abaAtiva === 'configuracao'
                ? 'text-blue-600 border-b-4 border-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            ⚙️ Configuração
          </button>
        </div>

        {/* ABA 1: RESUMOS */}
        {abaAtiva === 'resumos' && (
          <div>
            {/* Filtros */}
            <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
              <h2 className="text-xl font-bold text-gray-800 mb-4">🔍 Filtros</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">📅 Data Início</label>
                  <input
                    type="date"
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                    className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">📅 Data Fim</label>
                  <input
                    type="date"
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                    className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">🏢 Setor</label>
                  <select
                    value={setorFiltro}
                    onChange={(e) => setSetorFiltro(e.target.value)}
                    className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Todos os setores</option>
                    {setores.map(setor => (
                      <option key={setor} value={setor}>{setor}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* KPI Cards */}
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

            {/* Insights */}
            <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
              <h2 className="text-xl font-bold text-gray-800 mb-4">💡 Insights Automáticos</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {insights.map((insight, idx) => (
                  <div key={idx} className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-4 border-l-4 border-yellow-500">
                    <p className="text-gray-800 font-semibold">{insight}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Gráficos TOP 10 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Gráfico HE */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">💰 Top 10 HE por Data</h2>
                {dadosGraficoHE.length > 0 ? (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {dadosGraficoHE.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-700 w-16">{item.data}</span>
                        <div className="flex-1 bg-gray-200 rounded-full h-6 overflow-hidden">
                          <div
                            className="bg-blue-500 h-full flex items-center justify-end pr-2"
                            style={{ width: `${(item.valor / maxValorHE) * 100}%` }}
                          >
                            <span className="text-xs text-white font-bold">R$ {item.valor.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">Sem dados</p>
                )}
              </div>

              {/* Gráfico Absenteísmo */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">📉 Top 10 Absenteísmo por Data</h2>
                {dadosGraficoABS.length > 0 ? (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {dadosGraficoABS.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-700 w-16">{item.data}</span>
                        <div className="flex-1 bg-gray-200 rounded-full h-6 overflow-hidden">
                          <div
                            className="bg-red-500 h-full flex items-center justify-end pr-2"
                            style={{ width: `${(item.valor / maxValorABS) * 100}%` }}
                          >
                            <span className="text-xs text-white font-bold">{item.valor.toFixed(2)}h</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">Sem dados</p>
                )}
              </div>
            </div>

            {/* Rankings */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Top HE */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">🏆 Top 10 - Maior HE</h2>
                <div className="space-y-2">
                  {topHEPessoas.length > 0 ? topHEPessoas.map((p, idx) => (
                    <div key={idx} className="flex justify-between items-center p-2 bg-blue-50 rounded">
                      <span className="font-semibold text-gray-800">{idx + 1}. {p.nome}</span>
                      <span className="text-blue-600 font-bold">R$ {p.valor.toFixed(2)}</span>
                    </div>
                  )) : (
                    <p className="text-gray-500 text-center py-4">Sem dados</p>
                  )}
                </div>
              </div>

              {/* Top Absenteísmo */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">🏆 Top 10 - Maior Absenteísmo</h2>
                <div className="space-y-2">
                  {topAbsenteismoPessoas.length > 0 ? topAbsenteismoPessoas.map((p, idx) => (
                    <div key={idx} className="flex justify-between items-center p-2 bg-red-50 rounded">
                      <span className="font-semibold text-gray-800">{idx + 1}. {p.nome}</span>
                      <span className="text-red-600 font-bold">{p.valor.toFixed(1)}h</span>
                    </div>
                  )) : (
                    <p className="text-gray-500 text-center py-4">Sem dados</p>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Rankings */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Bottom HE */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">⭐ Top 10 - Menor HE</h2>
                <div className="space-y-2">
                  {bottomHEPessoas.length > 0 ? bottomHEPessoas.map((p, idx) => (
                    <div key={idx} className="flex justify-between items-center p-2 bg-green-50 rounded">
                      <span className="font-semibold text-gray-800">{idx + 1}. {p.nome}</span>
                      <span className="text-green-600 font-bold">R$ {p.valor.toFixed(2)}</span>
                    </div>
                  )) : (
                    <p className="text-gray-500 text-center py-4">Sem dados</p>
                  )}
                </div>
              </div>

              {/* Bottom Absenteísmo */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">⭐ Top 10 - Menor Absenteísmo</h2>
                <div className="space-y-2">
                  {bottomAbsenteismoPessoas.length > 0 ? bottomAbsenteismoPessoas.map((p, idx) => (
                    <div key={idx} className="flex justify-between items-center p-2 bg-green-50 rounded">
                      <span className="font-semibold text-gray-800">{idx + 1}. {p.nome}</span>
                      <span className="text-green-600 font-bold">{p.valor.toFixed(1)}h</span>
                    </div>
                  )) : (
                    <p className="text-gray-500 text-center py-4">Sem dados</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ABA 2: DASHBOARD */}
        {abaAtiva === 'dashboard' && (
          <div>
            {/* Velocímetros */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div className="bg-white rounded-lg shadow-lg">
                <Gauge value={totalHE} max={metaHE} label="HE vs Meta" />
              </div>
              <div className="bg-white rounded-lg shadow-lg">
                <Gauge value={abs.taxaAbs} max={metaAbsenteismo} label="Absenteísmo vs Meta" />
              </div>
            </div>

            {/* Summary Cards */}
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

            {/* Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className={`rounded-lg shadow-lg p-8 ${totalHE > metaHE ? 'bg-red-50 border-l-4 border-red-500' : 'bg-green-50 border-l-4 border-green-500'}`}>
                <h3 className="text-2xl font-bold text-gray-800 mb-4">📊 Status HE</h3>
                <p className={`text-lg font-semibold ${totalHE > metaHE ? 'text-red-600' : 'text-green-600'}`}>
                  {totalHE > metaHE ? '⚠️ Acima da Meta' : '✅ Dentro da Meta'}
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  {totalHE > metaHE 
                    ? `R$ ${(totalHE - metaHE).toFixed(2)} acima do esperado`
                    : `R$ ${(metaHE - totalHE).toFixed(2)} abaixo do esperado`
                  }
                </p>
              </div>

              <div className={`rounded-lg shadow-lg p-8 ${abs.taxaAbs > metaAbsenteismo ? 'bg-red-50 border-l-4 border-red-500' : 'bg-green-50 border-l-4 border-green-500'}`}>
                <h3 className="text-2xl font-bold text-gray-800 mb-4">📉 Status Absenteísmo</h3>
                <p className={`text-lg font-semibold ${abs.taxaAbs > metaAbsenteismo ? 'text-red-600' : 'text-green-600'}`}>
                  {abs.taxaAbs > metaAbsenteismo ? '⚠️ Acima da Meta' : '✅ Dentro da Meta'}
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  {abs.taxaAbs > metaAbsenteismo 
                    ? `${(abs.taxaAbs - metaAbsenteismo).toFixed(2)}% acima do esperado`
                    : `${(metaAbsenteismo - abs.taxaAbs).toFixed(2)}% abaixo do esperado`
                  }
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ABA 3: LANÇAMENTOS */}
        {abaAtiva === 'lançamentos' && (
          <div>
            {/* Formulário */}
            <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">📝 Registrar Lançamento</h2>
              <form onSubmit={handleAdicionarLançamento} className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <select
                  value={formLançamento.pessoaId}
                  onChange={(e) => setFormLançamento({ ...formLançamento, pessoaId: parseInt(e.target.value) })}
                  className="border-2 border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500"
                >
                  {pessoas.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nome} ({p.setor})
                    </option>
                  ))}
                </select>

                <select
                  value={formLançamento.tipo}
                  onChange={(e) => setFormLançamento({ ...formLançamento, tipo: e.target.value })}
                  className="border-2 border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500"
                >
                  <option value="he-60">⏰ HE 60%</option>
                  <option value="he-100">⏰ HE 100%</option>
                  <option value="atraso">🔴 Atraso</option>
                  <option value="falta-total">❌ Falta Total</option>
                  <option value="atestado-horas">📋 Atestado de Horas</option>
                  <option value="atestado">📄 Atestado</option>
                  <option value="saida-antecipada">🚪 Saída Antecipada</option>
                </select>

                <input
                  type="date"
                  value={formLançamento.data}
                  onChange={(e) => setFormLançamento({ ...formLançamento, data: e.target.value })}
                  className="border-2 border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500"
                  required
                />

                {(formLançamento.tipo === 'he-60' || formLançamento.tipo === 'he-100' || formLançamento.tipo === 'atestado-horas' || formLançamento.tipo === 'saida-antecipada') ? (
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    placeholder="Horas"
                    value={formLançamento.horas}
                    onChange={(e) => setFormLançamento({ ...formLançamento, horas: e.target.value })}
                    className="border-2 border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500"
                    required
                  />
                ) : (
                  <input
                    type="number"
                    min="0"
                    placeholder="Minutos"
                    value={formLançamento.minutos}
                    onChange={(e) => setFormLançamento({ ...formLançamento, minutos: e.target.value })}
                    className="border-2 border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500"
                  />
                )}

                <button 
                  type="submit" 
                  className="bg-blue-600 text-white rounded-lg px-6 py-3 font-bold hover:bg-blue-700"
                >
                  📤 Registrar
                </button>
              </form>
            </div>

            {/* Tabela */}
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
                        const pessoa = pessoas.find(p => p.id === l.pessoaId);
                        const tabela = tabelaHE[pessoa?.cargo];
                        const valor = l.tipo === 'he-60' 
                          ? (tabela?.he60 || 0) * l.horas 
                          : l.tipo === 'he-100' 
                            ? (tabela?.he100 || 0) * l.horas 
                            : 0;
                        
                        return (
                          <tr key={l.id} className={`border-b ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'} hover:bg-blue-50`}>
                            <td className="py-3 px-3 font-semibold text-gray-800">{getNomePessoa(l.pessoaId)}</td>
                            <td className="py-3 px-3 text-xs text-gray-600">{pessoa?.setor}</td>
                            <td className="py-3 px-3">
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${getTipoCor(l.tipo)}`}>
                                {getTipoLabel(l.tipo)}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-gray-800">{new Date(l.data + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                            <td className="py-3 px-3 font-bold text-blue-600">
                              {valor > 0 ? `R$ ${valor.toFixed(2)}` : '-'}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <button
                                onClick={() => handleDeletarLançamento(l.id)}
                                className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs font-bold"
                              >
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

        {/* ABA 4: CONFIGURAÇÃO */}
        {abaAtiva === 'configuracao' && (
          <div className="space-y-8">
            {/* Seção 1: Metas */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">🎯 Metas</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Meta de HE (R$)</label>
                  <input
                    type="number"
                    value={metaHE}
                    onChange={(e) => setMetaHE(parseInt(e.target.value) || 0)}
                    className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Meta Absenteísmo (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={metaAbsenteismo}
                    onChange={(e) => setMetaAbsenteismo(parseFloat(e.target.value) || 0)}
                    className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Seção 2: Horas Úteis */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">⏱️ Horas Úteis/Dia</h2>
              <div className="max-w-xs">
                <input
                  type="number"
                  min="1"
                  max="24"
                  value={horasUteisDia}
                  onChange={(e) => setHorasUteisDia(parseInt(e.target.value) || 10)}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                />
                <p className="text-xs text-gray-600 mt-2">⚠️ Cálculo usa apenas seg-sex (dias úteis)</p>
              </div>
            </div>

            {/* Seção 3: Cargo */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">➕ Novo Cargo</h2>
              <form onSubmit={handleAdicionarCargo} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <input
                  type="text"
                  placeholder="Nome do cargo"
                  value={formCargo.nome}
                  onChange={(e) => setFormCargo({ ...formCargo, nome: e.target.value })}
                  className="border-2 border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500"
                  required
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="HE 60% (R$)"
                  value={formCargo.he60}
                  onChange={(e) => setFormCargo({ ...formCargo, he60: e.target.value })}
                  className="border-2 border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500"
                  required
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="HE 100% (R$)"
                  value={formCargo.he100}
                  onChange={(e) => setFormCargo({ ...formCargo, he100: e.target.value })}
                  className="border-2 border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500"
                  required
                />
                <button 
                  type="submit" 
                  className="bg-green-600 text-white rounded-lg px-6 py-3 font-bold hover:bg-green-700"
                >
                  ✅ Adicionar
                </button>
              </form>
            </div>

            {/* Seção 4: Tabela de Cargos */}
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
                        <td className="py-4 px-4 text-center">
                          <button
                            onClick={() => handleDeletarCargo(cargo)}
                            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs font-bold"
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Seção 5: Colaborador */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">➕ Novo Colaborador</h2>
              <form onSubmit={handleAdicionarPessoa} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <input
                  type="text"
                  placeholder="Nome"
                  value={formPessoa.nome}
                  onChange={(e) => setFormPessoa({ ...formPessoa, nome: e.target.value })}
                  className="border-2 border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500"
                  required
                />
                <select
                  value={formPessoa.cargo}
                  onChange={(e) => setFormPessoa({ ...formPessoa, cargo: e.target.value })}
                  className="border-2 border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500"
                >
                  {cargosArray.map(cargo => (
                    <option key={cargo} value={cargo}>{cargo}</option>
                  ))}
                </select>
                <select
                  value={formPessoa.setor}
                  onChange={(e) => setFormPessoa({ ...formPessoa, setor: e.target.value })}
                  className="border-2 border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500"
                >
                  {setores.map(setor => (
                    <option key={setor} value={setor}>{setor}</option>
                  ))}
                </select>
                <button 
                  type="submit" 
                  className="bg-green-600 text-white rounded-lg px-6 py-3 font-bold hover:bg-green-700"
                >
                  ✅ Adicionar
                </button>
              </form>
            </div>

            {/* Seção 6: Tabela de Colaboradores */}
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
                          <td className="py-4 px-4 text-center">
                            <button
                              onClick={() => handleDeletarPessoa(p.id)}
                              className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs font-bold"
                            >
                              🗑️
                            </button>
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
      </div>
    </div>
  );
}
