import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import { PerPartRequest, PerPartResponse } from '../../models/per-part/per-part.model';
import { PageResponse } from '../../models/equipaments/equipament.model';

@Injectable({ providedIn: 'root' })
export class PerPartService {
  private readonly API = `${environment.apiUrl}/api/v1/per-parts`;

  constructor(private http: HttpClient) {}

  private withDefaultSort(params: HttpParams): HttpParams {
    return params.append('sort', 'createdAt,desc');
  }

  listPaged(page: number, size: number): Observable<PageResponse<PerPartResponse>> {
    let params = new HttpParams()
      .set('page', String(page))
      .set('size', String(size));
    params = this.withDefaultSort(params);

    return this.http.get<PageResponse<PerPartResponse> | PerPartResponse[]>(this.API, { params }).pipe(
      map((res) => this.normalizePageResponse(res, page, size))
    );
  }

  advancedSearch(
    filtros: { nome?: string | null; responsavel?: string | null },
    page: number,
    size: number
  ): Observable<PageResponse<PerPartResponse>> {
    let params = new HttpParams()
      .set('page', String(page))
      .set('size', String(size));

    const nome = (filtros?.nome ?? '').trim();
    if (nome.length > 0) params = params.set('nome', nome);

    const responsavel = (filtros?.responsavel ?? '').trim();
    if (responsavel.length > 0) params = params.set('responsavel', responsavel);

    params = this.withDefaultSort(params);
    return this.http
      .get<PageResponse<PerPartResponse> | PerPartResponse[]>(`${this.API}/advanced-search`, { params })
      .pipe(map((res) => this.normalizePageResponse(res, page, size)));
  }

  findById(id: string): Observable<PerPartResponse> {
    return this.http.get<PerPartResponse>(`${this.API}/${id}`);
  }

  create(record: PerPartRequest): Observable<PerPartResponse> {
    return this.http.post<PerPartResponse>(this.API, record);
  }

  update(id: string, record: PerPartRequest): Observable<PerPartResponse> {
    return this.http.put<PerPartResponse>(`${this.API}/${id}`, record);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.API}/${id}`);
  }

  private normalizePageResponse(
    res: PageResponse<PerPartResponse> | PerPartResponse[] | Record<string, unknown>,
    page: number,
    size: number
  ): PageResponse<PerPartResponse> {
    if (Array.isArray(res)) {
      const totalElements = res.length;
      const start = page * size;
      const content = res.slice(start, start + size);
      return { content, totalElements, number: page, size };
    }

    const r = res as PageResponse<PerPartResponse> & { content?: PerPartResponse[] };
    const content = r.content ?? [];
    const totalElements = typeof r.totalElements === 'number' ? r.totalElements : content.length;
    const number = typeof r.number === 'number' ? r.number : page;
    const sz = typeof r.size === 'number' ? r.size : size;
    return { content, totalElements, number, size: sz };
  }
}
