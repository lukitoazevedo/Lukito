/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Bolao {
  id: string;
  nome: string;
  valor_palpite: number;
  limite_palpites_iguais: number; // max duplicate guesses for each score
  chave_pix: string;
  pix_copia_cola: string;
  recebedor_pix: string;
  data_inicio: string;
  data_fim: string;
}

export interface Partida {
  id: string;
  bolao_id: string;
  selecao_1: string;
  selecao_2: string;
  bandeira_1: string; // URL icon/flag
  bandeira_2: string;
  data_partida: string;
  horario_partida: string;
  horario_encerramento: string; // ISO string for betting deadline
  resultado_oficial: string | null; // e.g., "2x1" or null if not set
}

export interface Usuario {
  id: string;
  nome_usuario: string;
  celular: string;
}

export interface Palpite {
  id: string;
  usuario_id: string;
  partida_id: string;
  resultado: string; // e.g., "2x1"
  valor: number;
  status: 'PENDENTE' | 'CONFIRMADO' | 'REJEITADO';
  data_hora: string;
}

export interface Notificacao {
  id: string;
  usuario_id: string;
  mensagem: string;
  data_hora: string;
  lida: boolean;
}
