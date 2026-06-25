import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ProprietaryRequest, ProprietaryResponse } from '../../models/proprietaries/proprietary';
import { environment } from '../../../environments/environment';

/**
 * API: /api/v1/proprietaries
 * - GET /           → lista ordenada por name ASC
 * - GET /{id}       → 404 ProprietaryNotFoundException
 * - POST /          → 201; 400 "Proprietário já cadastrado" (ignore case)
 * - PUT /{id}       → 404 ou 400 nome duplicado
 * - DELETE /{id}    → 204; 404 se não existir
 * Request/Response: { id: uuid, name: string }
 */
@Injectable({
  providedIn: 'root'
})
export class ProprietaryService {
  private readonly API = `${environment.apiUrl}/api/v1/proprietaries`;

  constructor(private httpClient: HttpClient) { }

  listAll(): Observable<ProprietaryResponse[]> {
    return this.httpClient.get<ProprietaryResponse[]>(this.API);
  }

  findById(id: string): Observable<ProprietaryResponse> {
    return this.httpClient.get<ProprietaryResponse>(`${this.API}/${id}`);
  }

  create(request: ProprietaryRequest): Observable<ProprietaryResponse> {
    return this.httpClient.post<ProprietaryResponse>(this.API, request);
  }

  update(id: string, request: ProprietaryRequest): Observable<ProprietaryResponse> {
    return this.httpClient.put<ProprietaryResponse>(`${this.API}/${id}`, request);
  }

  delete(id: string): Observable<void> {
    return this.httpClient.delete<void>(`${this.API}/${id}`);
  }
}