import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
@Injectable({
  providedIn: 'root'
})
export class ClaveProdServService {
  private apiUrl = 'http://localhost:3001/clave-prod-serv'; // Ajusta la URL según tu configuración

  constructor(private http: HttpClient) { }

  buscarClaveProdServ(termino: string): Observable<any[]> {
  return this.http.get<any[]>(`${this.apiUrl}/buscar?termino=${termino}`).pipe(
    tap(response => console.log('Respuesta del servicio:', response))
  );
}
}