import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { switchMap, catchError, filter, take } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';

@Injectable()
export class TokenInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private refreshTokenSubject: BehaviorSubject<any> = new BehaviorSubject<any>(null);

  constructor(private authService: AuthService) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
  // 🔹 Lista de URLs que requieren autenticación
  const requiresAuth = [
    'localhost:4000',  // sales-api
    'localhost:3003',// cfdi-receiver-api
    'localhost:3004', 
    'localhost:3005', 
    'localhost:3001',  // otros backends
    'localhost:3002'   // otros backends
  ];

  // ⭐ NUEVO: URLs que deben usar idToken de Firebase en lugar de JWT
  const requiresFirebaseToken = [
    '/pdf/',  // Endpoints de PDF
    'localhost:4005', 
    'localhost:3004'
  ];

  // Verificar si la URL requiere token de Firebase
  const needsFirebaseToken = requiresFirebaseToken.some(url => request.url.includes(url));

  // Verificar si la URL requiere autenticación
  const needsToken = requiresAuth.some(url => request.url.includes(url));

  console.log('🔹 Interceptor - URL:', request.url);
  console.log('🔹 Interceptor - Requiere token:', needsToken);
  console.log('🔹 Interceptor - Requiere Firebase token:', needsFirebaseToken);

  // ⭐ NUEVO: Si requiere Firebase token, usar idToken
  if (needsFirebaseToken) {
    console.log('🔥 Usando idToken de Firebase para esta petición');
    return next.handle(this.addFirebaseToken(request)).pipe(
      catchError(error => {
        if (error instanceof HttpErrorResponse && error.status === 401) {
          console.log('❌ Error 401 detectado');
        }
        return throwError(() => error);
      })
    );
  }

  if (needsToken) {
    // Agregar token JWT si la URL lo requiere
    return next.handle(this.addToken(request)).pipe(
      catchError(error => {
        if (error instanceof HttpErrorResponse && error.status === 401) {
          console.log('❌ Error 401 detectado, intentando refresh token...');
          return this.handle401Error(request, next);
        }
        return throwError(() => error);
      })
    );
  }

  // Si no requiere token, pasar la petición sin modificar
  return next.handle(request);
}
// ⭐ NUEVO: Método para agregar token de Firebase
private addFirebaseToken(request: HttpRequest<any>) {
  const idToken = localStorage.getItem('idToken');
  
  console.log('🔥 Firebase token encontrado:', idToken ? idToken.substring(0, 50) + '...' : 'NO HAY TOKEN');
  
  if (idToken) {
    const modifiedRequest = request.clone({
      setHeaders: {
        'Authorization': `Bearer ${idToken}`
      }
    });
    
    console.log('✅ Headers con Firebase token:', modifiedRequest.headers.keys());
    return modifiedRequest;
  }
  
  console.log('⚠️ No se encontró idToken en localStorage');
  return request;
}

  private addToken(request: HttpRequest<any>) {
    // 🔹 Buscar el token correcto (primero access_token, luego jwt_token por compatibilidad)
    const token = localStorage.getItem('access_token') || localStorage.getItem('jwt_token');
    
    console.log('🔹 Token encontrado:', token ? token.substring(0, 20) + '...' : 'NO HAY TOKEN');
    
    if (token) {
      // Solo agregar Authorization header, NO sobrescribir Content-Type
      const modifiedRequest = request.clone({
        setHeaders: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('✅ Headers después de agregar token:', modifiedRequest.headers.keys());
      return modifiedRequest;
    }
    
    console.log('⚠️ No se encontró token en localStorage');
    return request;
  }

  private handle401Error(request: HttpRequest<any>, next: HttpHandler) {
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshTokenSubject.next(null);

      const refreshToken = localStorage.getItem('refresh_token');

      if (refreshToken) {
        console.log('🔄 Intentando refrescar token...');
        
        return this.authService.refreshToken(refreshToken).pipe(
          switchMap((response) => {
            this.isRefreshing = false;
            this.refreshTokenSubject.next(response.access_token);
            
            console.log('✅ Token refrescado, reintentando petición original...');
            return next.handle(this.addToken(request));
          }),
          catchError((err) => {
            this.isRefreshing = false;
            console.log('❌ Error al refrescar token, intentando reconvertir idToken...');
            
            // Si falla el refresh, intentar reconvertir el idToken de Firebase
            const idToken = localStorage.getItem('idToken');
            if (idToken) {
              return this.authService.convertToJWT(idToken).pipe(
                switchMap(response => {
                  console.log('✅ idToken reconvertido, reintentando petición...');
                  return next.handle(this.addToken(request));
                }),
                catchError(convertError => {
                  console.log('❌ Error al reconvertir idToken, redirigiendo a login...');
                  // Limpiar todo y redirigir a login
                  this.authService.logout();
                  return throwError(() => convertError);
                })
              );
            }
            
            console.log('❌ No hay idToken disponible, redirigiendo a login...');
            this.authService.logout();
            return throwError(() => err);
          })
        );
      } else {
        console.log('❌ No hay refresh_token disponible');
        this.isRefreshing = false;
        this.authService.logout();
        return throwError(() => new Error('No refresh token available'));
      }
    }

    // Si ya estamos refrescando, esperar al resultado
    return this.refreshTokenSubject.pipe(
      filter(token => token !== null),
      take(1),
      switchMap(() => {
        console.log('✅ Token actualizado desde otro request, reintentando...');
        return next.handle(this.addToken(request));
      })
    );
  }
}