import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ProprietaryRequest, ProprietaryResponse } from '../../models/proprietaries/proprietary';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ProprietaryService {
  private readonly API = `${environment.apiUrl}/api/v1/proprietaries`;

  constructor(private httpClient: HttpClient) { }

  listAll(): Observable<ProprietaryResponse[]> {
    return this.httpClient.get<ProprietaryResponse[]>(this.API);
  }

  create(request: ProprietaryRequest): Observable<ProprietaryResponse> {
    return this.httpClient.post<ProprietaryResponse>(this.API, request);
  }
}