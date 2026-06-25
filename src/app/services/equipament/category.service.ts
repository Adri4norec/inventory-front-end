import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CategoryRequest, CategoryResponse } from '../../models/equipaments/equipament.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  private readonly API = `${environment.apiUrl}/api/v1/categories`;

  constructor(private httpClient: HttpClient) { }

  listAll(): Observable<CategoryResponse[]> {
    return this.httpClient.get<CategoryResponse[]>(this.API);
  }

  findById(id: string): Observable<CategoryResponse> {
    return this.httpClient.get<CategoryResponse>(`${this.API}/${id}`);
  }

  create(request: CategoryRequest): Observable<CategoryResponse> {
    return this.httpClient.post<CategoryResponse>(this.API, request);
  }

  update(id: string, request: CategoryRequest): Observable<CategoryResponse> {
    return this.httpClient.put<CategoryResponse>(`${this.API}/${id}`, request);
  }

  delete(id: string): Observable<void> {
    return this.httpClient.delete<void>(`${this.API}/${id}`);
  }
}
