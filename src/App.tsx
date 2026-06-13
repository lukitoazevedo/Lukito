/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState, useEffect } from 'react';
import { Bolao, Partida, Palpite, Usuario, Notificacao, AdminUser } from './types';
import {
  INITIAL_BOLOES,
  INITIAL_PARTIDAS,
  INITIAL_USUARIOS,
  INITIAL_PALPITES,
  INITIAL_NOTIFICACOES
} from './data/seedData';
import { getTeamFlagUrl } from './utils';

import AdminPanel from './components/AdminPanel';
import ParticipantArea from './components/ParticipantArea';
import ResultsArea from './components/ResultsArea';

import {
  Trophy,
  Shield,
  Users,
  Award,
  Calendar,
  HelpCircle,
  RefreshCw,
  Volume2,
  Globe,
  Lock,
  Key,
  ShieldAlert,
  LogIn
} from 'lucide-react';

export default function App() {
  // Global States loaded from LocalStorage or seeded
  const [boloes, setBoloes] = useState<Bolao[]>([]);
  const [partidas, setPartidas] = useState<Partida[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [palpites, setPalpites] = useState<Palpite[]>([]);
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  
  // Current active logged in participant
  const [currentUser, setCurrentUser] = useState<Usuario | null>(null);

  // Active Main Navigation View Tab
  const [activeView, setActiveView] = useState<'participante' | 'resultados' | 'administrador'>('participante');

  // Admin credentials state
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [activeAdmin, setActiveAdmin] = useState<string | null>(null);

  // Link shared views indicator
  const [isSharedView, setIsSharedView] = useState(false);

  // Load state from localStorage on Mount
  useEffect(() => {
    const savedBoloes = localStorage.getItem('bolao_boloes');
    const savedPartidas = localStorage.getItem('bolao_partidas');
    const savedUsuarios = localStorage.getItem('bolao_usuarios');
    const savedPalpites = localStorage.getItem('bolao_palpites');
    const savedNotifs = localStorage.getItem('bolao_notificacoes');
    const savedCurrentUser = localStorage.getItem('bolao_currentUser');

    // Load admin accounts list or seed default
    const savedAdmins = localStorage.getItem('bolao_admins');
    if (savedAdmins) {
      setAdmins(JSON.parse(savedAdmins));
    } else {
      const initialAdmins: AdminUser[] = [
        { id: 'admin-default', username: 'admin', pin: '1234', created_at: new Date().toISOString() }
      ];
      setAdmins(initialAdmins);
      localStorage.setItem('bolao_admins', JSON.stringify(initialAdmins));
    }

    // Load logged-in admin session
    const savedActiveAdmin = localStorage.getItem('bolao_activeAdmin');
    if (savedActiveAdmin) {
      setActiveAdmin(savedActiveAdmin);
    }

    // Check shared URL mode
    let sharedBoloes = null;
    let sharedPartidas = null;

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('shared') === 'true') {
        setIsSharedView(true);
        const encodedData = params.get('data');
        if (encodedData) {
          try {
            const binString = atob(encodedData);
            const bytes = new Uint8Array(binString.length);
            for (let i = 0; i < binString.length; i++) {
              bytes[i] = binString.charCodeAt(i);
            }
            const jsonStr = new TextDecoder().decode(bytes);
            const parsed = JSON.parse(jsonStr);
            if (parsed && typeof parsed === 'object') {
              if (Array.isArray(parsed.boloes)) {
                sharedBoloes = parsed.boloes;
              }
              if (Array.isArray(parsed.partidas)) {
                sharedPartidas = parsed.partidas;
              }
            }
          } catch (e) {
            console.error("Error decoding shared URL data:", e);
          }
        }
      }
    }

    if (sharedBoloes) {
      setBoloes(sharedBoloes);
      localStorage.setItem('bolao_boloes', JSON.stringify(sharedBoloes));
    } else if (savedBoloes) {
      setBoloes(JSON.parse(savedBoloes));
    } else {
      setBoloes(INITIAL_BOLOES);
      localStorage.setItem('bolao_boloes', JSON.stringify(INITIAL_BOLOES));
    }

    if (sharedPartidas) {
      setPartidas(sharedPartidas);
      localStorage.setItem('bolao_partidas', JSON.stringify(sharedPartidas));
    } else if (savedPartidas) {
      setPartidas(JSON.parse(savedPartidas));
    } else {
      setPartidas(INITIAL_PARTIDAS);
      localStorage.setItem('bolao_partidas', JSON.stringify(INITIAL_PARTIDAS));
    }

    if (savedUsuarios) setUsuarios(JSON.parse(savedUsuarios));
    else {
      setUsuarios(INITIAL_USUARIOS);
      localStorage.setItem('bolao_usuarios', JSON.stringify(INITIAL_USUARIOS));
    }

    if (savedPalpites) setPalpites(JSON.parse(savedPalpites));
    else {
      setPalpites(INITIAL_PALPITES);
      localStorage.setItem('bolao_palpites', JSON.stringify(INITIAL_PALPITES));
    }

    if (savedNotifs) setNotificacoes(JSON.parse(savedNotifs));
    else {
      setNotificacoes(INITIAL_NOTIFICACOES);
      localStorage.setItem('bolao_notificacoes', JSON.stringify(INITIAL_NOTIFICACOES));
    }

    if (savedCurrentUser) {
      setCurrentUser(JSON.parse(savedCurrentUser));
    }
  }, []);

  // Save changes helper
  const saveState = (key: string, data: any) => {
    localStorage.setItem(key, JSON.stringify(data));
  };

  // 1. Actions: add a sweepstakes (Bolão)
  const handleAddBolao = (newB: Omit<Bolao, 'id'>) => {
    const freshBolao: Bolao = {
      ...newB,
      id: `bolao-${Date.now()}`
    };
    const updated = [...boloes, freshBolao];
    setBoloes(updated);
    saveState('bolao_boloes', updated);
  };

  // 2. Actions: register a soccer match with automagic flag assignment
  const handleAddPartida = (newP: Omit<Partida, 'id' | 'bandeira_1' | 'bandeira_2' | 'resultado_oficial'>) => {
    const f1 = getTeamFlagUrl(newP.selecao_1);
    const f2 = getTeamFlagUrl(newP.selecao_2);

    const freshPartida: Partida = {
      ...newP,
      id: `partida-${Date.now()}`,
      bandeira_1: f1,
      bandeira_2: f2,
      resultado_oficial: null
    };

    const updated = [...partidas, freshPartida];
    setPartidas(updated);
    saveState('bolao_partidas', updated);
  };

  // 3. Actions: Participant log-in or registration
  const handleLogin = (nome: string, celular: string) => {
    // Sanitize values
    const cleanPhone = celular.replace(/\D/g, ''); // leave only digits
    
    // Check if user already exists
    let user = usuarios.find(u => u.celular === cleanPhone);

    if (!user) {
      // Create new user record
      user = {
        id: `user-${Date.now()}`,
        nome_usuario: nome,
        celular: cleanPhone
      };
      const updatedUsers = [...usuarios, user];
      setUsuarios(updatedUsers);
      saveState('bolao_usuarios', updatedUsers);
    }

    setCurrentUser(user);
    saveState('bolao_currentUser', user);
  };

  // 4. Actions: logout
  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('bolao_currentUser');
  };

  // 5. Actions: place/submit guess
  const handleAddPalpite = (partidaId: string, resultado: string) => {
    if (!currentUser) return;
    
    const targetMatch = partidas.find(m => m.id === partidaId);
    if (!targetMatch) return;
    const targetBolao = boloes.find(b => b.id === targetMatch.bolao_id);
    if (!targetBolao) return;

    const freshPalpite: Palpite = {
      id: `palpite-${Date.now()}`,
      usuario_id: currentUser.id,
      partida_id: partidaId,
      resultado: resultado,
      valor: targetBolao.valor_palpite,
      status: 'PENDENTE',
      data_hora: new Date().toISOString()
    };

    const updated = [...palpites, freshPalpite];
    setPalpites(updated);
    saveState('bolao_palpites', updated);
  };

  // 6. Actions: Approve or Reject a guess (Admin)
  const handleUpdatePalpiteStatus = (palpiteId: string, status: 'CONFIRMADO' | 'REJEITADO') => {
    const updated = palpites.map(p => {
      if (p.id === palpiteId) {
        // Create matching notification
        if (status === 'CONFIRMADO') {
          const freshNotif: Notificacao = {
            id: `notif-${Date.now()}`,
            usuario_id: p.usuario_id,
            mensagem: "Seu palpite foi confirmado pelo administrador. Boa sorte no bolão!",
            data_hora: new Date().toISOString(),
            lida: false
          };
          const updatedNotifs = [...notificacoes, freshNotif];
          setNotificacoes(updatedNotifs);
          saveState('bolao_notificacoes', updatedNotifs);
        }
        return { ...p, status };
      }
      return p;
    });

    setPalpites(updated);
    saveState('bolao_palpites', updated);
  };

  // 7. Actions: Report official match score
  const handleSetResultadoOficial = (partidaId: string, score: string | null) => {
    const updated = partidas.map(m => {
      if (m.id === partidaId) {
        return { ...m, resultado_oficial: score };
      }
      return m;
    });

    setPartidas(updated);
    saveState('bolao_partidas', updated);
  };

  // 8. Actions: Clear Notifications for user
  const handleMarkNotificationsAsRead = (userId: string) => {
    const updated = notificacoes.map(n => {
      if (n.usuario_id === userId) {
        return { ...n, lida: true };
      }
      return n;
    });
    setNotificacoes(updated);
    saveState('bolao_notificacoes', updated);
  };

  // 9. Actions: Delete a Bolão and cascade matches/guesses
  const handleDeleteBolao = (bolaoId: string) => {
    const updatedBoloes = boloes.filter(b => b.id !== bolaoId);
    setBoloes(updatedBoloes);
    saveState('bolao_boloes', updatedBoloes);

    // Cascade delete partidas associated with this bolao
    const matchesToRemove = partidas.filter(m => m.bolao_id === bolaoId);
    const matchesToRemoveIds = matchesToRemove.map(m => m.id);
    const updatedPartidas = partidas.filter(m => m.bolao_id !== bolaoId);
    setPartidas(updatedPartidas);
    saveState('bolao_partidas', updatedPartidas);

    // Cascade delete guesses associated with those matches
    const updatedPalpites = palpites.filter(p => !matchesToRemoveIds.includes(p.partida_id));
    setPalpites(updatedPalpites);
    saveState('bolao_palpites', updatedPalpites);
  };

  // 10. Actions: Admin additions & deletions
  const handleAddAdmin = (username: string, pin: string) => {
    const newAdmin: AdminUser = {
      id: `admin-${Date.now()}`,
      username: username.toLowerCase().trim(),
      pin: pin.trim(),
      created_at: new Date().toISOString()
    };
    const updated = [...admins, newAdmin];
    setAdmins(updated);
    saveState('bolao_admins', updated);
  };

  const handleDeleteAdmin = (adminId: string) => {
    const updated = admins.filter(a => a.id !== adminId);
    setAdmins(updated);
    saveState('bolao_admins', updated);
  };

  const handleLogoutAdmin = () => {
    setActiveAdmin(null);
    localStorage.removeItem('bolao_activeAdmin');
  };

  // Force local state factory reset to seeded values
  const handleResetAppSeededData = () => {
    if (confirm("Deseja restaurar as configurações originais com dados de exemplo? Todos os seus palpites atuais serão sobrescritos.")) {
      setBoloes(INITIAL_BOLOES);
      setPartidas(INITIAL_PARTIDAS);
      setUsuarios(INITIAL_USUARIOS);
      setPalpites(INITIAL_PALPITES);
      setNotificacoes(INITIAL_NOTIFICACOES);
      setCurrentUser(null);
      setActiveAdmin(null);
      
      const initialAdmins: AdminUser[] = [
        { id: 'admin-default', username: 'admin', pin: '1234', created_at: new Date().toISOString() }
      ];
      setAdmins(initialAdmins);
      
      localStorage.setItem('bolao_boloes', JSON.stringify(INITIAL_BOLOES));
      localStorage.setItem('bolao_partidas', JSON.stringify(INITIAL_PARTIDAS));
      localStorage.setItem('bolao_usuarios', JSON.stringify(INITIAL_USUARIOS));
      localStorage.setItem('bolao_palpites', JSON.stringify(INITIAL_PALPITES));
      localStorage.setItem('bolao_notificacoes', JSON.stringify(INITIAL_NOTIFICACOES));
      localStorage.setItem('bolao_admins', JSON.stringify(initialAdmins));
      localStorage.removeItem('bolao_currentUser');
      localStorage.removeItem('bolao_activeAdmin');
    }
  };

  return (
    <div id="full-app-shell" className="min-h-screen bg-slate-950 font-sans text-slate-100 flex flex-col justify-between">
      
      {/* GLOBAL HEADER BAR */}
      <header id="global-nav-header" className="bg-slate-900 border-b border-slate-800 sticky top-0 z-30 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Logo Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-slate-950 shadow-md shadow-emerald-500/20">
              <Trophy size={20} className="font-extrabold" />
            </div>
            <div>
              <h1 id="app-brand-title" className="text-lg font-black tracking-tight text-white uppercase">
                FUT<span className="text-emerald-400">BOLÃO</span>
              </h1>
              <p className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">Gere, Cadastre & Participe</p>
            </div>
          </div>

          {/* Core Roles Swapping and Navigation Tabs */}
          <nav id="major-navigation-tabs" className="flex bg-slate-950 p-1 border border-slate-800 rounded-2xl w-full sm:w-auto">
            <button
              id="nav-tab-participante"
              onClick={() => setActiveView('participante')}
              className={`flex-1 sm:flex-none uppercase tracking-wider text-[11px] font-black px-4 py-2.5 rounded-xl transition-all cursor-pointer text-center ${
                activeView === 'participante'
                  ? 'bg-emerald-500 text-slate-950 shadow-lg font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ⚽ Participante
            </button>
            <button
              id="nav-tab-resultados"
              onClick={() => setActiveView('resultados')}
              className={`flex-1 sm:flex-none uppercase tracking-wider text-[11px] font-black px-4 py-2.5 rounded-xl transition-all cursor-pointer text-center ${
                activeView === 'resultados'
                  ? 'bg-emerald-500 text-slate-950 shadow-lg font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🏆 Resultados
            </button>
            {!isSharedView && (
              <button
                id="nav-tab-administrador"
                onClick={() => setActiveView('administrador')}
                className={`flex-1 sm:flex-none uppercase tracking-wider text-[11px] font-black px-4 py-2.5 rounded-xl transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 ${
                  activeView === 'administrador'
                    ? 'bg-emerald-500 text-slate-950 shadow-lg font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🛠️ Admin
              </button>
            )}
          </nav>
        </div>
      </header>

      {/* CORE DISPLAY STAGE */}
      <main id="app-main-content-area" className="flex-grow max-w-7xl mx-auto px-4 md:px-8 py-8 w-full">
        
        {/* Playful Instruction Banner for the tester */}
        <div id="playful-dev-info-alert" className="bg-slate-900 border border-slate-800/80 p-4 rounded-3xl mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
              <Globe size={18} />
            </div>
            <div className="text-center md:text-left">
              <p className="text-xs font-bold text-white">Ambiente de Teste & Simulação</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Você pode simular o ciclo completo de bolões! Cadastre-se na Área do Participante, escolha palpites, aprove pelo painel do **Admin** e lance resultados oficiais.
              </p>
            </div>
          </div>
          
          <button
            id="btn-factory-reset"
            onClick={handleResetAppSeededData}
            className="px-3.5 py-1.5 bg-slate-950 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-bold border border-slate-800 cursor-pointer flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw size={12} />
            Restaurar Dados Originais
          </button>
        </div>

        {/* Dynamic View rendering depending on active tab status */}
        <div id="dynamic-rendered-view">
          {activeView === 'participante' && (
            <ParticipantArea
              boloes={boloes}
              partidas={partidas}
              usuarios={usuarios}
              palpites={palpites}
              currentUser={currentUser}
              notificacoes={notificacoes}
              onLogin={handleLogin}
              onLogout={handleLogout}
              onAddPalpite={handleAddPalpite}
              onMarkNotificationsAsRead={handleMarkNotificationsAsRead}
            />
          )}

          {activeView === 'resultados' && (
            <ResultsArea
              boloes={boloes}
              partidas={partidas}
              usuarios={usuarios}
              palpites={palpites}
            />
          )}

          {activeView === 'administrador' && (
            <>
              {activeAdmin === null ? (
                <div id="admin-login-wrapper" className="max-w-md mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden my-8">
                  {/* Styling decoration */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -z-10"></div>
                  
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
                      <Lock size={28} />
                    </div>
                    <h3 className="text-xl font-bold text-white">Painel de Administração</h3>
                    <p className="text-xs text-slate-400 mt-1">Autorização necessária para gerenciar bolões, partidas, palpites e administradores.</p>
                  </div>

                  <form
                    id="admin-auth-login-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const target = e.currentTarget;
                      const usernameInput = target.elements.namedItem('username') as HTMLInputElement;
                      const pinInput = target.elements.namedItem('pin') as HTMLInputElement;
                      const username = usernameInput ? usernameInput.value.toLowerCase().trim() : '';
                      const pin = pinInput ? pinInput.value.trim() : '';

                      const match = admins.find(a => a.username === username && a.pin === pin);
                      if (match) {
                        setActiveAdmin(match.username);
                        localStorage.setItem('bolao_activeAdmin', match.username);
                      } else {
                        alert("❌ Nome de usuário ou PIN incorreto. Tente novamente ou use a conta padrão (admin / 1234).");
                      }
                    }}
                    className="space-y-4"
                  >
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Nome do Administrador</label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-3.5 text-slate-400 font-bold">
                          <Users size={16} />
                        </span>
                        <input
                          name="username"
                          type="text"
                          required
                          placeholder="Ex: admin"
                          className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">PIN / Senha de Acesso</label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-3.5 text-slate-400 font-bold">
                          <Key size={16} />
                        </span>
                        <input
                          name="pin"
                          type="password"
                          required
                          placeholder="Ex: 1234"
                          className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono tracking-widest"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 text-sm uppercase mt-6"
                    >
                      <LogIn size={16} />
                      Liberar Acesso
                    </button>

                    <div className="text-center pt-2">
                      <span className="text-[10px] text-slate-500 font-sans block">Conta de demonstração padrão:</span>
                      <span className="text-[11px] text-emerald-500/80 font-mono">admin / 1234</span>
                    </div>
                  </form>
                </div>
              ) : (
                <AdminPanel
                  boloes={boloes}
                  partidas={partidas}
                  usuarios={usuarios}
                  palpites={palpites}
                  admins={admins}
                  activeAdmin={activeAdmin}
                  onAddBolao={handleAddBolao}
                  onDeleteBolao={handleDeleteBolao}
                  onAddPartida={handleAddPartida}
                  onUpdatePalpiteStatus={handleUpdatePalpiteStatus}
                  onSetResultadoOficial={handleSetResultadoOficial}
                  onAddAdmin={handleAddAdmin}
                  onDeleteAdmin={handleDeleteAdmin}
                  onLogoutAdmin={handleLogoutAdmin}
                />
              )}
            </>
          )}
        </div>

      </main>

      {/* COMPACT FOOTER */}
      <footer id="system-compact-footer" className="bg-slate-950 border-t border-slate-900 py-6 text-center text-slate-600 text-xs">
        <div className="max-w-7xl mx-auto px-4 md:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p id="app-footer-copyright">© 2026 FutBolão Premier. Desenvolvido para navegadores web, Android e iPhone.</p>
          <div className="flex gap-4 font-mono text-[10px]">
            <span>UTC Local: 2026-06-13</span>
            <span>•</span>
            <span>Versão 1.5-prod</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
