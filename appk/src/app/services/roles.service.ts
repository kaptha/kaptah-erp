import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Api } from '../config';

export interface RolePermissions {
  leer: boolean;
  crear: boolean;
  editar: boolean;
  eliminar: boolean;
}

export interface Role {
  id: number;
  nombre: string;
  descripcion: string;
  permisos: Record<string, RolePermissions>;
  esPredefinido: boolean;
  cuentaFirebaseUid: string;
}

export interface UsuarioRole {
  id: number;
  usuarioFirebaseUid: string;
  rolId: number;
  rol: Role;
  asignadoPor: string;
}

@Injectable({ providedIn: 'root' })
export class RolesService {
  private apiUrl = Api.mysqlUrl;

  constructor(private http: HttpClient) {}

  getRolesByAccount(firebaseUid: string): Observable<Role[]> {
    return this.http.get<Role[]>(this.apiUrl + '/roles/account/' + firebaseUid);
  }

  getUserRole(firebaseUid: string): Observable<UsuarioRole> {
    return this.http.get<UsuarioRole>(this.apiUrl + '/roles/user/' + firebaseUid);
  }

  getUserPermissions(firebaseUid: string): Observable<Record<string, RolePermissions>> {
    return this.http.get<Record<string, RolePermissions>>(this.apiUrl + '/roles/permissions/' + firebaseUid);
  }

  seedRoles(firebaseUid: string): Observable<any> {
    return this.http.post(this.apiUrl + '/roles/seed/' + firebaseUid, {});
  }

  assignRole(usuarioFirebaseUid: string, rolId: number, adminFirebaseUid: string): Observable<UsuarioRole> {
    return this.http.post<UsuarioRole>(this.apiUrl + '/roles/assign', {
      usuarioFirebaseUid,
      rolId,
      adminFirebaseUid,
    });
  }

  updateRole(id: number, data: any, adminFirebaseUid: string): Observable<Role> {
    return this.http.put<Role>(this.apiUrl + '/roles/' + id, { ...data, adminFirebaseUid });
  }

  deleteRole(id: number, adminFirebaseUid: string): Observable<any> {
    return this.http.delete(this.apiUrl + '/roles/' + id, { body: { adminFirebaseUid } });
  }

  createCustomRole(data: any, adminFirebaseUid: string): Observable<Role> {
    return this.http.post<Role>(this.apiUrl + '/roles/custom', {
      ...data,
      adminFirebaseUid,
    });
  }
}
