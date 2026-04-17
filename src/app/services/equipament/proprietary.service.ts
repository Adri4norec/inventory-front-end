import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ProprietaryResponse } from '../../models/proprietaries/proprietary';

@Injectable({
  providedIn: 'root'
})
export class ProprietaryService {
  private readonly API = 'http://localhost:8080/api/v1/proprietaries';

  constructor(private httpClient: HttpClient) { }

  listAll(): Observable<ProprietaryResponse[]> {
    return this.httpClient.get<ProprietaryResponse[]>(this.API);
  }
}