import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
@Injectable({
  providedIn: 'root'
})
export class ClaveProdServService {
  private apiUrl = 'https://grateful-courage-production-4de4.up.railway.app/clave-prod-serv'; // Ajusta la URL segÃºn tu configuraciÃ³n

  constructor(private http: HttpClient) { }

  buscarClaveProdServ(termino: string): Observable<any[]> {
  return this.http.get<any[]>(`${this.apiUrl}/buscar?termino=${termino}`).pipe(
    tap(response => console.log('Respuesta del servicio:', response))
  );
}
}
