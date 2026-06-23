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

  create(request: CategoryRequest): Observable<CategoryResponse> {
    return this.httpClient.post<CategoryResponse>(this.API, request);
  }
}
