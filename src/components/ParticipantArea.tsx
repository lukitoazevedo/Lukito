/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Bolao, Partida, Palpite, Usuario, Notificacao } from '../types';
import { formatBRL, formatLocalDate } from '../utils';
import { User, Phone, Trophy, Coins, Copy, Check, Clock, Calendar, HelpCircle, Bell, Sparkles, Filter } from 'lucide-react';

interface ParticipantAreaProps {
  boloes: Bolao[];
  partidas: Partida[];
  usuarios: Usuario[];
  palpites: Palpite[];
  currentUser: Usuario | null;
  notificacoes: Notificacao[];
  onLogin: (nome: string, celular: string) => void;
  onLogout: () => void;
  onAddPalpite: (partidaId: string, resultado: string) => void;
  onMarkNotificationsAsRead: (userId: string) => void;
}

export default function ParticipantArea({
  boloes,
  partidas,
  usuarios,
  palpites,
  currentUser,
  notificacoes,
  onLogin,
  onLogout,
  onAddPalpite,
  onMarkNotificationsAsRead,
}: ParticipantAreaProps) {
  // Input fields for identity
  const [nomeInput, setNomeInput] = useState('');
  const [celularInput, setCelularInput] = useState('');

  // Sorter / Active sweepstakes and match selection
  const [selectedBolaoId, setSelectedBolaoId] = useState<string>('');
  const [selectedPartidaId, setSelectedPartidaId] = useState<string>('');

  // Score selection matching key-value "G1xG2"
  const [selectedScore, setSelectedScore] = useState<string | null>(null);

  // Success state after submitting
  const [successPalpite, setSuccessPalpite] = useState<{
    id: string;
    resultado: string;
    valor: number;
    bolaoNome: string;
    partidaDesc: string;
    pixCopiaCola: string;
    chavePix: string;
    recebedor: string;
  } | null>(null);

  // Clipboard feedback state
  const [copiarFeedback, setCopiarFeedback] = useState(false);

  // Auto-select first Bolão & Partida on load
  useEffect(() => {
    if (boloes.length > 0 && !selectedBolaoId) {
      setSelectedBolaoId(boloes[0].id);
    }
  }, [boloes, selectedBolaoId]);

  useEffect(() => {
    if (selectedBolaoId) {
      const activeMatches = partidas.filter(m => m.bolao_id === selectedBolaoId);
      if (activeMatches.length > 0) {
        setSelectedPartidaId(activeMatches[0].id);
      } else {
        setSelectedPartidaId('');
      }
    }
  }, [selectedBolaoId, partidas]);

  // Read current bolão and match data
  const currentBolao = boloes.find(b => b.id === selectedBolaoId);
  const currentPartida = partidas.find(m => m.id === selectedPartidaId);

  // Filter relevant notifications
  const userNotifications = currentUser 
    ? notificacoes.filter(n => n.usuario_id === currentUser.id)
    : [];
  const unreadNotifications = userNotifications.filter(n => !n.lida);

  // Read matching values for active match countdown
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isExpired, setIsExpired] = useState<boolean>(false);

  useEffect(() => {
    if (!currentPartida) return;

    const interval = setInterval(() => {
      const deadline = new Date(currentPartida.horario_encerramento).getTime();
      const now = new Date().getTime();
      const difference = deadline - now;

      if (difference <= 0) {
        setTimeLeft('Palpites Encerrados');
        setIsExpired(true);
        clearInterval(interval);
      } else {
        setIsExpired(false);
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        let countdownString = '';
        if (days > 0) countdownString += `${days}d `;
        countdownString += `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        setTimeLeft(countdownString);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [currentPartida]);

  // Handle Login
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeInput.trim() || !celularInput.trim()) {
      alert("Por favor, preencha o seu nome e telefone celular para continuar.");
      return;
    }
    onLogin(nomeInput.trim(), celularInput.trim());
  };

  // Matrix generation grid values (0 to 5)
  // Consists of 36 combinations (0x0 ... 5x5)
  const scoreGrid: string[] = [];
  for (let h = 0; h <= 5; h++) {
    for (let a = 0; a <= 5; a++) {
      scoreGrid.push(`${h}x${a}`);
    }
  }

  // Calculate score occupancy details for selectedPartida
  const getScoreStatus = (score: string) => {
    if (!selectedPartidaId || !currentBolao) return { count: 0, spotsLeft: 0, isSoldOut: false };
    
    // Find all validated or pending guesses registered for this match and score
    // Let's count both CONFIRMADO and PENDENTE models to secure slots instantly
    const matchGuesses = palpites.filter(
      p => p.partida_id === selectedPartidaId && p.resultado === score && p.status !== 'REJEITADO'
    );
    const count = matchGuesses.length;
    const limit = currentBolao.limite_palpites_iguais;
    const spotsLeft = Math.max(0, limit - count);
    const isSoldOut = spotsLeft === 0;

    return { count, spotsLeft, isSoldOut };
  };

  // Submitting the guess
  const handleConfirmPalpite = () => {
    if (!currentUser) {
      alert("Sua sessão expirou. Por favor, registre-se novamente.");
      return;
    }
    if (!selectedPartidaId || !selectedScore || !currentBolao || !currentPartida) {
      alert("Selecione um palpite válido na matriz.");
      return;
    }

    // Double check availability
    const { isSoldOut } = getScoreStatus(selectedScore);
    if (isSoldOut) {
      alert("Lamento! Este resultado esgotou o limite permitido.");
      return;
    }

    // Invoke action handler
    onAddPalpite(selectedPartidaId, selectedScore);

    // Save summary details to display PIX sheet
    setSuccessPalpite({
      id: Math.random().toString(36).substr(2, 6).toUpperCase(), // dynamic synthetic ref
      resultado: selectedScore,
      valor: currentBolao.valor_palpite,
      bolaoNome: currentBolao.nome,
      partidaDesc: `${currentPartida.selecao_1} x ${currentPartida.selecao_2}`,
      pixCopiaCola: currentBolao.pix_copia_cola,
      chavePix: currentBolao.chave_pix,
      recebedor: currentBolao.recebedor_pix
    });

    // Reset selector
    setSelectedScore(null);
  };

  // Copying PIX value code
  const handleCopyPix = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiarFeedback(true);
      setTimeout(() => setCopiarFeedback(false), 3000);
    });
  };

  // Calculate accumulated prize pool across active Bolão
  const getAccumulatedPrizeValue = (bolaoId: string) => {
    const b = boloes.find(bl => bl.id === bolaoId);
    if (!b) return 0;
    const approvedCount = palpites.filter(
      p => p.status === 'CONFIRMADO' && partidas.find(m => m.id === p.partida_id && m.bolao_id === bolaoId)
    ).length;
    return approvedCount * b.valor_palpite;
  };

  // Filter historical user guesses
  const clientGuesses = currentUser
    ? palpites.filter(p => p.usuario_id === currentUser.id)
    : [];

  return (
    <div id="participant-area-container" className="space-y-6">

      {/* DYNAMIC TOP PERMANENT PRIZE BAR */}
      <div id="participant-prize-pool-bar" className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-3xl p-6 text-slate-950 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-white/15 p-3 rounded-2xl flex items-center justify-center">
            <Trophy size={32} className="text-yellow-300" />
          </div>
          <div>
            <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-950 block">PRÊMIO ACUMULADO ATUAL</span>
            <span id="header-prize-value" className="text-3xl font-black font-mono tracking-tight text-white">
              {formatBRL(getAccumulatedPrizeValue(selectedBolaoId || boloes[0]?.id))}
            </span>
          </div>
        </div>
        
        {currentBolao && (
          <div className="bg-slate-950/20 px-4 py-2.5 rounded-xl border border-white/10 text-right">
            <span className="text-[10px] font-bold block text-emerald-200">INVESTIMENTO POR PALPITE</span>
            <span className="text-lg font-extrabold text-white font-mono">{formatBRL(currentBolao.valor_palpite)}</span>
          </div>
        )}
      </div>

      {/* SECTION 1: MANDATORY REGISTER IF NOT AUTHENTICATED */}
      {!currentUser ? (
        <div id="participant-auth-card" className="bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-3xl space-y-6 max-w-xl mx-auto text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <User size={32} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Participe dos Bolões Ativos</h3>
            <p className="text-xs text-slate-400 mt-2 max-w-md mx-auto">
              Para registrar e validar palpites na matriz, você precisa informar seu nome e número de whatsapp.
            </p>
          </div>

          <form id="form-participant-login" onSubmit={handleLoginSubmit} className="space-y-4 text-left">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Seu Nome Completo *</label>
              <div className="relative">
                <span className="absolute left-4 top-3.5 text-slate-500">
                  <User size={16} />
                </span>
                <input
                  id="auth-input-name"
                  type="text"
                  required
                  placeholder="Seu nome completo"
                  value={nomeInput}
                  onChange={(e) => setNomeInput(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Número do Celular (com DDD) *</label>
              <div className="relative">
                <span className="absolute left-4 top-3.5 text-slate-500">
                  <Phone size={16} />
                </span>
                <input
                  id="auth-input-cellphone"
                  type="tel"
                  required
                  placeholder="Ex: 71999999999"
                  value={celularInput}
                  onChange={(e) => setCelularInput(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-mono"
                />
              </div>
              <span className="text-[10px] text-slate-500 italic block">Somente números, incluindo o DDD. Requerido para receber premiações.</span>
            </div>

            <button
              id="btn-confirm-auth"
              type="submit"
              className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl shadow-lg transition-colors cursor-pointer text-sm"
            >
              Começar a Palpitar agora!
            </button>
          </form>
        </div>
      ) : (
        /* PARTICIPANT CONSOLE SCREEN */
        <div id="participant-dashboard-console" className="space-y-6">

          {/* USER WELCOME HEADER WITH NOTIFICATION BADGE */}
          <div id="participant-welcome-top" className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                {currentUser.nome_usuario[0].toUpperCase()}
              </span>
              <div>
                <p className="text-sm font-bold text-white">Olá, {currentUser.nome_usuario}!</p>
                <p className="text-[11px] text-slate-400 font-mono">Whatsapp cadastrado: {currentUser.celular}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {/* Notification Hub Drawer Toggle */}
              {userNotifications.length > 0 && (
                <div id="notif-dropdown-trigger" className="relative">
                  <button
                    onClick={() => onMarkNotificationsAsRead(currentUser.id)}
                    className="p-2 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl text-slate-400 transition-colors flex items-center justify-center cursor-pointer"
                    title="Notificações"
                  >
                    <Bell size={18} className={unreadNotifications.length > 0 ? "text-amber-400 animate-swing" : ""} />
                    {unreadNotifications.length > 0 && (
                      <span id="notif-count-badge" className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-amber-500 text-slate-950 text-[9px] font-black rounded-full leading-none">
                        {unreadNotifications.length}
                      </span>
                    )}
                  </button>
                </div>
              )}

              <button
                id="btn-logout"
                onClick={onLogout}
                className="px-3.5 py-1.5 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-rose-400 border border-slate-800 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Sair
              </button>
            </div>
          </div>

          {/* NOTIFICATION LOG VIEW */}
          {unreadNotifications.length > 0 && (
            <div id="active-alert-box" className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-2xl animate-fade-in divide-y divide-emerald-500/10 space-y-2">
              <div className="flex items-center gap-2 mb-1.5">
                <Bell size={14} className="text-emerald-400 animate-bounce" />
                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest">Confirmações do Admin</span>
              </div>
              {unreadNotifications.map(n => (
                <div key={n.id} className="pt-2 text-xs text-white">
                  "{n.mensagem}"
                  <span className="block text-[9px] text-slate-400 mt-1 font-mono">
                    {new Date(n.data_hora).toLocaleTimeString('pt-BR')}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* SELECTION MATRIX FOR CURRENT BETS */}
          <div id="bet-selection-matrix-panel" className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
            
            {/* SELECTORS FOR BOLOES AND ACTIVE MATCH */}
            <div id="selectors-grid" className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest block">1. Escolha o Bolão</label>
                <select
                  id="user-select-bolao"
                  value={selectedBolaoId}
                  onChange={(e) => setSelectedBolaoId(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                >
                  {boloes.map(b => (
                    <option key={b.id} value={b.id}>{b.nome} — Palpite: {formatBRL(b.valor_palpite)}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest block font-sans">2. Partida do Bolão</label>
                <select
                  id="user-select-match"
                  value={selectedPartidaId}
                  onChange={(e) => setSelectedPartidaId(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-xs"
                >
                  <option value="">Selecione uma partida...</option>
                  {partidas
                    .filter(m => m.bolao_id === selectedBolaoId)
                    .map(m => (
                      <option key={m.id} value={m.id}>
                        {m.selecao_1} x {m.selecao_2} ({formatLocalDate(m.data_partida)} às {m.horario_partida}) {m.resultado_oficial ? `[Encerrado: ${m.resultado_oficial}]` : ''}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* COMPARTILHAR LINK DO BOLÃO */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-emerald-400 block flex items-center gap-1.5">
                  <Sparkles size={14} className="text-amber-400 animate-pulse" />
                  📢 Convide mais Participantes!
                </span>
                <span className="text-[11px] text-slate-400 block leading-tight">
                  Gere um link direto para convidar seus amigos para darem palpites. Eles não terão acesso ao menu administrativo.
                </span>
              </div>
              <button
                id="btn-share-pool-link"
                onClick={() => {
                  const shareUrl = `${window.location.origin}${window.location.pathname}?shared=true`;
                  navigator.clipboard.writeText(shareUrl).then(() => {
                    alert("✅ Link do Bolão copiado! Compartilhe o link no WhatsApp. Amigos que usarem este link não terão acesso ao painel de administração.");
                  });
                }}
                className="px-4 py-2 bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-800 text-xs font-extrabold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Copy size={13} className="text-emerald-400" />
                Copiar Link Seguro
              </button>
            </div>

            {/* PRESENTING ACTIVE PARTIDA DETAILS WITH COUNTDOWN */}
            {currentPartida ? (
              <div id="active-match-hero-card" className="bg-slate-950 border border-slate-800/80 rounded-2xl p-6 space-y-4">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-slate-900 pb-4">
                  <div className="flex items-center gap-2">
                    <Calendar size={15} className="text-slate-500" />
                    <span className="text-xs text-slate-400 font-medium font-mono">
                      Data da Partida: {formatLocalDate(currentPartida.data_partida)} às {currentPartida.horario_partida}
                    </span>
                  </div>

                  {/* Countdown Ticker */}
                  <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
                    <Clock size={14} className="text-amber-400" />
                    <span className="text-[11px] text-slate-400 uppercase tracking-wider font-extrabold">Fecha palpites em:</span>
                    <span id="countdown-timer-val" className={`font-mono text-sm font-bold ${isExpired ? 'text-rose-500' : 'text-amber-400 animate-pulse'}`}>
                      {timeLeft}
                    </span>
                  </div>
                </div>

                {/* Match Visual flags and names */}
                <div className="flex flex-row items-center justify-center gap-8 md:gap-16 py-4">
                  {/* Team 1 */}
                  <div className="flex flex-col items-center gap-2 text-center flex-1">
                    <img
                      src={currentPartida.bandeira_1}
                      alt={currentPartida.selecao_1}
                      className="w-16 h-10 md:w-20 md:h-12 object-cover rounded-md shadow-lg border border-slate-800"
                      referrerPolicy="no-referrer"
                    />
                    <span className="text-sm md:text-base font-black text-white">{currentPartida.selecao_1}</span>
                  </div>

                  {/* VS Symbol */}
                  <div className="text-center">
                    <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-slate-900 border border-slate-800 text-slate-500 font-mono text-xs font-black">
                      X
                    </span>
                  </div>

                  {/* Team 2 */}
                  <div className="flex flex-col items-center gap-2 text-center flex-1">
                    <img
                      src={currentPartida.bandeira_2}
                      alt={currentPartida.selecao_2}
                      className="w-16 h-10 md:w-20 md:h-12 object-cover rounded-md shadow-lg border border-slate-800"
                      referrerPolicy="no-referrer"
                    />
                    <span className="text-sm md:text-base font-black text-white">{currentPartida.selecao_2}</span>
                  </div>
                </div>

                {currentPartida.resultado_oficial && (
                  <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl text-center">
                    <span className="text-xs uppercase tracking-widest text-yellow-300 font-bold block mb-1">PARTIDA ENCERRADA</span>
                    <span className="text-2xl font-black text-white font-mono">Placar: {currentPartida.resultado_oficial}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6 text-slate-500">
                Selecione ou adicione uma partida válida para exibir.
              </div>
            )}

            {/* PALPITES MATRIX (GRID 6x6) */}
            {currentPartida && !currentPartida.resultado_oficial && (
              <div id="participant-matrix-deck" className="space-y-4">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <Sparkles className="text-emerald-400" size={16} />
                    Matriz de Palpites Rápidos (0x0 a 5x5)
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    Escolha uma das combinações de gols abaixo. Resultados em <strong className="text-slate-300">escuro</strong> alcançaram o limite ou estão concorridos. 
                    Gols: <strong className="text-slate-300">[Mandante] x [Visitante]</strong>.
                  </p>
                </div>

                {/* Score cells matrix */}
                <div id="guesses-matrix" className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
                  {scoreGrid.map(score => {
                    const { spotsLeft, isSoldOut } = getScoreStatus(score);
                    const isSelected = selectedScore === score;
                    const maxLimit = currentBolao?.limite_palpites_iguais || 3;

                    // Click handler
                    const handleSelectCell = () => {
                      if (isExpired) {
                        alert("Não é mais possível apostar! O prazo limite se encerrou.");
                        return;
                      }
                      if (isSoldOut) {
                        alert("Este placar atingiu o limite de participantes permitidos para este bolão!");
                        return;
                      }
                      setSelectedScore(isSelected ? null : score);
                    };

                    return (
                      <button
                        id={`matrix-score-cell-${score}`}
                        key={score}
                        disabled={isExpired}
                        onClick={handleSelectCell}
                        className={`py-3 px-2 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer select-none text-center relative ${
                          isSelected
                            ? 'bg-emerald-500 border-emerald-500 text-slate-950 scale-105 font-bold shadow-xl shadow-emerald-500/20'
                            : isSoldOut
                            ? 'bg-slate-950 border-slate-950 text-slate-600 cursor-not-allowed'
                            : spotsLeft < maxLimit
                            ? 'bg-slate-800/60 border-slate-700/50 text-slate-200 hover:border-slate-500' // used but available
                            : 'bg-white border-slate-200 text-slate-950 hover:bg-slate-50 hover:border-slate-400' // completely empty/available
                        }`}
                      >
                        {/* Score Text */}
                        <span className="text-sm font-extrabold font-mono tracking-wider">{score}</span>
                        
                        {/* Occupancy Indicator */}
                        {isSoldOut ? (
                          <span className="text-[9px] font-sans font-bold text-slate-500 block mt-1">ESGOTADO</span>
                        ) : spotsLeft < maxLimit ? (
                          <span className="text-[8px] font-sans text-amber-400 block mt-0.5 font-semibold">
                            {spotsLeft} vaga{spotsLeft > 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span className="text-[8px] text-slate-400 block mt-0.5">Disponível</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* CONFIRMATION DRAWER PANEL */}
            {selectedScore && currentBolao && currentPartida && (
              <div id="participant-bet-summary" className="bg-slate-950 border border-emerald-500/30 p-5 rounded-2xl animate-fade-in space-y-4">
                <div className="flex items-center gap-2 text-emerald-400">
                  <Coins size={18} />
                  <span className="text-xs font-black uppercase tracking-widest">Resumo do Palpite Selecionado</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-300">
                  <div className="space-y-1">
                    <p>Bolão: <strong className="text-white text-sm font-bold">{currentBolao.nome}</strong></p>
                    <p>Partida: <strong className="text-white text-sm font-bold">{currentPartida.selecao_1} x {currentPartida.selecao_2}</strong></p>
                  </div>
                  <div className="space-y-1 sm:text-right">
                    <p>Palpite Chutado: <strong className="text-emerald-400 text-xl font-mono font-black">{selectedScore}</strong></p>
                    <p>Valor a pagar: <strong className="text-white text-sm font-mono font-semibold">{formatBRL(currentBolao.valor_palpite)}</strong></p>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    id="btn-confirm-palpite"
                    onClick={handleConfirmPalpite}
                    className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-extrabold rounded-xl shadow-lg transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    Confirmar Palpite
                  </button>
                </div>
              </div>
            )}

            {/* DETAILED PIX BILLING SHEET FOR PENDING PAYMENTS */}
            {successPalpite && (
              <div id="pix-payment-sheet" className="bg-slate-950 border border-emerald-500/20 p-6 rounded-2xl space-y-5 animate-fade-in text-slate-200">
                <div className="flex items-center gap-2 text-emerald-400 border-b border-slate-900 pb-3">
                  <Sparkles size={18} />
                  <span className="text-xs font-black uppercase tracking-wider">Palpite registrado com sucesso!</span>
                </div>

                <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl text-center">
                  <p className="text-sm font-bold text-white">💰 "Palpite registrado, sujeito aprovação do adm."</p>
                  <p className="text-xs text-slate-400 mt-2">
                    Faça a transferência PIX correspondente para validar seu palpite. Assim que o administrador aprovar, seu status mudará para CONFIRMADO!
                  </p>
                </div>

                <div className="space-y-3.5 text-xs">
                  <h5 className="font-bold text-white uppercase tracking-wider text-[11px]">Dados para Pagamento do Bolão:</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-900 p-4 rounded-xl border border-slate-800">
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-bold">VALOR A PAGAR</span>
                      <strong className="text-white text-lg font-mono">{formatBRL(successPalpite.valor)}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-bold">RECEBEDOR</span>
                      <strong className="text-white">{successPalpite.recebedor}</strong>
                    </div>
                    <div className="col-span-1 sm:col-span-2">
                      <span className="text-slate-500 block text-[10px] uppercase font-bold">CHAVE PIX</span>
                      <strong className="text-white font-mono break-all text-xs">{successPalpite.chavePix}</strong>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Código PIX Copia e Cola</span>
                    <textarea
                      id="pix-copiapaste-ref"
                      readOnly
                      rows={2}
                      value={successPalpite.pixCopiaCola}
                      className="w-full p-3 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 font-mono text-[10px] resize-none focus:outline-none"
                    />
                    
                    <button
                      id="btn-copy-pix"
                      onClick={() => handleCopyPix(successPalpite.pixCopiaCola)}
                      className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer text-xs"
                    >
                      {copiarFeedback ? (
                        <>
                          <Check size={14} />
                          Copiado com Sucesso!
                        </>
                      ) : (
                        <>
                          <Copy size={14} />
                          COPIAR PIX
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="text-right pt-2">
                  <button
                    id="btn-close-invoice"
                    onClick={() => setSuccessPalpite(null)}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg text-xs transition-colors cursor-pointer"
                  >
                    Fechar Recibo
                  </button>
                </div>
              </div>
            )}

          </div>

          {/* HISTORRIC RECORRDS / PARTICIPANT GUESSES TABLE */}
          <div id="participant-guesses-history" className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <Coins className="text-emerald-400" size={16} />
              Meus Palpites Cadastrados ({clientGuesses.length})
            </h4>

            <div className="overflow-x-auto">
              <table id="table-user-bets" className="w-full text-left text-xs text-slate-300 border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 font-bold uppercase text-[10px] text-slate-400">
                    <th className="pb-3">Partida / Bolão</th>
                    <th className="pb-3 text-center">Placar Chutado</th>
                    <th className="pb-3">Investimento</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right">Data/Hora</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {clientGuesses.map(p => {
                    const m = partidas.find(pt => pt.id === p.partida_id);
                    const b = boloes.find(bl => bl.id === m?.bolao_id);
                    const isWinner = m?.resultado_oficial !== null && p.resultado === m?.resultado_oficial && p.status === 'CONFIRMADO';

                    return (
                      <tr id={`usr-palpite-row-${p.id}`} key={p.id} className="hover:bg-slate-950/20">
                        {/* Match */}
                        <td className="py-3">
                          {m ? (
                            <div className="space-y-0.5">
                              <p className="font-bold text-white">{m.selecao_1} x {m.selecao_2}</p>
                              <p className="text-[10px] text-slate-400">{b?.nome}</p>
                            </div>
                          ) : (
                            <span className="text-xs text-rose-400">Partida Deletada</span>
                          )}
                        </td>

                        {/* Placar */}
                        <td className="py-3 text-center">
                          <span className="inline-block px-2.5 py-1 bg-slate-950 text-emerald-400 font-mono font-bold rounded-md">
                            {p.resultado}
                          </span>
                        </td>

                        {/* Investimento */}
                        <td className="py-3 font-mono text-white">
                          {formatBRL(p.valor)}
                        </td>

                        {/* Status badge */}
                        <td className="py-3">
                          {p.status === 'PENDENTE' && (
                            <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded-full text-[10px] font-medium border border-amber-500/15">
                              Pendente (Aguardando ADM)
                            </span>
                          )}
                          {p.status === 'CONFIRMADO' && (
                            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full text-[10px] font-medium border border-emerald-500/15">
                              Confirmado
                            </span>
                          )}
                          {p.status === 'REJEITADO' && (
                            <span className="px-2 py-0.5 bg-rose-500/10 text-rose-400 rounded-full text-[10px] font-medium border border-rose-500/15">
                              Rejeitado
                            </span>
                          )}

                          {isWinner && (
                            <span className="ml-1 px-2 py-0.5 bg-yellow-400 text-slate-950 rounded-full text-[9px] font-black uppercase">
                              🏆 GANHADOR
                            </span>
                          )}
                        </td>

                        {/* Register date */}
                        <td className="py-3 text-right text-slate-500 text-[10px] font-mono">
                          {new Date(p.data_hora).toLocaleString('pt-BR').slice(0, 16)}
                        </td>
                      </tr>
                    );
                  })}

                  {clientGuesses.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-slate-500 italic">
                        Você ainda não registrou nenhum palpite. Escolha um resultado na matriz acima!
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
