import { HttpParams } from '@angular/common/http';
import { appendAll, toIsoDate } from '../../core/http/http-params.util';
import { EquipmentSearchFilters } from '../../models/equipaments/equipment-search.filters';

export function withEquipmentDefaultSort(params: HttpParams): HttpParams {
  return params
    .append('sort', 'dateHour,desc')
    .append('sort', 'id,desc');
}

export function buildEquipmentSearchParams(
  filters: EquipmentSearchFilters,
  page: number,
  size: number,
): HttpParams {
  let params = new HttpParams()
    .set('page', String(page))
    .set('size', String(size));

  const nome = filters.nome?.trim();
  if (nome) {
    params = params.set('nome', nome);
  }

  params = appendAll(params, 'categoria', filters.categorias);

  const tombo = filters.tombo?.trim();
  if (tombo) {
    params = params.set('tombo', tombo);
  }

  const caracteristicas = filters.caracteristicas?.trim();
  if (caracteristicas) {
    params = params.set('caracteristicas', caracteristicas);
  }

  params = appendAll(params, 'status', filters.statuses);

  const dataInicio = toIsoDate(filters.dataInicio);
  if (dataInicio) {
    params = params.set('dataInicio', dataInicio);
  }

  const dataFim = toIsoDate(filters.dataFim);
  if (dataFim) {
    params = params.set('dataFim', dataFim);
  }

  return withEquipmentDefaultSort(params);
}
