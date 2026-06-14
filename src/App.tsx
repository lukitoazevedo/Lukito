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

  // Load state from localStorage on Mount and configure API polling
  useEffect(() => {
    // 1. Initial configuration from local storage
    const savedBoloes = localStorage.getItem('bolao_boloes');
    const savedPartidas = localStorage.getItem('bolao_partidas');
    const savedUsuarios = localStorage.getItem('bolao_usuarios');
    const savedPalpites = localStorage.getItem('bolao_palpites');
    const savedNotifs = localStorage.getItem('bolao_notificacoes');
    const savedCurrentUser = sessionStorage.getItem('bolao_currentUser');

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

    const savedActiveAdmin = localStorage.getItem('bolao_activeAdmin');
    if (savedActiveAdmin) {
      setActiveAdmin(savedActiveAdmin);
    }

    if (savedBoloes) setBoloes(JSON.parse(savedBoloes));
    else setBoloes(INITIAL_BOLOES);

    if (savedPartidas) setPartidas(JSON.parse(savedPartidas));
    else setPartidas(INITIAL_PARTIDAS);

    if (savedUsuarios) setUsuarios(JSON.parse(savedUsuarios));
    else setUsuarios(INITIAL_USUARIOS);

    if (savedPalpites) setPalpites(JSON.parse(savedPalpites));
    else setPalpites(INITIAL_PALPITES);

    if (savedNotifs) setNotificacoes(JSON.parse(savedNotifs));
    else setNotificacoes(INITIAL_NOTIFICACOES);

    if (savedCurrentUser) {
      setCurrentUser(JSON.parse(savedCurrentUser));
    }

    // 2. Extrapolate Shared View parameters
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('shared') === 'true') {
        setIsSharedView(true);
        setActiveView('participante');
      }
    }

    // 3. One-off immediate fetch from API to get the latest state
    fetch("/api/state")
      .then(res => res.json())
      .then(data => {
        if (data && typeof data === "object") {
          if (Array.isArray(data.boloes)) setBoloes(data.boloes);
          if (Array.isArray(data.partidas)) setPartidas(data.partidas);
          if (Array.isArray(data.usuarios)) setUsuarios(data.usuarios);
          if (Array.isArray(data.palpites)) setPalpites(data.palpites);
          if (Array.isArray(data.notificacoes)) setNotificacoes(data.notificacoes);
          if (Array.isArray(data.admins)) setAdmins(data.admins);
        }
      })
      .catch(err => console.warn("Failed first-fetch from state API, running offline-first:", err));
  }, []);

  // 4. Polling effect to keep views synchronized in real-time across users, tabs and screens
  useEffect(() => {
    const fetchState = () => {
      fetch("/api/state")
        .then(res => res.json())
        .then(data => {
          if (data && typeof data === "object") {
            if (Array.isArray(data.boloes) && JSON.stringify(boloes) !== JSON.stringify(data.boloes)) {
              setBoloes(data.boloes);
            }
            if (Array.isArray(data.partidas) && JSON.stringify(partidas) !== JSON.stringify(data.partidas)) {
              setPartidas(data.partidas);
            }
            if (Array.isArray(data.usuarios)) {
              if (JSON.stringify(usuarios) !== JSON.stringify(data.usuarios)) {
                setUsuarios(data.usuarios);
              }
              // If current user is deleted by admin, log out!
              if (currentUser && !data.usuarios.some((u: any) => u.id === currentUser.id)) {
                setCurrentUser(null);
                localStorage.removeItem('bolao_currentUser');
              }
            }
            if (Array.isArray(data.palpites) && JSON.stringify(palpites) !== JSON.stringify(data.palpites)) {
              setPalpites(data.palpites);
            }
            if (Array.isArray(data.notificacoes) && JSON.stringify(notificacoes) !== JSON.stringify(data.notificacoes)) {
              setNotificacoes(data.notificacoes);
            }
            if (Array.isArray(data.admins) && JSON.stringify(admins) !== JSON.stringify(data.admins)) {
              setAdmins(data.admins);
            }
          }
        })
        .catch(err => {
          console.warn("Polling state sync error:", err);
        });
    };

    const interval = setInterval(fetchState, 2000);
    return () => clearInterval(interval);
  }, [boloes, partidas, usuarios, palpites, notificacoes, admins, currentUser]);

  // Keep cross-tab localStorage backup handler for redundancy on single browser actions
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (!e.key) return;
      if (e.newValue === null) {
        if (e.key === 'bolao_currentUser') setCurrentUser(null);
        if (e.key === 'bolao_activeAdmin') setActiveAdmin(null);
        return;
      }

      if (e.key === 'bolao_activeAdmin') {
        setActiveAdmin(e.newValue);
        return;
      }

      try {
        const parsed = JSON.parse(e.newValue);
        switch (e.key) {
          case 'bolao_boloes': setBoloes(parsed); break;
          case 'bolao_partidas': setPartidas(parsed); break;
          case 'bolao_palpites': setPalpites(parsed); break;
          case 'bolao_notificacoes': setNotificacoes(parsed); break;
          case 'bolao_usuarios': setUsuarios(parsed); break;
          case 'bolao_admins': setAdmins(parsed); break;
          case 'bolao_currentUser': setCurrentUser(parsed); break;
          default: break;
        }
      } catch (err) {
        console.warn("Storage change handling skipped:", e.key, err);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Save changes helper with automatic server backup synchronization
  const saveState = (key: string, data: any) => {
    if (key === 'bolao_currentUser') {
      if (data === null) {
        sessionStorage.removeItem('bolao_currentUser');
        localStorage.removeItem('bolao_currentUser');
      } else {
        sessionStorage.setItem('bolao_currentUser', JSON.stringify(data));
      }
    } else {
      localStorage.setItem(key, JSON.stringify(data));
    }
    const serverKey = key.replace('bolao_', '');
    fetch('/api/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [serverKey]: data })
    }).catch(err => console.error(`Error saving ${key} to server:`, err));
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

  // 3. Actions: Participant log-in
  const handleLogin = (nome: string, celular: string): boolean => {
    // Sanitize values
    const cleanPhone = celular.replace(/\D/g, ''); // leave only digits
    const cleanNomeInput = nome.trim().toLowerCase();
    
    // Check if user already exists matching BOTH Name and Cellphone
    const user = usuarios.find(
      u => u.celular === cleanPhone && u.nome_usuario.trim().toLowerCase() === cleanNomeInput
    );

    if (user) {
      setCurrentUser(user);
      saveState('bolao_currentUser', user);
      return true;
    }
    return false;
  };

  // Actions: Participant registration
  const handleRegister = (nome: string, celular: string): { success: boolean; error?: string } => {
    // Sanitize values
    const cleanPhone = celular.replace(/\D/g, ''); // leave only digits
    const cleanNome = nome.trim();

    if (!cleanNome || !cleanPhone) {
      return { success: false, error: "Nome e celular são campos obrigatórios." };
    }

    // Check if phone number is already registered
    const existing = usuarios.find(u => u.celular === cleanPhone);
    if (existing) {
      return { success: false, error: "Este número de celular já possui cadastro no sistema!" };
    }

    const newUser: Usuario = {
      id: `user-${Date.now()}`,
      nome_usuario: cleanNome,
      celular: cleanPhone
    };

    const updatedUsers = [...usuarios, newUser];
    setUsuarios(updatedUsers);
    saveState('bolao_usuarios', updatedUsers);
    setCurrentUser(newUser);
    saveState('bolao_currentUser', newUser);
    return { success: true };
  };

  // 4. Actions: logout
  const handleLogout = () => {
    setCurrentUser(null);
    sessionStorage.removeItem('bolao_currentUser');
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

  const handleDeleteUsuario = (usuarioId: string) => {
    const updatedUsers = usuarios.filter(u => u.id !== usuarioId);
    setUsuarios(updatedUsers);
    saveState('bolao_usuarios', updatedUsers);

    if (currentUser?.id === usuarioId) {
      setCurrentUser(null);
      localStorage.removeItem('bolao_currentUser');
    }

    const updatedPalpites = palpites.filter(p => p.usuario_id !== usuarioId);
    setPalpites(updatedPalpites);
    saveState('bolao_palpites', updatedPalpites);

    const updatedNotifs = notificacoes.filter(n => n.usuario_id !== usuarioId);
    setNotificacoes(updatedNotifs);
    saveState('bolao_notificacoes', updatedNotifs);
  };

  const handleLogoutAdmin = () => {
    setActiveAdmin(null);
    localStorage.removeItem('bolao_activeAdmin');
  };

  // Force local state factory reset to seeded values
  const handleResetAppSeededData = () => {
    if (confirm("Deseja restaurar as configurações originais com dados de exemplo? Todos os seus palpites atuais serão sobrescritos.")) {
      fetch("/api/reset", {
        method: "POST"
      })
      .then(res => res.json())
      .then(resData => {
        if (resData && resData.success && resData.state) {
          const s = resData.state;
          setBoloes(s.boloes);
          setPartidas(s.partidas);
          setUsuarios(s.usuarios);
          setPalpites(s.palpites);
          setNotificacoes(s.notificacoes);
          setCurrentUser(null);
          setActiveAdmin(null);
          
          const initialAdmins: AdminUser[] = s.admins;
          setAdmins(initialAdmins);
          
          localStorage.setItem('bolao_boloes', JSON.stringify(s.boloes));
          localStorage.setItem('bolao_partidas', JSON.stringify(s.partidas));
          localStorage.setItem('bolao_usuarios', JSON.stringify(s.usuarios));
          localStorage.setItem('bolao_palpites', JSON.stringify(s.palpites));
          localStorage.setItem('bolao_notificacoes', JSON.stringify(s.notificacoes));
          localStorage.setItem('bolao_admins', JSON.stringify(initialAdmins));
          localStorage.removeItem('bolao_currentUser');
          localStorage.removeItem('bolao_activeAdmin');
        }
      })
      .catch(err => {
        console.error("Error resetting server data, executing offline-only reset:", err);
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
      });
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
              activeAdmin={activeAdmin}
              onLogin={handleLogin}
              onRegister={handleRegister}
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

          {activeView === 'administrador' && !isSharedView && (
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
                  onDeleteUsuario={handleDeleteUsuario}
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
