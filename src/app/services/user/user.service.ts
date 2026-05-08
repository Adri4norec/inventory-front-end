import { HttpBackend, HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { UserRequest } from '../../models/users/UserRequest';
import { LoginRequest } from '../../models/auth/LoginRequest';
import { UserResponse } from '../../models/users/UserResponse';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly API = `${environment.apiUrl}/api/v1/users`;
  private readonly rawHttp: HttpClient;

  constructor(private http: HttpClient, httpBackend: HttpBackend) {
    // HttpClient sem interceptors: login não pode enviar Bearer antigo/inválido.
    this.rawHttp = new HttpClient(httpBackend);
  }

  login(credentials: LoginRequest): Observable<UserResponse> {
    return this.rawHttp.post<UserResponse>(`${this.API}/login`, credentials);
  }

  create(userData: UserRequest): Observable<UserResponse> {
    return this.http.post<UserResponse>(this.API, userData);
  }

  listAll(page: number = 0, size: number = 10): Observable<any> {
  return this.http.get<any>(`${this.API}?page=${page}&size=${size}`);
}

  findById(id: string): Observable<UserResponse> {
    return this.http.get<UserResponse>(`${this.API}/${id}`);
  }

  update(id: string, userData: UserRequest): Observable<UserResponse> {
    return this.http.put<UserResponse>(`${this.API}/${id}`, userData);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.API}/${id}`);
  }
}