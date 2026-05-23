import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);
  private readonly bizEntitiesApiUrl = process.env.BIZ_ENTITIES_API_URL || 'http://localhost:3000';
  private readonly internalApiKey = process.env.INTERNAL_API_KEY || '';

  constructor(private reflector: Reflector) {}

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
    const cuentaUid = request.query?.cuentaUid || user?.uid;

    if (!user?.uid || !cuentaUid) {
      this.logger.warn('No se pudo determinar usuario o cuenta');
      throw new ForbiddenException('No se pudo verificar permisos: usuario o cuenta no identificados');
    }

    try {
      const url = this.bizEntitiesApiUrl + '/api/roles/permissions/' + user.uid + '?cuentaUid=' + cuentaUid;
      const response = await fetch(url, {
        headers: {
          'x-internal-api-key': this.internalApiKey,
        },
      });

      if (!response.ok) {
        this.logger.error('Error al obtener permisos: ' + response.status);
        throw new ForbiddenException('No se pudieron verificar los permisos');
      }

      const text = await response.text();
      if (!text || text === 'null' || text === '') {
        this.logger.warn('No se encontraron permisos para usuario ' + user.uid + ' en cuenta ' + cuentaUid);
        throw new ForbiddenException('No tienes permisos asignados en esta cuenta');
      }
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        this.logger.error('Respuesta invalida del servicio de permisos: ' + text.substring(0, 100));
        throw new ForbiddenException('Error al verificar permisos');
      }
      const permisos = data.permisos || data.data?.permisos || data;

      if (!permisos[modulo] || permisos[modulo][accion] !== true) {
        this.logger.warn('Permiso denegado: ' + requiredPermission + ' para usuario ' + user.uid);
        throw new ForbiddenException('No tienes permiso para realizar esta accion: ' + requiredPermission);
      }

      this.logger.log('Permiso concedido: ' + requiredPermission + ' para usuario ' + user.uid);
      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) throw error;
      this.logger.error('Error verificando permisos: ' + error.message);
      throw new ForbiddenException('Error al verificar permisos');
    }
  }
}
