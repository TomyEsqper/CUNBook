import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DashboardStats } from '../models/report';
import { MockDb } from './mock-db';

@Injectable({
  providedIn: 'root',
})
export class ReportService {
  private readonly http = inject(HttpClient);
  private readonly mock = inject(MockDb);

  /** GET /api/admin/statistics. Solo administradores. */
  summary(): Observable<DashboardStats> {
    return environment.useMocks
      ? this.mock.run(() => this.mock.report())
      : this.http.get<DashboardStats>(`${environment.apiUrl}/admin/statistics`);
  }
}
