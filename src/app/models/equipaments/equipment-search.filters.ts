export interface EquipmentSearchFilters {
  nome?: string | null;
  categorias?: string[];
  tombo?: string | null;
  caracteristicas?: string | null;
  statuses?: string[];
  dataInicio?: Date | string | null;
  dataFim?: Date | string | null;
}

export interface EquipmentListOptions {
  disponivel?: boolean;
  proprietaryId?: string | null;
}
