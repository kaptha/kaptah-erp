import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';
import { RolesService, Role } from '../../../services/roles.service';
import { RoleDialogComponent } from './role-dialog/role-dialog.component';
import { SubUserDialogComponent } from './sub-user-dialog/sub-user-dialog.component';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-usuarios-roles',
  templateUrl: './usuarios-roles.component.html',
  styleUrls: ['./usuarios-roles.component.css'],
  standalone: false
})
export class UsuariosRolesComponent implements OnInit {
  // Roles
  rolesColumns: string[] = ['nombre', 'descripcion', 'tipo', 'actions'];
  rolesDataSource = new MatTableDataSource<Role>();
  loadingRoles = true;

  // Usuarios
  usersColumns: string[] = ['nombre', 'email', 'rol', 'actions'];
  usersDataSource = new MatTableDataSource<any>();
  loadingUsers = true;

  firebaseUid: string = '';
  roles: Role[] = [];

  constructor(
    private rolesService: RolesService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.firebaseUid = localStorage.getItem('firebaseUid') || '';
    this.loadRoles();
    this.loadUsers();
  }

  // ===== ROLES =====

  loadRoles(): void {
    this.loadingRoles = true;
    this.rolesService.getRolesByAccount(this.firebaseUid).subscribe({
      next: (roles) => {
        this.roles = roles;
        this.rolesDataSource.data = roles;
        this.loadingRoles = false;
      },
      error: (err) => {
        console.error('Error al cargar roles:', err);
        this.loadingRoles = false;
      }
    });
  }

  openCreateRoleDialog(): void {
    const dialogRef = this.dialog.open(RoleDialogComponent, {
      width: '700px', maxHeight: '90vh',
      data: { mode: 'create' }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.rolesService.createCustomRole(result, this.firebaseUid).subscribe({
          next: () => {
            this.snackBar.open('Rol creado exitosamente', 'Cerrar', { duration: 3000 });
            this.loadRoles();
          },
          error: (err) => this.snackBar.open(err.error?.message || 'Error al crear rol', 'Cerrar', { duration: 3000 })
        });
      }
    });
  }

  openEditRoleDialog(role: Role): void {
    if (role.esPredefinido) { this.openViewRoleDialog(role); return; }
    const dialogRef = this.dialog.open(RoleDialogComponent, {
      width: '700px', maxHeight: '90vh',
      data: { mode: 'edit', role }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.rolesService.updateRole(role.id, result, this.firebaseUid).subscribe({
          next: () => {
            this.snackBar.open('Rol actualizado', 'Cerrar', { duration: 3000 });
            this.loadRoles();
          },
          error: (err) => this.snackBar.open(err.error?.message || 'Error al actualizar', 'Cerrar', { duration: 3000 })
        });
      }
    });
  }

  openViewRoleDialog(role: Role): void {
    this.dialog.open(RoleDialogComponent, {
      width: '700px', maxHeight: '90vh',
      data: { mode: 'view', role }
    });
  }

  deleteRole(role: Role): void {
    if (role.esPredefinido) {
      Swal.fire({
        icon: 'warning',
        title: 'Accion no permitida',
        text: 'No se pueden eliminar roles predefinidos',
        confirmButtonColor: '#8e24aa'
      });
      return;
    }
    Swal.fire({
      title: 'Eliminar rol',
      text: 'Estas seguro de eliminar el rol "' + role.nombre + '"? Esta accion no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d32f2f',
      cancelButtonColor: '#8e24aa'
    }).then((result) => {
      if (result.isConfirmed) {
        this.rolesService.deleteRole(role.id, this.firebaseUid).subscribe({
          next: () => {
            Swal.fire({ icon: 'success', title: 'Eliminado', text: 'El rol ha sido eliminado', confirmButtonColor: '#8e24aa' });
            this.loadRoles();
          },
          error: (err) => Swal.fire({ icon: 'error', title: 'Error', text: err.error?.message || 'Error al eliminar el rol', confirmButtonColor: '#8e24aa' })
        });
      }
    });
  }

  getPermissionCount(role: Role): number {
    if (!role.permisos) return 0;
    let count = 0;
    Object.values(role.permisos).forEach((perm: any) => {
      if (perm.leer) count++;
      if (perm.crear) count++;
      if (perm.editar) count++;
      if (perm.eliminar) count++;
    });
    return count;
  }

  // ===== USUARIOS =====

  loadUsers(): void {
    this.loadingUsers = true;
    this.rolesService.getSubUsers(this.firebaseUid).subscribe({
      next: (users) => {
        this.usersDataSource.data = users;
        this.loadingUsers = false;
      },
      error: (err) => {
        console.error('Error al cargar usuarios:', err);
        this.loadingUsers = false;
      }
    });
  }

  openAddUserDialog(): void {
    const dialogRef = this.dialog.open(SubUserDialogComponent, {
      width: '500px',
      data: { roles: this.roles }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.snackBar.open('Creando usuario...', '', { duration: 0 });
        this.rolesService.createSubUser(result, this.firebaseUid).subscribe({
          next: (resp) => {
            this.snackBar.open('Usuario creado. Se envio invitacion a ' + result.email, 'Cerrar', { duration: 5000 });
            this.loadUsers();
          },
          error: (err) => {
            console.error('Error al crear usuario:', err);
            this.snackBar.open(err.error?.message || 'Error al crear usuario', 'Cerrar', { duration: 5000 });
          }
        });
      }
    });
  }

  changeUserRole(user: any): void {
    const inputOptions: { [key: string]: string } = {};
    this.roles.forEach(role => {
      inputOptions[role.id.toString()] = role.nombre;
    });

    Swal.fire({
      title: 'Cambiar rol',
      text: 'Selecciona el nuevo rol para ' + (user.nombre || user.email),
      input: 'select',
      inputOptions: inputOptions,
      inputValue: user.rolId?.toString() || '',
      inputPlaceholder: 'Selecciona un rol',
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#8e24aa',
      inputValidator: (value) => {
        if (!value) {
          return 'Debes seleccionar un rol';
        }
        return null;
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        this.rolesService.assignRole(user.firebaseUid, parseInt(result.value), this.firebaseUid).subscribe({
          next: () => {
            this.snackBar.open('Rol actualizado', 'Cerrar', { duration: 3000 });
            this.loadUsers();
          },
          error: (err) => this.snackBar.open(err.error?.message || 'Error al cambiar rol', 'Cerrar', { duration: 3000 })
        });
      }
    });
  }

  applyUsersFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.usersDataSource.filter = filterValue.trim().toLowerCase();
  }

  applyRolesFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.rolesDataSource.filter = filterValue.trim().toLowerCase();
  }
}
