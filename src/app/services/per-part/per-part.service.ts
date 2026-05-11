import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import { PerPartRequest, PerPartResponse } from '../../models/per-part/per-part.model';

export interface PerPartPage {
  content: PerPartResponse[];
  totalElements: number;
  number: number;
  size: number;
}

@Injectable({ providedIn: 'root' })
export class PerPartService {
  private readonly API = `${environment.apiUrl}/api/v1/per-parts`;

  constructor(private http: HttpClient) {}

  /**
   * Lista paginada (Spring Page: page, size, sort) ou fallback se a API retornar array completo.
   */
  listPaged(page: number, size: number): Observable<PerPartPage> {
    const params = new HttpParams()
      .set('page', String(page))
      .set('size', String(size))
      .set('sort', 'id,desc');

    return this.http.get<PerPartPage | PerPartResponse[]>(this.API, { params }).pipe(
      map((res) => this.normalizePageResponse(res, page, size))
    );
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
    res: PerPartPage | PerPartResponse[] | Record<string, unknown>,
    page: number,
    size: number
  ): PerPartPage {
    if (Array.isArray(res)) {
      const totalElements = res.length;
      const start = page * size;
      const content = res.slice(start, start + size);
      return { content, totalElements, number: page, size };
    }

    const r = res as PerPartPage & { content?: PerPartResponse[] };
    const content = r.content ?? [];
    const totalElements = typeof r.totalElements === 'number' ? r.totalElements : content.length;
    const number = typeof r.number === 'number' ? r.number : page;
    const sz = typeof r.size === 'number' ? r.size : size;
    return { content, totalElements, number, size: sz };
  }
}
