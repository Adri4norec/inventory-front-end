import { HttpBackend, HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { UserRequest } from '../../models/users/UserRequest';
import { LoginRequest } from '../../models/auth/LoginRequest';
import { UserResponse } from '../../models/users/UserResponse';
import { PageResponse } from '../../models/equipaments/equipament.model';
import {
  ProfileApiRequest,
  ProfileApiResponse,
} from '../../models/users/profile-api.model';
import { environment } from '../../../environments/environment';

export interface UserSearchFilters {
  nome?: string;
  email?: string;
  usuario?: string;
}

export interface Pageable {
  page: number;
  size: number;
  sort?: string | string[];
}

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
    return this.rawHttp.post<UserResponse>(`${this.API}/login`, {
      username: credentials.username,
      password: credentials.password,
      authType: credentials.authType ?? 'LDAP',
    });
  }

  create(userData: UserRequest): Observable<UserResponse> {
    return this.http.post<UserResponse>(this.API, userData);
  }

  listAll(page: number = 0, size: number = 10): Observable<any> {
    return this.http.get<any>(`${this.API}?page=${page}&size=${size}`);
  }

  advancedSearch(
    filters: UserSearchFilters,
    pageable: Pageable
  ): Observable<PageResponse<UserResponse>> {
    let params = new HttpParams()
      .set('page', pageable.page.toString())
      .set('size', pageable.size.toString());

    const nome = filters.nome?.trim();
    const email = filters.email?.trim();
    const usuario = filters.usuario?.trim();

    if (nome) params = params.set('nome', nome);
    if (email) params = params.set('email', email);
    if (usuario) params = params.set('usuario', usuario);

    const sorts = pageable.sort
      ? (Array.isArray(pageable.sort) ? pageable.sort : [pageable.sort])
      : ['fullName,asc'];

    sorts.forEach((sort) => {
      params = params.append('sort', sort);
    });

    return this.http.get<PageResponse<UserResponse>>(`${this.API}/advanced-search`, { params });
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

  listProfiles(): Observable<ProfileApiResponse[]> {
    return this.http.get<ProfileApiResponse[]>(`${this.API}/profiles`);
  }

  getProfileById(id: string): Observable<ProfileApiResponse> {
    return this.http.get<ProfileApiResponse>(`${this.API}/profiles/${id}`);
  }

  createProfile(payload: ProfileApiRequest): Observable<ProfileApiResponse> {
    return this.http.post<ProfileApiResponse>(`${this.API}/profiles`, payload);
  }

  updateProfile(id: string, payload: ProfileApiRequest): Observable<ProfileApiResponse> {
    return this.http.put<ProfileApiResponse>(`${this.API}/profiles/${id}`, payload);
  }

  deleteProfile(id: string): Observable<void> {
    return this.http.delete<void>(`${this.API}/profiles/${id}`);
  }
}