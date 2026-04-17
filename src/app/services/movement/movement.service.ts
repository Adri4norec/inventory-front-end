import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MovementRequest, MovementResponse } from './../../models/movement/movement.model';

@Injectable({ providedIn: 'root' })
export class MovementService {
  private readonly API = 'http://localhost:8080/api/v1/movements';

  constructor(private http: HttpClient) { }

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
    return this.http.post<MovementResponse>(this.API, record);
  }

  findById(id: string): Observable<MovementResponse> {
    return this.http.get<MovementResponse>(`${this.API}/${id}`);
  }

  uploadImages(id: string, files: File[]): Observable<any> { 
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });
  
    return this.http.post(`${this.API}/${id}/images`, formData, { responseType: 'text' });
  }
}