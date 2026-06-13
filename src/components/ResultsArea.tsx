/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Bolao, Partida, Palpite, Usuario } from '../types';
import { formatBRL, formatLocalDate } from '../utils';
import { Trophy, Users, ShieldAlert, Award, Search, Calendar, ChevronRight } from 'lucide-react';

interface ResultsAreaProps {
  boloes: Bolao[];
  partidas: Partida[];
  usuarios: Usuario[];
  palpites: Palpite[];
}

export default function ResultsArea({
  boloes,
  partidas,
  usuarios,
  palpites,
}: ResultsAreaProps) {
  const [selectedBolaoId, setSelectedBolaoId] = useState<string>('todos');

  // Filter completed matches
  const completedMatches = partidas.filter(m => {
    if (m.resultado_oficial === null) return false;
    if (selectedBolaoId !== 'todos' && m.bolao_id !== selectedBolaoId) return false;
    return true;
  });

  return (
    <div id="results-area-container" className="space-y-6">
      
      {/* HEADER SECTION */}
      <div id="results-header-card" className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Trophy className="text-amber-400" size={20} />
              Quadro de Resultados & Ganhadores
            </h3>
            <p className="text-xs text-slate-400 mt-1">Veja a lista oficial de vencedores e a divisão proporcional dos valores acumulados.</p>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className="text-xs text-slate-400 font-bold uppercase shrink-0">Filtrar:</span>
            <select
              id="results-filter-bolao"
              value={selectedBolaoId}
              onChange={(e) => setSelectedBolaoId(e.target.value)}
              className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 w-full md:w-48 font-medium"
            >
              <option value="todos">Todos os Bolões</option>
              {boloes.map(b => (
                <option key={b.id} value={b.id}>{b.nome}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* COMPLETED MATCHES RESOLUTION CARDS */}
      <div id="results-cards-list" className="grid gap-6">
        {completedMatches.map(match => {
          const b = boloes.find(bl => bl.id === match.bolao_id);
          
          // All CONFIRMADO bids for this specific game
          const confirmedBets = palpites.filter(
            p => p.partida_id === match.id && p.status === 'CONFIRMADO'
          );

          // Calculate prize characteristics
          const totalArrecadado = confirmedBets.length * (b?.valor_palpite || 0);

          // Find exact winners
          const winnersArr = confirmedBets.filter(
            p => p.resultado === match.resultado_oficial
          );

          const winnersCount = winnersArr.length;
          const individualShare = winnersCount > 0 ? totalArrecadado / winnersCount : 0;

          return (
            <div id={`result-card-match-${match.id}`} key={match.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
              
              {/* Top info and score header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-850 pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black px-2.5 py-0.5 bg-slate-800 text-amber-400 rounded-full uppercase">
                      {b?.nome || 'Bolão'}
                    </span>
                    <span className="text-xs text-slate-400 font-mono flex items-center gap-1 font-semibold">
                      <Calendar size={12} />
                      Encerrado em {formatLocalDate(match.data_partida)}
                    </span>
                  </div>
                  <h4 className="mt-2 text-sm font-bold text-white uppercase tracking-wider">Resultado Oficial Decretado</h4>
                </div>

                <div className="bg-slate-950 px-5 py-3 rounded-2xl border border-slate-800/60 text-center min-w-[200px]">
                  <span className="text-[10px] text-slate-500 font-sans block uppercase font-bold tracking-wider mb-0.5">PLACAR OFICIAL</span>
                  <span id={`result-score-tag-${match.id}`} className="text-2xl font-black font-mono tracking-widest text-emerald-400">
                    {match.selecao_1} <span className="text-white text-xl font-normal">{match.resultado_oficial?.split('x')[0] || '0'}</span> x <span className="text-white text-xl font-normal">{match.resultado_oficial?.split('x')[1] || '0'}</span> {match.selecao_2}
                  </span>
                </div>
              </div>

              {/* Match flag visual banner */}
              <div className="flex justify-center items-center gap-6 py-2">
                <div className="flex items-center gap-3">
                  <img src={match.bandeira_1} alt="" className="w-10 h-6 object-cover rounded shadow" referrerPolicy="no-referrer" />
                  <span className="text-sm font-black text-slate-200">{match.selecao_1}</span>
                </div>
                <span className="text-xs font-bold text-slate-600 font-mono">X</span>
                <div className="flex items-center gap-3">
                  <img src={match.bandeira_2} alt="" className="w-10 h-6 object-cover rounded shadow" referrerPolicy="no-referrer" />
                  <span className="text-sm font-black text-slate-200">{match.selecao_2}</span>
                </div>
              </div>

              {/* Financial and stats layout breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <div className="p-2 space-y-1">
                  <span className="text-slate-500 text-[10px] uppercase font-extrabold tracking-wider">Valor total arrecadado</span>
                  <p className="text-lg font-mono font-black text-white">{formatBRL(totalArrecadado)}</p>
                  <span className="text-[10px] text-slate-400 block font-mono">{confirmedBets.length} palpites validados</span>
                </div>

                <div className="p-2 space-y-1 border-y md:border-y-0 md:border-x border-slate-800/80">
                  <span className="text-slate-500 text-[10px] uppercase font-extrabold tracking-wider">Quantidade de vencedores</span>
                  <p className="text-lg font-mono font-black text-amber-400">{winnersCount}</p>
                  <span className="text-[10px] text-slate-400 block">Acertos exatos do placar</span>
                </div>

                <div className="p-2 space-y-1">
                  <span className="text-slate-500 text-[10px] uppercase font-extrabold tracking-wider">Prêmio Individual</span>
                  <p className="text-lg font-mono font-black text-emerald-400">
                    {winnersCount > 0 ? formatBRL(individualShare) : formatBRL(0)}
                  </p>
                  <span className="text-[10px] text-slate-400 block">Divisão de {winnersCount > 0 ? '100%' : '0%'} do arrecadado</span>
                </div>
              </div>

              {/* LIST OF WINNERS FOR THE MATCH */}
              <div className="space-y-3">
                <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Award size={14} className="text-yellow-400" />
                  🏆 Vendedores Declarados
                </h5>

                <div className="bg-slate-950 rounded-2xl overflow-hidden divide-y divide-slate-800/50 border border-slate-850">
                  {winnersArr.map((winner, idx) => {
                    const u = usuarios.find(usr => usr.id === winner.usuario_id);

                    return (
                      <div id={`winner-item-${winner.id}`} key={winner.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950 hover:bg-slate-900/40 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-full bg-yellow-400/10 text-yellow-400 font-extrabold flex items-center justify-center text-xs">
                            {idx + 1}
                          </span>
                          <div>
                            <p className="text-sm font-bold text-white">{u?.nome_usuario || 'Participante VIP'}</p>
                            <p className="text-[11px] text-slate-400 font-mono">Telefone: {u?.celular || 'N/A'}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-6 text-right">
                          <div className="text-left sm:text-right">
                            <span className="text-[9px] text-slate-500 block uppercase font-bold">PALPITE CHUTADO</span>
                            <span className="text-sm font-bold text-emerald-400 font-mono">{winner.resultado}</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-500 block uppercase font-bold">PIX INDIVIDUAL</span>
                            <span className="text-sm font-bold text-yellow-400 font-mono">{formatBRL(individualShare)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {winnersCount === 0 && (
                    <div className="p-6 text-center text-sm text-slate-400">
                      Nenhum participante acertou o placar correto de <strong className="text-white font-mono">{match.resultado_oficial}</strong> para esta partida. <br />
                      <span className="text-xs text-amber-500 mt-1 block">O prêmio acumula para as demais partidas ativas do bolão!</span>
                    </div>
                  )}
                </div>
              </div>

            </div>
          );
        })}

        {completedMatches.length === 0 && (
          <div className="text-center py-12 bg-slate-900 border border-dashed border-slate-800 rounded-3xl text-slate-400">
            <Trophy className="mx-auto mb-3 opacity-30 text-emerald-400 animate-pulse" size={40} />
            <p className="font-bold text-white text-sm">Nenhum bolão encerrado com placar oficial ainda.</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Experimente ir no painel do **Administrador** (aba "Visão Geral") e registrar um resultado oficial para qualquer partida aberta para ver os vencedores surgirem aqui!
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
