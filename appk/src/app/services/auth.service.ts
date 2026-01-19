import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Router } from '@angular/router';

interface AuthResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: {
    uid: string;
    email: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:4000'; // sales-api URL
  private currentUserSubject = new BehaviorSubject<any>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    // Cargar usuario del localStorage al iniciar
    const user = this.getUserFromStorage();
    if (user) {
      this.currentUserSubject.next(user);
    }
  }

  /**
   * Login con Firebase token
   */
  login(firebaseToken: string): Observable<AuthResponse> {
    console.log('🔹 AuthService: Intentando login...');
    
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login`, {
      firebaseToken
    }).pipe(
      tap(response => {
        console.log('✅ AuthService: Login exitoso');
        this.saveTokens(response);
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Refrescar access token usando refresh token
   */
  refreshToken(refreshToken: string): Observable<AuthResponse> {
    console.log('🔄 AuthService: Refrescando token...');
    
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/refresh`, {
      refresh_token: refreshToken
    }).pipe(
      tap(response => {
        console.log('✅ AuthService: Token refrescado exitosamente');
        this.saveTokens(response);
      }),
      catchError(error => {
        console.error('❌ AuthService: Error al refrescar token');
        this.logout();
        return throwError(() => error);
      })
    );
  }

  /**
   * Convertir Firebase ID token a JWT
   */
  convertToJWT(idToken: string): Observable<AuthResponse> {
    console.log('🔄 AuthService: Convirtiendo Firebase token a JWT...');
    
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/convert`, {
      idToken
    }).pipe(
      tap(response => {
        console.log('✅ AuthService: Token convertido exitosamente');
        this.saveTokens(response);
      }),
      catchError(error => {
        console.error('❌ AuthService: Error al convertir token');
        return throwError(() => error);
      })
    );
  }

  /**
   * Guardar tokens en localStorage
   */
  private saveTokens(response: AuthResponse): void {
    localStorage.setItem('access_token', response.access_token);
    localStorage.setItem('refresh_token', response.refresh_token);
    localStorage.setItem('user', JSON.stringify(response.user));
    
    this.currentUserSubject.next(response.user);
    
    console.log('💾 Tokens guardados en localStorage');
  }

  /**
   * Obtener usuario del localStorage
   */
  private getUserFromStorage(): any {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  /**
   * Cerrar sesión - MEJORADO para limpiar TODOS los tokens
   */
  logout(): void {
    console.log('👋 AuthService: Cerrando sesión...');
    
    // Limpiar JWT tokens
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    
    // Limpiar Firebase tokens
    localStorage.removeItem('idToken');
    localStorage.removeItem('expiresIn');
    
    // Limpiar cualquier otro dato de sesión
    localStorage.removeItem('jwt_token'); // Por si existe el nombre antiguo
    
    // Resetear el subject
    this.currentUserSubject.next(null);
    
    console.log('✅ Todos los tokens eliminados');
    
    // Redirigir al login
    this.router.navigate(['/login']);
  }

  /**
   * Obtener access token
   */
  getAccessToken(): string | null {
    return localStorage.getItem('access_token');
  }

  /**
   * Obtener refresh token
   */
  getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  }

  /**
   * Verificar si el usuario está autenticado
   */
  isAuthenticated(): boolean {
    // Verificar si existe JWT O Firebase token
    const hasJWT = !!this.getAccessToken();
    const hasFirebase = !!localStorage.getItem('idToken');
    return hasJWT || hasFirebase;
  }

  /**
   * Obtener usuario actual
   */
  getCurrentUser(): any {
    return this.currentUserSubject.value;
  }

  /**
   * Manejo de errores
   */
  private handleError(error: HttpErrorResponse) {
    console.error('❌ Error en AuthService:', error);
    
    let errorMessage = 'Ha ocurrido un error';
    
    if (error.error instanceof ErrorEvent) {
      // Error del lado del cliente
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Error del lado del servidor
      errorMessage = `Código de error: ${error.status}\nMensaje: ${error.error?.message || error.message}`;
    }
    
    return throwError(() => new Error(errorMessage));
  }
}