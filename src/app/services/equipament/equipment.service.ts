import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { map, tap } from 'rxjs/operators';

import {
  EquipmentRequest,
  EquipmentResponse,
  PageResponse,
} from '../../models/equipaments/equipament.model';
import {
  EquipmentListOptions,
  EquipmentSearchFilters,
} from '../../models/equipaments/equipment-search.filters';
import { normalizePageResponse } from '../../core/http/page-response.util';
import { environment } from '../../../environments/environment';
import {
  buildEquipmentSearchParams,
  withEquipmentDefaultSort,
} from './equipment-query.mapper';

@Injectable({ providedIn: 'root' })
export class EquipamentService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/v1/equipments`;

  private readonly equipmentPhotosRefresh$ = new Subject<string>();
  readonly onEquipmentPhotosRefresh$ = this.equipmentPhotosRefresh$.asObservable();

  list(
    page: number,
    size: number,
    options: EquipmentListOptions = {},
  ): Observable<PageResponse<EquipmentResponse>> {
    const { disponivel = false, proprietaryId = null } = options;

    let params = new HttpParams()
      .set('page', String(page))
      .set('size', String(size))
      .set('apenasDisponiveis', String(disponivel));

    if (proprietaryId) {
      params = params.set('proprietaryId', proprietaryId);
    }

    params = withEquipmentDefaultSort(params);

    return this.http
      .get<PageResponse<EquipmentResponse> | EquipmentResponse[]>(this.baseUrl, { params })
      .pipe(map((res) => normalizePageResponse(res, page, size)));
  }

  save(record: EquipmentRequest): Observable<EquipmentResponse> {
    return this.http.post<EquipmentResponse>(this.baseUrl, record);
  }

  findById(id: string): Observable<EquipmentResponse> {
    return this.http.get<EquipmentResponse>(`${this.baseUrl}/${id}`);
  }

  advancedSearch(
    filters: EquipmentSearchFilters,
    page: number,
    size: number,
  ): Observable<PageResponse<EquipmentResponse>> {
    const params = buildEquipmentSearchParams(filters, page, size);

    return this.http
      .get<PageResponse<EquipmentResponse> | EquipmentResponse[]>(`${this.baseUrl}/advanced-search`, { params })
      .pipe(map((res) => normalizePageResponse(res, page, size)));
  }

  deleteEquipment(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  /** @deprecated Use deleteEquipment */
  delete(id: string): Observable<void> {
    return this.deleteEquipment(id);
  }

  update(id: string, record: EquipmentRequest): Observable<EquipmentResponse> {
    return this.http.put<EquipmentResponse>(`${this.baseUrl}/${id}`, record);
  }

  syncEquipmentPhotos(id: string): Observable<EquipmentResponse> {
    const params = new HttpParams().set('src', Date.now().toString());
    return this.http.get<EquipmentResponse>(`${this.baseUrl}/${id}`, { params }).pipe(
      tap(() => this.equipmentPhotosRefresh$.next(id)),
    );
  }

  uploadImages(id: string, files: File[]): Observable<EquipmentResponse> {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    return this.http.post<EquipmentResponse>(`${this.baseUrl}/${id}/images`, formData);
  }

  manageImages(id: string, keepUrls: string[], newFiles: File[]): Observable<string[]> {
    const formData = new FormData();
    formData.append('keepUrls', new Blob([JSON.stringify(keepUrls)], { type: 'application/json' }));
    newFiles.forEach((file) => formData.append('files', file));
    return this.http.put<string[]>(`${this.baseUrl}/${id}/images`, formData);
  }

  search(
    term: string,
    page: number,
    size: number,
  ): Observable<PageResponse<EquipmentResponse>> {
    let params = new HttpParams()
      .set('term', term)
      .set('page', String(page))
      .set('size', String(size));

    params = withEquipmentDefaultSort(params);

    return this.http
      .get<PageResponse<EquipmentResponse> | EquipmentResponse[]>(`${this.baseUrl}/search`, { params })
      .pipe(map((res) => normalizePageResponse(res, page, size)));
  }
}
