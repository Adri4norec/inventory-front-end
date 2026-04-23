import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { EquipmentRequest, EquipmentResponse, PageResponse } from '../../models/equipaments/equipament.model';

@Injectable({ providedIn: 'root' })
export class EquipamentService {
  private readonly API = 'http://localhost:8080/api/v1/equipments';

  constructor(private http: HttpClient) { }

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

    return this.http.get<any>(this.API, { params });
  }

  save(record: EquipmentRequest): Observable<EquipmentResponse> {
    return this.http.post<EquipmentResponse>(this.API, record);
  }

  findById(id: string): Observable<EquipmentResponse> {
    return this.http.get<EquipmentResponse>(`${this.API}/${id}`);
  }
  // ... seus outros métodos (findById, update, search, etc) ficam acima

  advancedSearch(filtros: any, page: number, size: number): Observable<any> {
    // 1. Parâmetros de paginação padrão
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    // 2. Adiciona os filtros de texto apenas se o usuário digitou algo
    if (filtros.nome) params = params.set('nome', filtros.nome);
    if (filtros.categoria) params = params.set('categoria', filtros.categoria);
    if (filtros.tombo) params = params.set('tombo', filtros.tombo);
    if (filtros.caracteristicas) params = params.set('caracteristicas', filtros.caracteristicas);
    if (filtros.status) params = params.set('status', filtros.status);

    // 3. Tratamento das Datas (Converte o objeto Date do Angular para a String 'YYYY-MM-DD' do SQL/Java)
    if (filtros.dataInicio) {
      const dataInicioFormatada = new Date(filtros.dataInicio).toISOString().split('T')[0];
      params = params.set('dataInicio', dataInicioFormatada);
    }
    
    if (filtros.dataFim) {
      const dataFimFormatada = new Date(filtros.dataFim).toISOString().split('T')[0];
      params = params.set('dataFim', dataFimFormatada);
    }

    // 4. Dispara a requisição para um novo endpoint dedicado à busca avançada
    return this.http.get<any>(`${this.API}/advanced-search`, { params });
  }
  
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.API}/${id}`);
  }

  update(id: string, record: EquipmentRequest): Observable<EquipmentResponse> {
    return this.http.put<EquipmentResponse>(`${this.API}/${id}`, record);
  }

  uploadImages(id: string, files: File[]): Observable<EquipmentResponse> {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });
    return this.http.post<EquipmentResponse>(`${this.API}/${id}/images`, formData);
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

    return this.http.get<any>(`${this.API}/search`, { params });
  }
}