/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Bolao, Partida, Usuario, Palpite, Notificacao } from '../types';

export const INITIAL_BOLOES: Bolao[] = [
  {
    id: "bolao-1",
    nome: "Copa América 2026 - Bolão VIP",
    valor_palpite: 20,
    limite_palpites_iguais: 3, // Each score combination can be chosen at most 3 times
    chave_pix: "contato@bolaovip2026.com.br",
    pix_copia_cola: "00020101021126710014br.gov.bcb.pix0132contato@bolaovip2026.com.br520400005303986540520.005802BR5915AdminDoBolaoVip6009SaoPaulo62070503***6304E6BC",
    recebedor_pix: "Bolão VIP Entretenimento LTDA",
    data_inicio: "2026-06-10",
    data_fim: "2026-07-15"
  },
  {
    id: "bolao-2",
    nome: "Champions League - Grande Final",
    valor_palpite: 50,
    limite_palpites_iguais: 5,
    chave_pix: "pix-champions@bolaovip.com",
    pix_copia_cola: "00020101021126680014br.gov.bcb.pix0129pix-champions@bolaovip.com520400005303986540550.005802BR5915ChampionsLeag6009SaoPaulo62070503***6304ED4E",
    recebedor_pix: "Assoc. Organizadora Ch. League",
    data_inicio: "2026-05-20",
    data_fim: "2026-06-30"
  }
];

export const INITIAL_PARTIDAS: Partida[] = [
  {
    id: "partida-1",
    bolao_id: "bolao-1",
    selecao_1: "Brasil",
    selecao_2: "Argentina",
    bandeira_1: "https://flagcdn.com/w160/br.png",
    bandeira_2: "https://flagcdn.com/w160/ar.png",
    data_partida: "2026-06-18",
    horario_partida: "21:30",
    horario_encerramento: "2026-06-18T21:15:00", // betting limit
    resultado_oficial: null // Not set yet, so bets are open
  },
  {
    id: "partida-2",
    bolao_id: "bolao-1",
    selecao_1: "França",
    selecao_2: "Alemanha",
    bandeira_1: "https://flagcdn.com/w160/fr.png",
    bandeira_2: "https://flagcdn.com/w160/de.png",
    data_partida: "2026-06-14",
    horario_partida: "16:00",
    horario_encerramento: "2026-06-14T15:45:00",
    resultado_oficial: "2x1" // Evaluated: Fransa 2 x 1 Alemanha! Real winners can be displayed
  },
  {
    id: "partida-3",
    bolao_id: "bolao-2",
    selecao_1: "Real Madrid",
    selecao_2: "Manchester City",
    bandeira_1: "https://flagcdn.com/w160/es.png",
    bandeira_2: "https://flagcdn.com/w160/gb.png",
    data_partida: "2026-06-25",
    horario_partida: "16:00",
    horario_encerramento: "2026-06-25T15:30:00",
    resultado_oficial: null
  }
];

export const INITIAL_USUARIOS: Usuario[] = [
  { id: "user-1", nome_usuario: "Carlos Silva", celular: "11987654321" },
  { id: "user-2", nome_usuario: "Mariana Souza", celular: "21998887766" },
  { id: "user-3", nome_usuario: "Bruno Santos", celular: "31988776655" },
  { id: "user-4", nome_usuario: "Patricia Lima", celular: "71991234567" }
];

export const INITIAL_PALPITES: Palpite[] = [
  // Guesses for Partida-1 (Brasil x Argentina, open, price 20)
  {
    id: "palpite-1",
    usuario_id: "user-1",
    partida_id: "partida-1",
    resultado: "2x1",
    valor: 20,
    status: "CONFIRMADO",
    data_hora: "2026-06-11T12:00:00.000Z"
  },
  {
    id: "palpite-2",
    usuario_id: "user-2",
    partida_id: "partida-1",
    resultado: "3x0",
    valor: 20,
    status: "CONFIRMADO",
    data_hora: "2026-06-11T14:35:00.000Z"
  },
  {
    id: "palpite-3",
    usuario_id: "user-3",
    partida_id: "partida-1",
    resultado: "2x1",
    valor: 20,
    status: "PENDENTE", // Waiting for approval in Admin Panel! Excellent demo
    data_hora: "2026-06-12T09:15:00.000Z"
  },
  {
    id: "palpite-4",
    usuario_id: "user-4",
    partida_id: "partida-1",
    resultado: "2x1",
    valor: 20,
    status: "CONFIRMADO", // That means 2x1 has 2 Confirmed and 1 Pendente! Highlighting limits in real-time
    data_hora: "2026-06-12T10:45:00.000Z"
  },

  // Guesses for Partida-2 (França x Alemanha, pre-calculated score: 2x1, price 20)
  {
    id: "palpite-5",
    usuario_id: "user-1",
    partida_id: "partida-2",
    resultado: "2x1", // WINNER!
    valor: 20,
    status: "CONFIRMADO",
    data_hora: "2026-06-11T12:05:00.000Z"
  },
  {
    id: "palpite-6",
    usuario_id: "user-2",
    partida_id: "partida-2",
    resultado: "2x1", // WINNER!
    valor: 20,
    status: "CONFIRMADO",
    data_hora: "2026-06-11T14:40:00.000Z"
  },
  {
    id: "palpite-7",
    usuario_id: "user-3",
    partida_id: "partida-2",
    resultado: "1x0", // Loser
    valor: 20,
    status: "CONFIRMADO",
    data_hora: "2026-06-12T09:20:00.000Z"
  },
  {
    id: "palpite-8",
    usuario_id: "user-4",
    partida_id: "partida-2",
    resultado: "2x2", // Loser
    valor: 20,
    status: "CONFIRMADO",
    data_hora: "2026-06-12T11:00:00.000Z"
  },

  // Guess for Champions match (Partida-3, price 50)
  {
    id: "palpite-9",
    usuario_id: "user-1",
    partida_id: "partida-3",
    resultado: "3x2",
    valor: 50,
    status: "PENDENTE",
    data_hora: "2026-06-12T13:40:00.000Z"
  }
];

export const INITIAL_NOTIFICACOES: Notificacao[] = [
  {
    id: "notif-1",
    usuario_id: "user-1",
    mensagem: "Seu palpite de 2x1 para Brasil x Argentina foi confirmado pelo administrador. Boa sorte no bolão!",
    data_hora: "2026-06-11T12:10:00.000Z",
    lida: false
  },
  {
    id: "notif-2",
    usuario_id: "user-2",
    mensagem: "Seu palpite de 3x0 para Brasil x Argentina foi confirmado pelo administrador. Boa sorte no bolão!",
    data_hora: "2026-06-11T14:50:00.000Z",
    lida: true
  }
];
