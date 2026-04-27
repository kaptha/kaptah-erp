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
  const requiresAuth = [
    'localhost:4000',
    'localhost:3003',
    'localhost:3004', 
    'localhost:3005', 
    'localhost:3001',
    'localhost:3002',
    'extraordinary-beauty-production-78f6.up.railway.app'
  ];

  const requiresFirebaseToken = [
    '/pdf/',
    'localhost:4005', 
    'localhost:3004',
    'selfless-analysis-production',
    'kaptah-erp-production'
  ];

  const needsFirebaseToken = requiresFirebaseToken.some(url => request.url.includes(url));
  const needsToken = requiresAuth.some(url => request.url.includes(url));

  console.log('🔹 Interceptor - URL:', request.url);
  console.log('🔹 Interceptor - Requiere token:', needsToken);
  console.log('🔹 Interceptor - Requiere Firebase token:', needsFirebaseToken);

  if (needsFirebaseToken) {
    console.log('🔥 Usando idToken de Firebase para esta peticion');
    return next.handle(this.addFirebaseToken(request)).pipe(
      catchError(error => {
        if (error instanceof HttpErrorResponse && error.status === 401) {
          console.log('❌ Error 401 detectado, refrescando Firebase token...');
          return this.handleFirebase401(request, next);
        }
        return throwError(() => error);
      })
    );
  }

  if (needsToken) {
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

  return next.handle(request);
}

private addFirebaseToken(request: HttpRequest<any>) {
  const idToken = localStorage.getItem('idToken');
  
  if (idToken) {
    return request.clone({
      setHeaders: {
        'Authorization': `Bearer ${idToken}`
      }
    });
  }
  
  return request;
}
private handleFirebase401(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const refreshToken = localStorage.getItem('firebaseRefreshToken');
    if (!refreshToken) {
      return throwError(() => new Error('No Firebase refresh token available'));
    }

    return this.authService.refreshFirebaseToken(refreshToken).pipe(
      switchMap((response: any) => {
        const newToken = response.id_token;
        localStorage.setItem('idToken', newToken);
        console.log('✅ Firebase token refrescado exitosamente');
        return next.handle(this.addFirebaseToken(request));
      }),
      catchError(err => {
        console.error('❌ Error al refrescar Firebase token:', err);
        return throwError(() => err);
      })
    );
  }

  private addToken(request: HttpRequest<any>) {
    const token = localStorage.getItem('access_token') || localStorage.getItem('jwt_token');
    
    if (token) {
      return request.clone({
        setHeaders: {
          'Authorization': `Bearer ${token}`
        }
      });
    }
    
    return request;
  }

  private handle401Error(request: HttpRequest<any>, next: HttpHandler) {
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshTokenSubject.next(null);

      const refreshToken = localStorage.getItem('refresh_token');

      if (refreshToken) {
        return this.authService.refreshToken(refreshToken).pipe(
          switchMap((response) => {
            this.isRefreshing = false;
            this.refreshTokenSubject.next(response.access_token);
            return next.handle(this.addToken(request));
          }),
          catchError((err) => {
            this.isRefreshing = false;
            const idToken = localStorage.getItem('idToken');
            if (idToken) {
              return this.authService.convertToJWT(idToken).pipe(
                switchMap(response => {
                  return next.handle(this.addToken(request));
                }),
                catchError(convertError => {
                  this.authService.logout();
                  return throwError(() => convertError);
                })
              );
            }
            this.authService.logout();
            return throwError(() => err);
          })
        );
      } else {
        this.isRefreshing = false;
        this.authService.logout();
        return throwError(() => new Error('No refresh token available'));
      }
    }

    return this.refreshTokenSubject.pipe(
      filter(token => token !== null),
      take(1),
      switchMap(() => {
        return next.handle(this.addToken(request));
      })
    );
  }
}