import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MovementRequest, MovementResponse } from './../../models/movement/movement.model';
import { UserSearchResponse } from '../../models/loans/loans.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class MovementService {
  private readonly API = `${environment.apiUrl}/api/v1/movements`;

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) { }

  private getOptions() {
    let headers = new HttpHeaders();
    if (isPlatformBrowser(this.platformId)) {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      if (token) headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return { headers };
  }

  findHistoryByEquipament(
    equipamentId: string,
    page: number = 0,
    size: number = 10
  ): Observable<any> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get<any>(`${this.API}/equipament/${equipamentId}`, { params });
  }

  save(record: MovementRequest): Observable<MovementResponse> {
    return this.http.post<MovementResponse>(this.API, record, this.getOptions());
  }

  findById(id: string): Observable<MovementResponse> {
    return this.http.get<MovementResponse>(`${this.API}/${id}`, this.getOptions());
  }

  uploadImages(id: string, files: File[]): Observable<any> {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    return this.http.post(`${this.API}/${id}/images`, formData, { ...this.getOptions(), responseType: 'text' });
  }

  searchUsers(nome: string): Observable<UserSearchResponse[]> {
    const options = this.getOptions();
    const params = new HttpParams().set('nome', nome);
    return this.http.get<UserSearchResponse[]>(`${this.API}/search-users`, { ...options, params });
  }

  resolveImageUrl(fileName: string): string {
    return `${environment.apiUrl}/uploads/${fileName}`;
  }
}