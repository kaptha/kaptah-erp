import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class PermissionGuard implements CanActivate {
  constructor(private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    const requiredModule = route.data['module'] as string;
    const requiredAction = (route.data['action'] as string) || 'leer';

    if (!requiredModule) return true;

    const permisosStr = localStorage.getItem('userPermissions');
    if (!permisosStr) return true; // Sin permisos cargados = permitir (admin o permisos no cargados)

    try {
      const permisos = JSON.parse(permisosStr);
      const modulePerms = permisos[requiredModule];

      if (!modulePerms || modulePerms[requiredAction] !== true) {
        console.warn('Acceso denegado a modulo:', requiredModule, 'accion:', requiredAction);
        this.router.navigate(['/dashboard']);
        return false;
      }

      return true;
    } catch (e) {
      return true;
    }
  }
}
