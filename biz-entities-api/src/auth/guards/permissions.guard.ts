import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesService } from '../../roles/roles.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(
    private reflector: Reflector,
    private rolesService: RolesService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.get<string>('permission', context.getHandler());
    if (!requiredPermission) {
      return true;
    }

    const [modulo, accion] = requiredPermission.split('.');
    if (!modulo || !accion) {
      this.logger.warn('Permiso mal formado: ' + requiredPermission);
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const userUid = user?.uid || user?.firebaseUid;
    const cuentaUid = request.query?.cuentaUid || userUid;

    if (!userUid || !cuentaUid) {
this.logger.log('Verificando permiso: ' + requiredPermission + ' para user: ' + userUid + ' cuenta: ' + cuentaUid);
      this.logger.warn('No se pudo determinar usuario o cuenta');
      throw new ForbiddenException('No se pudo verificar permisos');
    }

    try {
      const permissions = await this.rolesService.getUserPermissions(userUid, cuentaUid);
      this.logger.log('Permisos obtenidos para ' + userUid + ' en cuenta ' + cuentaUid + ': ' + JSON.stringify(permissions));
      const permisos = permissions;

      if (!permisos[modulo] || permisos[modulo][accion] !== true) {
        this.logger.warn('Permiso denegado: ' + requiredPermission + ' para usuario ' + userUid);
        throw new ForbiddenException('No tienes permiso para realizar esta accion: ' + requiredPermission);
      }

      this.logger.log('Permiso concedido: ' + requiredPermission + ' para usuario ' + userUid);
      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) throw error;
      this.logger.error('Error verificando permisos: ' + error.message);
      throw new ForbiddenException('Error al verificar permisos');
    }
  }
}
