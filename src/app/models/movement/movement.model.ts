export enum MovementType {
  SAIDA = 'SAIDA',
  ENTRADA = 'ENTRADA',
  MANUTENCAO = 'MANUTENCAO',
  DESCARTE = 'DESCARTE'
}

export interface MovementRequest {
  equipamentId: string;
  movementType: MovementType;
  projeto?: string;
  responsavel?: string;
  local?: string;
  observacao?: string;
}

export interface MovementResponse {
  id: string;
  equipamentId: string;
  equipamentName: string;
  movementType: MovementType;
  projeto: string;
  responsavel: string;
  local: string;
  observacao: string;
  dataHora: string; 
  imageUrls: string[];
}