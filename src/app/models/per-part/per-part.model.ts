/**
 * Acessórios (PerPart) — funcionalidade independente (sem vínculo obrigatório com equipamento no front).
 */
export interface PerPartRequest {
  equipamentId?: string | null;
  name: string;
  quantity: number;
  responsavel?: string | null;
  /** UUID do Proprietário (FK). null/ausente quando não informado. */
  proprietaryId?: string | null;
  /** ISO LocalDateTime (sem timezone), ex.: "2026-12-31T00:00:00". null quando não informado. */
  dataVencimento?: string | null;
}

export interface PerPartResponse {
  id: string;
  name: string;
  quantity: number;
  responsavel: string | null;
  /** UUID do Proprietário (FK). null quando o acessório não tem proprietário. */
  proprietaryId: string | null;
  /** Nome do Proprietário resolvido pelo back. null quando o acessório não tem proprietário. */
  proprietaryName: string | null;
  /** ISO LocalDateTime, ex.: "2026-12-31T00:00:00". null quando não informado. */
  dataVencimento: string | null;
}
