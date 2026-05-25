import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { EquipmentLoanResponse, 
  EquipmentRequest, 
  EquipmentResponse, 
  LoanRequest, 
  PageResponse 
} from '../../models/equipaments/equipament.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class EquipamentService {
  private readonly API = `${environment.apiUrl}/api/v1/equipments`;

  constructor(private http: HttpClient) { }

  private withDefaultSort(params: HttpParams): HttpParams {
    return params
      .append('sort', 'dateHour,desc')
      .append('sort', 'id,desc');
  }

  list(
    page: number,
    size: number,
    disponivel: boolean = false,
    proprietaryId: string | null = null
  ): Observable<any> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('apenasDisponiveis', disponivel.toString());

    if (proprietaryId) {
      params = params.set('proprietaryId', proprietaryId);
    }

    params = this.withDefaultSort(params);
    return this.http.get<any>(this.API, { params });
  }

  save(record: EquipmentRequest): Observable<EquipmentResponse> {
    return this.http.post<EquipmentResponse>(this.API, record);
  }


  findById(id: string): Observable<EquipmentResponse> {
    return this.http.get<EquipmentResponse>(`${this.API}/${id}`);
  }

  advancedSearch(filtros: any, page: number, size: number): Observable<any> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    if (filtros.nome) params = params.set('nome', filtros.nome);
    if (filtros.categoria) params = params.set('categoria', filtros.categoria);
    if (filtros.tombo) params = params.set('tombo', filtros.tombo);
    if (filtros.caracteristicas) params = params.set('caracteristicas', filtros.caracteristicas);

    const selectedStatuses: string[] = filtros.statuses ?? [];
    if (selectedStatuses.length > 0) {
      selectedStatuses.forEach((statusValue: string) => {
        params = params.append('status', statusValue);
      });
    }

    if (filtros.dataInicio) {
      const dataInicioFormatada = new Date(filtros.dataInicio).toISOString().split('T')[0];
      params = params.set('dataInicio', dataInicioFormatada);
    }
    
    if (filtros.dataFim) {
      const dataFimFormatada = new Date(filtros.dataFim).toISOString().split('T')[0];
      params = params.set('dataFim', dataFimFormatada);
    }

    params = this.withDefaultSort(params);
    return this.http.get<any>(`${this.API}/advanced-search`, { params });
  }
  
  deleteEquipment(id: string): Observable<void> {
    return this.http.delete<void>(`${this.API}/${id}`);
  }

  /** @deprecated Use deleteEquipment */
  delete(id: string): Observable<void> {
    return this.deleteEquipment(id);
  }

  update(id: string, record: EquipmentRequest): Observable<EquipmentResponse> {
    return this.http.put<EquipmentResponse>(`${this.API}/${id}`, record);
  }

  private readonly equipmentPhotosRefresh$ = new Subject<string>();
  readonly onEquipmentPhotosRefresh$ = this.equipmentPhotosRefresh$.asObservable();

  syncEquipmentPhotos(id: string): Observable<EquipmentResponse> {
    const params = new HttpParams().set('src', Date.now().toString());
    return this.http.get<EquipmentResponse>(`${this.API}/${id}`, { params }).pipe(
      tap(() => this.equipmentPhotosRefresh$.next(id))
    );
  }

  uploadImages(id: string, files: File[]): Observable<EquipmentResponse> {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });
    return this.http.post<EquipmentResponse>(`${this.API}/${id}/images`, formData);
  }

  manageImages(id: string, keepUrls: string[], newFiles: File[]): Observable<string[]> {
    console.log('[EquipamentService.manageImages] URL:', `${this.API}/${id}/images`);
    console.log('[EquipamentService.manageImages] keepUrls:', JSON.stringify(keepUrls));
    console.log('[EquipamentService.manageImages] newFiles:', newFiles.length);
    const formData = new FormData();
    formData.append('keepUrls', new Blob([JSON.stringify(keepUrls)], { type: 'application/json' }));
    newFiles.forEach(file => formData.append('files', file));
    return this.http.put<string[]>(`${this.API}/${id}/images`, formData);
  }

  search(
    term: string,
    page: number,
    size: number
  ): Observable<any> {
    const params = new HttpParams()
      .set('term', term)
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get<any>(`${this.API}/search`, { params: this.withDefaultSort(params) });
  }
}