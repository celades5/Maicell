import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ComponentDefinition } from '../models/component-definition.model';

@Injectable({ providedIn: 'root' })
export class ComponentDefinitionsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/component-definitions`;

  getAll(): Observable<ComponentDefinition[]> {
    return this.http.get<ComponentDefinition[]>(this.baseUrl);
  }
}
