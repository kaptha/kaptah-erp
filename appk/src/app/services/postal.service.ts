import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
interface Postal {
  codigo: string;
  // Añade otras propiedades si las hay
}
@Injectable({
  providedIn: 'root'
})
export class PostalService {
  private apiUrl = 'http://localhost:3001/postal'; 

  constructor(private http: HttpClient) {}

  buscarCodigosPostales(prefijo: string): Observable<string[]> {
    return this.http.get<Postal[]>(`${this.apiUrl}/buscar-codigos?prefijo=${prefijo}`)
      .pipe(
        map((postales: Postal[]) => postales.map(postal => postal.codigo))
      );
  }

  buscarColonias(codigoPostal: string): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/buscar-colonias?codigoPostal=${codigoPostal}`);
  }
}