import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MonedaService {
  private apiUrl = 'https://grateful-courage-production-4de4.up.railway.app/moneda'; // Ajusta la URL segÃºn tu configuraciÃ³n

  constructor(private http: HttpClient) { }

  buscarMoneda(termino: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/buscar?termino=${termino}`);
  }
}
