import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { UserRequest } from '../../models/users/UserRequest';
import { UserResponse } from '../../models/users/UserResponse';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly API = 'http://localhost:8080/api/v1/users';

  constructor(private http: HttpClient) { }

  login(credentials: UserRequest): Observable<UserResponse> {
    return this.http.post<UserResponse>(`${this.API}/login`, credentials);
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