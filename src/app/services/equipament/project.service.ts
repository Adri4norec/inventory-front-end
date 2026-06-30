import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ProjectRequest, ProjectResponse } from '../../models/projects/project';
import { environment } from '../../../environments/environment';

/**
 * API: /api/v1/projects
 * - GET /           → lista ativos ordenados por name ASC
 * - GET /{id}       → 404 PROJECT_NOT_FOUND
 * - POST /          → 201; 400 "Projeto já cadastrado" (ignore case)
 * - PUT /{id}       → 404 ou 400 nome duplicado
 * - DELETE /{id}    → 204; 404 se não existir
 */
@Injectable({
  providedIn: 'root'
})
export class ProjectService {
  private readonly API = `${environment.apiUrl}/api/v1/projects`;

  constructor(private httpClient: HttpClient) { }

  listAll(): Observable<ProjectResponse[]> {
    return this.httpClient.get<ProjectResponse[]>(this.API);
  }

  findById(id: string): Observable<ProjectResponse> {
    return this.httpClient.get<ProjectResponse>(`${this.API}/${id}`);
  }

  create(request: ProjectRequest): Observable<ProjectResponse> {
    return this.httpClient.post<ProjectResponse>(this.API, request);
  }

  update(id: string, request: ProjectRequest): Observable<ProjectResponse> {
    return this.httpClient.put<ProjectResponse>(`${this.API}/${id}`, request);
  }

  delete(id: string): Observable<void> {
    return this.httpClient.delete<void>(`${this.API}/${id}`);
  }
}
