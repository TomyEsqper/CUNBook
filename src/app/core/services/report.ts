import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { notAvailable } from '../api/backend';
import { ReportSummary } from '../models/report';
import { MockDb } from './mock-db';

@Injectable({
  providedIn: 'root',
})
export class ReportService {
  private readonly mock = inject(MockDb);

  summary(): Observable<ReportSummary> {
    return environment.useMocks ? this.mock.run(() => this.mock.report()) : notAvailable('Los reportes');
  }
}
