import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { UsersService } from '../services/users.service';
import { CanActivateFn } from '@angular/router';


Injectable({
  providedIn: 'root'
})

export const authGuard: CanActivateFn = () => {
  const usersService = inject(UsersService);
  const router = inject(Router);
  
  return new Promise<boolean>((resolve) => {
    // Verificar primero si existe algún token
    const idToken = localStorage.getItem('idToken');
    const accessToken = localStorage.getItem('access_token');
    
    if (!idToken && !accessToken) {
      console.log('🚫 AuthGuard: No hay tokens disponibles, redirigiendo a login');
      router.navigateByUrl("/login");
      resolve(false);
      return;
    }
    
    // Si hay idToken, validar con Firebase
    usersService.authActivate().then((resp: any) => {
      if (!resp) {
        console.log('🚫 AuthGuard: Token inválido o expirado, redirigiendo a login');
        router.navigateByUrl("/login");
        resolve(false);
      } else {
        console.log('✅ AuthGuard: Usuario autenticado correctamente');
        resolve(true);
      }
    }).catch(error => {
      console.error('❌ AuthGuard: Error al validar autenticación:', error);
      router.navigateByUrl("/login");
      resolve(false);
    });
  });
};
