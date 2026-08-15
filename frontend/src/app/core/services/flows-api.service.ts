import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CreateFlowRequest,
  Flow,
  UpdateFlowRequest,
} from '../models/flow.model';

@Injectable({ providedIn: 'root' })
export class FlowsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/flows`;

  getAll(): Observable<Flow[]> {
    return this.http.get<Flow[]>(this.baseUrl);
  }

  getById(id: string): Observable<Flow> {
    return this.http.get<Flow>(`${this.baseUrl}/${id}`);
  }

  create(payload: CreateFlowRequest): Observable<Flow> {
    return this.http.post<Flow>(this.baseUrl, payload);
  }

  update(id: string, payload: UpdateFlowRequest): Observable<Flow> {
    return this.http.patch<Flow>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  duplicate(id: string, name: string): Observable<Flow> {
    return this.http.post<Flow>(`${this.baseUrl}/${id}/duplicate`, { name });
  }
}
