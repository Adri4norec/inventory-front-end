/**
 * Acessórios (PerPart) — funcionalidade independente (sem vínculo obrigatório com equipamento no front).
 */
export interface PerPartRequest {
  name: string;
  quantity: number;
  responsavel: string;
}

export interface PerPartResponse {
  id: string;
  name: string;
  quantity: number;
  responsavel?: string;
}
