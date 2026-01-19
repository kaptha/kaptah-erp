import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MonedaService {
  private apiUrl = 'http://localhost:3001/moneda'; // Ajusta la URL según tu configuración

  constructor(private http: HttpClient) { }

  buscarMoneda(termino: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/buscar?termino=${termino}`);
  }
}