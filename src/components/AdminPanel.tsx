/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Bolao, Partida, Palpite, Usuario } from '../types';
import { getTeamFlagUrl, formatBRL, formatLocalDate, exportToCSV } from '../utils';
import { Plus, Users, Hourglass, CheckCircle2, Award, Download, Tag, Calendar, ShieldCheck, Trophy, Filter, RefreshCw, XCircle } from 'lucide-react';

interface AdminPanelProps {
  boloes: Bolao[];
  partidas: Partida[];
  usuarios: Usuario[];
  palpites: Palpite[];
  onAddBolao: (bolao: Omit<Bolao, 'id'>) => void;
  onAddPartida: (partida: Omit<Partida, 'id' | 'bandeira_1' | 'bandeira_2' | 'resultado_oficial'>) => void;
  onUpdatePalpiteStatus: (palpiteId: string, status: 'CONFIRMADO' | 'REJEITADO') => void;
  onSetResultadoOficial: (partidaId: string, resultado: string | null) => void;
}

export default function AdminPanel({
  boloes,
  partidas,
  usuarios,
  palpites,
  onAddBolao,
  onAddPartida,
  onUpdatePalpiteStatus,
  onSetResultadoOficial,
}: AdminPanelProps) {
  // New Sweepstakes Form state
  const [newBolao, setNewBolao] = useState({
    nome: '',
    valor_palpite: 20,
    limite_palpites_iguais: 3,
    chave_pix: '',
    pix_copia_cola: '',
    recebedor_pix: '',
    data_inicio: new Date().toISOString().split('T')[0],
    data_fim: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  // New Match Form state
  const [newPartida, setNewPartida] = useState({
    bolao_id: boloes[0]?.id || '',
    selecao_1: '',
    selecao_2: '',
    data_partida: new Date().toISOString().split('T')[0],
    horario_partida: '19:00',
    horario_encerramento: new Date().toISOString().slice(0, 16) // datetime-local input
  });

  // Score simulation state
  const [matchScores, setMatchScores] = useState<Record<string, { g1: string, g2: string }>>({});

  // Active sub-tab
  const [activeTab, setActiveTab] = useState<'dashboard' | 'boloes' | 'partidas' | 'palpites'>('dashboard');

  // Filters state
  const [filterPartidaId, setFilterPartidaId] = useState<string>('todos');
  const [filterUsuarioTerm, setFilterUsuarioTerm] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('todos');

  // Info notification toast helper
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleCreateBolao = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBolao.nome || !newBolao.chave_pix || !newBolao.recebedor_pix) {
      alert("Por favor, preencha todos os campos obrigatórios do bolão!");
      return;
    }

    onAddBolao({
      nome: newBolao.nome,
      valor_palpite: Number(newBolao.valor_palpite),
      limite_palpites_iguais: Number(newBolao.limite_palpites_iguais),
      chave_pix: newBolao.chave_pix,
      pix_copia_cola: newBolao.pix_copia_cola || `00020101021126580014br.gov.bcb.pix0130${newBolao.chave_pix}5204000053039865405${newBolao.valor_palpite}.00`,
      recebedor_pix: newBolao.recebedor_pix,
      data_inicio: newBolao.data_inicio,
      data_fim: newBolao.data_fim
    });

    triggerToast(`Bolão "${newBolao.nome}" criado com sucesso!`);
    
    // reset form
    setNewBolao({
      nome: '',
      valor_palpite: 20,
      limite_palpites_iguais: 3,
      chave_pix: '',
      pix_copia_cola: '',
      recebedor_pix: '',
      data_inicio: new Date().toISOString().split('T')[0],
      data_fim: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    });
  };

  const handleCreatePartida = (e: React.FormEvent) => {
    e.preventDefault();
    const bid = newPartida.bolao_id || (boloes[0]?.id || '');
    if (!bid) {
      alert("Por favor, crie um bolão antes de cadastrar uma partida.");
      return;
    }
    if (!newPartida.selecao_1 || !newPartida.selecao_2) {
      alert("Por favor, preencha o nome de ambas as seleções.");
      return;
    }

    onAddPartida({
      bolao_id: bid,
      selecao_1: newPartida.selecao_1,
      selecao_2: newPartida.selecao_2,
      data_partida: newPartida.data_partida,
      horario_partida: newPartida.horario_partida,
      horario_encerramento: newPartida.horario_encerramento || `${newPartida.data_partida}T${newPartida.horario_partida}:00`
    });

    triggerToast(`Partida ${newPartida.selecao_1} x ${newPartida.selecao_2} cadastrada!`);

    // reset form
    setNewPartida(prev => ({
      ...prev,
      selecao_1: '',
      selecao_2: '',
    }));
  };

  const handleSetScore = (partidaId: string) => {
    const score = matchScores[partidaId];
    if (!score || score.g1 === '' || score.g2 === '') {
      alert("Por favor, informe os gols de ambos os times.");
      return;
    }
    const scoreString = `${score.g1}x${score.g2}`;
    onSetResultadoOficial(partidaId, scoreString);
    triggerToast(`Resultado definido: ${scoreString}. Vencedores calculados.`);
  };

  const handleClearScore = (partidaId: string) => {
    onSetResultadoOficial(partidaId, null);
    triggerToast(`Resultado da partida redefinido para Em Aberto.`);
  };

  // Stats Calculations
  const totalUsersCount = usuarios.length;
  const pendingGuesses = palpites.filter(p => p.status === 'PENDENTE');
  const approvedGuesses = palpites.filter(p => p.status === 'CONFIRMADO');
  
  // Accumulated prizes from CONFIRMADO guesses
  const totalArrecadado = approvedGuesses.reduce((acc, p) => acc + p.valor, 0);
  const totalPremios = totalArrecadado; // 100% of the confirmed guesses is pool prize

  // Count matches with set results
  const completedMatches = partidas.filter(m => m.resultado_oficial !== null);
  
  // Total overall winners calculation across all matches
  let totalWinnersCount = 0;
  completedMatches.forEach(match => {
    const matchGuesses = palpites.filter(p => p.partida_id === match.id && p.status === 'CONFIRMADO');
    const winners = matchGuesses.filter(p => p.resultado === match.resultado_oficial);
    totalWinnersCount += winners.length;
  });

  // Filtered Guesses List
  const filteredGuesses = palpites.filter(p => {
    // filter by match
    if (filterPartidaId !== 'todos' && p.partida_id !== filterPartidaId) return false;
    
    // filter by status
    if (filterStatus !== 'todos' && p.status !== filterStatus) return false;

    // filter by user name or phone
    if (filterUsuarioTerm.trim()) {
      const user = usuarios.find(u => u.id === p.usuario_id);
      if (!user) return false;
      const term = filterUsuarioTerm.toLowerCase();
      const matchName = user.nome_usuario.toLowerCase().includes(term);
      const matchPhone = user.celular.includes(term);
      if (!matchName && !matchPhone) return false;
    }

    return true;
  });

  // Export Filtered guesses to Excel (CSV with UTF-8 BOM compatibility)
  const handleExportCSV = () => {
    const headers = [
      "ID Palpite", 
      "Participante", 
      "Celular", 
      "Bolao", 
      "Partida", 
      "Palpite Lido", 
      "Valor (R$)", 
      "Status", 
      "Data/Hora Registro"
    ];

    const rows = filteredGuesses.map(p => {
      const user = usuarios.find(u => u.id === p.usuario_id);
      const match = partidas.find(m => m.id === p.partida_id);
      const pool = boloes.find(b => b.id === match?.bolao_id);

      return [
        p.id,
        user ? user.nome_usuario : 'N/A',
        user ? user.celular : 'N/A',
        pool ? pool.nome : 'N/A',
        match ? `${match.selecao_1} x ${match.selecao_2}` : 'N/A',
        p.resultado,
        p.valor.toString(),
        p.status,
        new Date(p.data_hora).toLocaleString('pt-BR')
      ];
    });

    exportToCSV("relatorio_palpites_bolao", headers, rows);
    triggerToast("Relatório de palpites exportado.");
  };

  return (
    <div id="admin-panel-container" className="space-y-6">
      
      {/* Toast Notification */}
      {toastMsg && (
        <div id="admin-toast" className="fixed bottom-4 right-4 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-bounce border border-emerald-500">
          <CheckCircle2 size={18} />
          <span className="text-sm font-medium">{toastMsg}</span>
        </div>
      )}

      {/* Admin Menu Tabs */}
      <div id="admin-menu-tabs" className="bg-slate-900 border border-slate-800 rounded-2xl p-2 flex flex-wrap gap-1">
        <button
          id="btn-tab-dashboard"
          onClick={() => setActiveTab('dashboard')}
          className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all min-w-[120px] ${
            activeTab === 'dashboard'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <ShieldCheck size={16} />
          Visão Geral
        </button>
        <button
          id="btn-tab-boloes"
          onClick={() => setActiveTab('boloes')}
          className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all min-w-[120px] ${
            activeTab === 'boloes'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Plus size={16} />
          Criar Bolão
        </button>
        <button
          id="btn-tab-partidas"
          onClick={() => setActiveTab('partidas')}
          className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all min-w-[120px] ${
            activeTab === 'partidas'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Calendar size={16} />
          Cadastrar Partida
        </button>
        <button
          id="btn-tab-palpites"
          onClick={() => setActiveTab('palpites')}
          className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all min-w-[120px] ${
            activeTab === 'palpites'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Hourglass size={16} />
          Aprovar Palpites ({pendingGuesses.length})
        </button>
      </div>

      {/* DASHBOARD TAB */}
      {activeTab === 'dashboard' && (
        <div id="tab-content-dashboard" className="space-y-6">
          
          {/* STATS GENERAL GRID */}
          <div id="stats-dashboard-grid" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div id="stat-card-users" className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Participantes</span>
                <Users size={18} className="text-blue-400" />
              </div>
              <div>
                <p id="stat-val-users" className="text-2xl font-bold text-white font-mono">{totalUsersCount}</p>
                <p className="text-[10px] text-slate-500 mt-1">Usuários cadastrados</p>
              </div>
            </div>

            <div id="stat-card-pending" className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Pendentes</span>
                <Hourglass size={18} className="text-amber-400" />
              </div>
              <div>
                <p id="stat-val-pending" className="text-2xl font-bold text-amber-400 font-mono">{pendingGuesses.length}</p>
                <p className="text-[10px] text-slate-500 mt-1">Aguardando PIX</p>
              </div>
            </div>

            <div id="stat-card-approved" className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Aprovados</span>
                <CheckCircle2 size={18} className="text-emerald-400" />
              </div>
              <div>
                <p id="stat-val-approved" className="text-2xl font-bold text-emerald-400 font-mono">{approvedGuesses.length}</p>
                <p className="text-[10px] text-slate-500 mt-1">Apostas validadas</p>
              </div>
            </div>

            <div id="stat-card-total-raised" className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Arrecadado</span>
                <Tag size={18} className="text-emerald-400" />
              </div>
              <div>
                <p id="stat-val-raised" className="text-xl font-bold text-emerald-400 font-mono">{formatBRL(totalArrecadado)}</p>
                <p className="text-[10px] text-slate-500 mt-1">Valor em caixa</p>
              </div>
            </div>

            <div id="stat-card-prize" className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Prêmio Acumulado</span>
                <Award size={18} className="text-purple-400" />
              </div>
              <div>
                <p id="stat-val-prize" className="text-xl font-bold text-purple-400 font-mono">{formatBRL(totalPremios)}</p>
                <p className="text-[10px] text-slate-500 mt-1">100% repassado</p>
              </div>
            </div>

            <div id="stat-card-winners" className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between col-span-2 md:col-span-1">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Vencedores</span>
                <Trophy size={18} className="text-yellow-400" />
              </div>
              <div>
                <p id="stat-val-winners" className="text-2xl font-bold text-yellow-400 font-mono">{totalWinnersCount}</p>
                <p className="text-[10px] text-slate-500 mt-1">Acertaram o placar</p>
              </div>
            </div>
          </div>

          {/* ACTIVE PARTIDAS GESTÃO (Set Score Oficial) */}
          <div id="admin-matches-management" className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Trophy className="text-emerald-400" size={20} />
                  Resultados Oficiais das Partidas
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Informe o placar oficial para calcular os vencedores instantaneamente</p>
              </div>
            </div>

            <div id="admin-matches-list" className="grid gap-4">
              {partidas.map(match => {
                const b = boloes.find(bl => bl.id === match.bolao_id);
                // Calculate match current stats
                const confirmedGuesses = palpites.filter(p => p.partida_id === match.id && p.status === 'CONFIRMADO');
                const matchWinners = match.resultado_oficial 
                  ? confirmedGuesses.filter(p => p.resultado === match.resultado_oficial)
                  : [];
                
                // Keep score input state localized
                const currentScoreG1 = matchScores[match.id]?.g1 ?? (match.resultado_oficial?.split('x')[0] || '');
                const currentScoreG2 = matchScores[match.id]?.g2 ?? (match.resultado_oficial?.split('x')[1] || '');

                return (
                  <div id={`manage-match-${match.id}`} key={match.id} className="bg-slate-950 border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700/80 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-800 text-amber-400 rounded-full">
                          {b?.nome || 'Bolão'}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">
                          {formatLocalDate(match.data_partida)} às {match.horario_partida}
                        </span>
                      </div>

                      {/* Display Match Countries */}
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <img src={match.bandeira_1} alt={match.selecao_1} className="w-8 h-5 object-cover rounded shadow" referrerPolicy="no-referrer" />
                          <span className="text-sm font-bold text-white">{match.selecao_1}</span>
                        </div>
                        <span className="text-xs text-slate-500 font-mono">VS</span>
                        <div className="flex items-center gap-2">
                          <img src={match.bandeira_2} alt={match.selecao_2} className="w-8 h-5 object-cover rounded shadow" referrerPolicy="no-referrer" />
                          <span className="text-sm font-bold text-white">{match.selecao_2}</span>
                        </div>
                      </div>

                      <div className="text-xs text-slate-400 flex items-center gap-2 flex-wrap">
                        <span>Apostas Confirmadas: <strong className="text-emerald-400 font-mono">{confirmedGuesses.length}</strong></span>
                        <span>•</span>
                        <span>Prêmio Acumulado Partida: <strong className="text-emerald-400 font-mono">{formatBRL(confirmedGuesses.length * (b?.valor_palpite || 0))}</strong></span>
                      </div>
                    </div>

                    {/* Result Reporting Controls */}
                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3 min-w-[280px]">
                      <span className="text-xs font-bold text-slate-400 block tracking-wider uppercase">Placar Oficial</span>
                      
                      <div className="flex items-center gap-2">
                        <input
                          id={`input-score-g1-${match.id}`}
                          type="number"
                          min="0"
                          max="9"
                          placeholder="Mandante"
                          value={currentScoreG1}
                          onChange={(e) => setMatchScores(prev => ({
                            ...prev,
                            [match.id]: { g1: e.target.value, g2: prev[match.id]?.g2 ?? (match.resultado_oficial?.split('x')[1] || '') }
                          }))}
                          disabled={match.resultado_oficial !== null}
                          className="w-16 text-center py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono text-lg font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-60"
                        />
                        <span className="text-slate-500 font-bold font-mono">X</span>
                        <input
                          id={`input-score-g2-${match.id}`}
                          type="number"
                          min="0"
                          max="9"
                          placeholder="Visitante"
                          value={currentScoreG2}
                          onChange={(e) => setMatchScores(prev => ({
                            ...prev,
                            [match.id]: { g1: prev[match.id]?.g1 ?? (match.resultado_oficial?.split('x')[0] || ''), g2: e.target.value }
                          }))}
                          disabled={match.resultado_oficial !== null}
                          className="w-16 text-center py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono text-lg font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-60"
                        />

                        {match.resultado_oficial === null ? (
                          <button
                            id={`btn-save-score-${match.id}`}
                            onClick={() => handleSetScore(match.id)}
                            className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer h-10"
                          >
                            <CheckCircle2 size={14} />
                            Salvar
                          </button>
                        ) : (
                          <button
                            id={`btn-reset-score-${match.id}`}
                            onClick={() => handleClearScore(match.id)}
                            className="flex-1 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 text-xs font-bold rounded-lg border border-rose-500/30 transition-all flex items-center justify-center gap-1 cursor-pointer h-10"
                            title="Refazer placar oficial"
                          >
                            <RefreshCw size={14} />
                            Refazer
                          </button>
                        )}
                      </div>

                      {/* Display evaluation outcome */}
                      {match.resultado_oficial !== null && (
                        <div id={`match-winners-report-${match.id}`} className="mt-2 bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-lg text-[11px] space-y-1 block">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-emerald-400">RESULTADO OFICIAL DECRETADO!</span>
                          </div>
                          <div className="text-white">
                            Placar: <strong className="font-mono text-emerald-300">{match.resultado_oficial}</strong>
                          </div>
                          <div className="text-slate-300 font-medium">
                            Vencedores identificados: <strong className="text-yellow-400 font-mono">{matchWinners.length}</strong>
                          </div>
                          {matchWinners.length > 0 ? (
                            <div className="text-slate-400 font-mono text-[10px] mt-1 italic">
                              Racha Individual: {formatBRL((confirmedGuesses.length * (b?.valor_palpite || 0)) / matchWinners.length)} por ganhador.
                            </div>
                          ) : (
                            <div className="text-slate-400 text-[10px] mt-1 italic">
                              Nenhum palpite acertou o placar. Prêmio acumulado!
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {partidas.length === 0 && (
                <div className="text-center py-8 bg-slate-950 border border-dashed border-slate-800 rounded-2xl text-slate-500">
                  <Calendar className="mx-auto mb-2 opacity-50" size={32} />
                  Nenhuma partida cadastrada. Visite a aba "Cadastrar Partida" para começar.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CREATE SWEEPSTAKES TAB */}
      {activeTab === 'boloes' && (
        <div id="tab-content-boloes" className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Plus className="text-emerald-400" size={20} />
              Configurar Novo Bolão de Futebol
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Preencha os valores, regras e dados bancários do PIX para arrecadação automatizada.</p>
          </div>

          <form id="form-create-bolao" onSubmit={handleCreateBolao} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Bolão Name */}
              <div className="space-y-1.5 col-span-2">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Nome do Bolão *</label>
                <input
                  id="bolao-input-name"
                  type="text"
                  required
                  placeholder="Ex: Bolão Geral Brasileirão 2026, Champions VIP..."
                  value={newBolao.nome}
                  onChange={(e) => setNewBolao({ ...newBolao, nome: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Price of Guesses */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Valor de cada Palpite (R$) *</label>
                <input
                  id="bolao-input-price"
                  type="number"
                  min="1"
                  required
                  placeholder="Ex: 20"
                  value={newBolao.valor_palpite}
                  onChange={(e) => setNewBolao({ ...newBolao, valor_palpite: Number(e.target.value) })}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Duplicate Limit */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block" title="Limite de palpites iguais permitidos para cada placar (ex: no máximo 3 pessoas podem chutar 2x1)">
                  Limite de Palpites Iguais por Placar (Vagas) *
                </label>
                <input
                  id="bolao-input-limit"
                  type="number"
                  min="1"
                  required
                  placeholder="Ex: 3"
                  value={newBolao.limite_palpites_iguais}
                  onChange={(e) => setNewBolao({ ...newBolao, limite_palpites_iguais: Number(e.target.value) })}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Chave PIX */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Chave PIX Recebedora *</label>
                <input
                  id="bolao-input-pix-key"
                  type="text"
                  required
                  placeholder="Ex: celular, e-mail, CNPJ ou chave aleatória"
                  value={newBolao.chave_pix}
                  onChange={(e) => setNewBolao({ ...newBolao, chave_pix: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Name of pix receiver */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Nome do Recebedor PIX *</label>
                <input
                  id="bolao-input-receiver"
                  type="text"
                  required
                  placeholder="Ex: João da Silva Santos"
                  value={newBolao.recebedor_pix}
                  onChange={(e) => setNewBolao({ ...newBolao, recebedor_pix: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* PIX Copia e Cola Code */}
              <div className="space-y-1.5 col-span-2">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Código PIX Copia e Cola (Opcional - Gerará código dinâmico caso vazio)</label>
                <textarea
                  id="bolao-input-copypaste"
                  rows={2}
                  placeholder="Cole aqui o código BR Code do PIX gerado no app do seu banco..."
                  value={newBolao.pix_copia_cola}
                  onChange={(e) => setNewBolao({ ...newBolao, pix_copia_cola: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Start Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Data de Início</label>
                <input
                  id="bolao-input-start"
                  type="date"
                  value={newBolao.data_inicio}
                  onChange={(e) => setNewBolao({ ...newBolao, data_inicio: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* End Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Data de Encerramento</label>
                <input
                  id="bolao-input-end"
                  type="date"
                  value={newBolao.data_fim}
                  onChange={(e) => setNewBolao({ ...newBolao, data_fim: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-end">
              <button
                id="btn-submit-bolao"
                type="submit"
                className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl shadow-lg transition-colors cursor-pointer flex items-center gap-2"
              >
                <Plus size={18} />
                Confirmar Criação do Bolão
              </button>
            </div>
          </form>

          {/* LIST CURRENT BOLOES */}
          <div id="admin-current-boloes-section" className="mt-8 pt-8 border-t border-slate-800">
            <h4 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">Bolões Ativos no Sistema</h4>
            <div id="admin-current-boloes" className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {boloes.map(b => (
                <div id={`bolao-card-${b.id}`} key={b.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-4">
                  <div>
                    <h5 className="font-bold text-white text-base">{b.nome}</h5>
                    <div className="grid grid-cols-2 gap-2 mt-3 text-xs text-slate-400">
                      <div>Val: <span className="text-emerald-400 font-bold">{formatBRL(b.valor_palpite)}</span></div>
                      <div>Limite placar: <span className="text-white font-mono font-bold">{b.limite_palpites_iguais} vagas</span></div>
                      <div className="col-span-2 text-[11px] truncate">Recebedor: <span className="text-white font-medium">{b.recebedor_pix}</span></div>
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-500 border-t border-slate-800/80 pt-2 flex justify-between">
                    <span>Início: {formatLocalDate(b.data_inicio)}</span>
                    <span>Término: {formatLocalDate(b.data_fim)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* REGISTER MATCH TAB */}
      {activeTab === 'partidas' && (
        <div id="tab-content-partidas" className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Calendar className="text-emerald-400" size={20} />
              Cadastrar Nova Partida Seleções / Clubes
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Informe as equipes. O sistema buscará as bandeiras representativas e calculará os prazos.</p>
          </div>

          <form id="form-create-partida" onSubmit={handleCreatePartida} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Select Bolão Parent */}
              <div className="space-y-1.5 col-span-2">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Vincular Partida ao Bolão *</label>
                <select
                  id="partida-input-bolao"
                  required
                  value={newPartida.bolao_id}
                  onChange={(e) => setNewPartida({ ...newPartida, bolao_id: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Selecione o bolão correspondente...</option>
                  {boloes.map(b => (
                    <option key={b.id} value={b.id}>{b.nome} ({formatBRL(b.valor_palpite)} / palpite)</option>
                  ))}
                </select>
              </div>

              {/* Team 1 (Mandante) */}
              <div className="space-y-1.5 bg-slate-950 p-4 border border-slate-800 rounded-2xl">
                <label className="text-xs font-bold text-emerald-400 uppercase tracking-wider block mb-2">Seleção 1 (Mandante) *</label>
                <input
                  id="partida-input-team1"
                  type="text"
                  required
                  placeholder="Ex: Brasil, França, Real Madrid..."
                  value={newPartida.selecao_1}
                  onChange={(e) => setNewPartida({ ...newPartida, selecao_1: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 mb-3"
                />
                {newPartida.selecao_1 && (
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <img
                      src={getTeamFlagUrl(newPartida.selecao_1)}
                      alt="Preview Mandante"
                      className="w-8 h-5 object-cover rounded shadow border border-slate-800"
                    />
                    <span>Bandeira auto-detectada</span>
                  </div>
                )}
              </div>

              {/* Team 2 (Visitante) */}
              <div className="space-y-1.5 bg-slate-950 p-4 border border-slate-800 rounded-2xl">
                <label className="text-xs font-bold text-emerald-400 uppercase tracking-wider block mb-2">Seleção 2 (Visitante) *</label>
                <input
                  id="partida-input-team2"
                  type="text"
                  required
                  placeholder="Ex: Argentina, Alemanha, Barcelona..."
                  value={newPartida.selecao_2}
                  onChange={(e) => setNewPartida({ ...newPartida, selecao_2: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 mb-3"
                />
                {newPartida.selecao_2 && (
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <img
                      src={getTeamFlagUrl(newPartida.selecao_2)}
                      alt="Preview Visitante"
                      className="w-8 h-5 object-cover rounded shadow border border-slate-800"
                    />
                    <span>Bandeira auto-detectada</span>
                  </div>
                )}
              </div>

              {/* Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Data da Partida *</label>
                <input
                  id="partida-input-date"
                  type="date"
                  required
                  value={newPartida.data_partida}
                  onChange={(e) => setNewPartida({ ...newPartida, data_partida: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Time */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Horário da Partida (Ex: 16:00) *</label>
                <input
                  id="partida-input-time"
                  type="text"
                  required
                  placeholder="Ex: 21:30"
                  value={newPartida.horario_partida}
                  onChange={(e) => setNewPartida({ ...newPartida, horario_partida: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Limit Hour for betting */}
              <div className="space-y-1.5 col-span-2">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Data e Horário Limite para Palpites *</label>
                <input
                  id="partida-input-deadline"
                  type="datetime-local"
                  required
                  value={newPartida.horario_encerramento}
                  onChange={(e) => setNewPartida({ ...newPartida, horario_encerramento: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-[10px] text-slate-500 italic block mt-1">Normalmente configurado para 15 minutos antes do apito inicial.</span>
              </div>

            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-end">
              <button
                id="btn-submit-partida"
                type="submit"
                className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl shadow-lg transition-colors cursor-pointer flex items-center gap-2"
              >
                <Plus size={18} />
                Confirmar Cadastro da Partida
              </button>
            </div>
          </form>
        </div>
      )}

      {/* GUESSES APPROVALS AND STATS FILTERS */}
      {activeTab === 'palpites' && (
        <div id="tab-content-palpites" className="space-y-6">
          
          {/* SEARCH FILTERS AND CONTROLS */}
          <div id="admin-guesses-filters" className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Filter className="text-emerald-400" size={20} />
                  Filtros de Palpites & Exportação
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Gerencie os status e exporte relatórios integrados para o Microsoft Excel.</p>
              </div>
              
              <button
                id="btn-export-reports"
                onClick={handleExportCSV}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer flex items-center gap-1.5 self-start lg:self-center"
              >
                <Download size={14} />
                Exportar Planilha Excel (CSV)
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Filter by Match selection */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Por Partida</label>
                <select
                  id="filter-select-match"
                  value={filterPartidaId}
                  onChange={(e) => setFilterPartidaId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="todos">Todas as partidas</option>
                  {partidas.map(m => (
                    <option key={m.id} value={m.id}>{m.selecao_1} x {m.selecao_2}</option>
                  ))}
                </select>
              </div>

              {/* Filter by user search */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Por Nome ou Celular</label>
                <input
                  id="filter-input-username"
                  type="text"
                  placeholder="Buscar participante..."
                  value={filterUsuarioTerm}
                  onChange={(e) => setFilterUsuarioTerm(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Filter by status */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Por Status</label>
                <select
                  id="filter-select-status"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="todos">Todos os status</option>
                  <option value="PENDENTE">Apenas Pendentes (Aguardando PIX)</option>
                  <option value="CONFIRMADO">Aprovados / Confirmados</option>
                  <option value="REJEITADO">Rejeitados</option>
                </select>
              </div>
            </div>
          </div>

          {/* LIST FOR APPROVING GUESSES */}
          <div id="admin-guesses-approval-list" className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
            <h3 className="text-base font-bold text-white mb-4">
              Palpites Filtrados ({filteredGuesses.length})
            </h3>

            <div className="overflow-x-auto">
              <table id="table-pending-bets" className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-xs text-slate-400 uppercase font-bold">
                    <th className="pb-3 text-slate-300">Participante</th>
                    <th className="pb-3 text-slate-300">Partida</th>
                    <th className="pb-3 text-slate-200 text-center">Placar Chutado</th>
                    <th className="pb-3 text-slate-300">Preço / Estorno</th>
                    <th className="pb-3 text-slate-300">Status</th>
                    <th className="pb-3 text-right text-slate-300">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {filteredGuesses.map(p => {
                    const u = usuarios.find(usr => usr.id === p.usuario_id);
                    const m = partidas.find(pt => pt.id === p.partida_id);
                    const isWinner = m?.resultado_oficial !== null && p.resultado === m?.resultado_oficial && p.status === 'CONFIRMADO';

                    return (
                      <tr id={`row-palpite-${p.id}`} key={p.id} className="hover:bg-slate-950/40 transition-colors">
                        {/* Participant Details */}
                        <td className="py-4 pr-3">
                          <div className="font-bold text-white">{u?.nome_usuario || 'Participante'}</div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">{u?.celular || 'N/A'}</div>
                        </td>

                        {/* Match Details */}
                        <td className="py-4 pr-3">
                          {m ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                <img src={m.bandeira_1} alt="" className="w-4 h-3 object-cover rounded-sm" referrerPolicy="no-referrer" />
                                <span className="font-medium text-slate-300">{m.selecao_1}</span>
                                <span className="text-slate-500 font-mono text-[10px]">x</span>
                                <img src={m.bandeira_2} alt="" className="w-4 h-3 object-cover rounded-sm" referrerPolicy="no-referrer" />
                                <span className="font-medium text-slate-300">{m.selecao_2}</span>
                              </div>
                              <div className="text-[9px] text-slate-500">
                                {formatLocalDate(m.data_partida)} às {m.horario_partida}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-rose-400">Partida Deletada</span>
                          )}
                        </td>

                        {/* Scored result tag */}
                        <td className="py-4 pr-3 text-center">
                          <span id={`row-score-${p.id}`} className="inline-block px-3 py-1 bg-slate-950 text-emerald-400 font-bold font-mono text-sm rounded-lg border border-emerald-500/10">
                            {p.resultado}
                          </span>
                        </td>

                        {/* Amount */}
                        <td className="py-4 pr-3 font-mono text-white">
                          {formatBRL(p.valor)}
                        </td>

                        {/* Status Label */}
                        <td className="py-4 pr-3">
                          {p.status === 'PENDENTE' && (
                            <span id={`status-badge-pending-${p.id}`} className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-500/15 text-amber-400 rounded-full font-semibold font-sans text-[10px] border border-amber-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                              Aguardando PIX
                            </span>
                          )}
                          {p.status === 'CONFIRMADO' && (
                            <span id={`status-badge-confirm-${p.id}`} className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-500/15 text-emerald-400 rounded-full font-semibold font-sans text-[10px] border border-emerald-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                              Confirmado
                            </span>
                          )}
                          {p.status === 'REJEITADO' && (
                            <span id={`status-badge-reject-${p.id}`} className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-rose-500/15 text-rose-400 rounded-full font-semibold font-sans text-[10px] border border-rose-500/20">
                              Placar Rejeitado
                            </span>
                          )}
                          {isWinner && (
                            <div className="mt-1">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-yellow-500/15 text-yellow-400 rounded-full font-bold font-sans text-[9px] border border-yellow-500/30">
                                🏆 Vencedor
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Actions Button */}
                        <td className="py-4 text-right space-x-1.5">
                          {p.status === 'PENDENTE' ? (
                            <div className="inline-flex gap-1.5">
                              <button
                                id={`btn-approve-guess-${p.id}`}
                                onClick={() => onUpdatePalpiteStatus(p.id, 'CONFIRMADO')}
                                className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-lg cursor-pointer text-[10px] flex items-center gap-1"
                              >
                                <CheckCircle2 size={12} />
                                Aprovar PIX
                              </button>
                              <button
                                id={`btn-reject-guess-${p.id}`}
                                onClick={() => onUpdatePalpiteStatus(p.id, 'REJEITADO')}
                                className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold rounded-lg cursor-pointer text-[10px] flex items-center gap-1 border border-rose-500/25"
                              >
                                <XCircle size={12} />
                                Rejeitar
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {filteredGuesses.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-slate-500">
                        Nenhum palpite pendente ou aprovado com as configurações de filtros atuais.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
