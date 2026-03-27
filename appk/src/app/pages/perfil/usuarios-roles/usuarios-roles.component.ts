import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';
import { RolesService, Role } from '../../../services/roles.service';
import { RoleDialogComponent } from './role-dialog/role-dialog.component';

@Component({
  selector: 'app-usuarios-roles',
  templateUrl: './usuarios-roles.component.html',
  styleUrls: ['./usuarios-roles.component.css'],
  standalone: false
})
export class UsuariosRolesComponent implements OnInit {
  displayedColumns: string[] = ['nombre', 'descripcion', 'tipo', 'actions'];
  dataSource = new MatTableDataSource<Role>();
  loading = true;
  firebaseUid: string = '';

  constructor(
    private rolesService: RolesService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.firebaseUid = localStorage.getItem('firebaseUid') || '';
    this.loadRoles();
  }

  loadRoles(): void {
    this.loading = true;
    this.rolesService.getRolesByAccount(this.firebaseUid).subscribe({
      next: (roles) => {
        this.dataSource.data = roles;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar roles:', err);
        this.loading = false;
        this.snackBar.open('Error al cargar roles', 'Cerrar', { duration: 3000 });
      }
    });
  }

  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(RoleDialogComponent, {
      width: '700px',
      maxHeight: '90vh',
      data: { mode: 'create' }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.rolesService.createCustomRole(result, this.firebaseUid).subscribe({
          next: () => {
            this.snackBar.open('Rol creado exitosamente', 'Cerrar', { duration: 3000 });
            this.loadRoles();
          },
          error: (err) => {
            console.error('Error al crear rol:', err);
            this.snackBar.open(err.error?.message || 'Error al crear rol', 'Cerrar', { duration: 3000 });
          }
        });
      }
    });
  }

  openEditDialog(role: Role): void {
    if (role.esPredefinido) {
      this.openViewDialog(role);
      return;
    }

    const dialogRef = this.dialog.open(RoleDialogComponent, {
      width: '700px',
      maxHeight: '90vh',
      data: { mode: 'edit', role }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.rolesService.updateRole(role.id, result, this.firebaseUid).subscribe({
          next: () => {
            this.snackBar.open('Rol actualizado exitosamente', 'Cerrar', { duration: 3000 });
            this.loadRoles();
          },
          error: (err) => {
            console.error('Error al actualizar rol:', err);
            this.snackBar.open(err.error?.message || 'Error al actualizar rol', 'Cerrar', { duration: 3000 });
          }
        });
      }
    });
  }

  openViewDialog(role: Role): void {
    this.dialog.open(RoleDialogComponent, {
      width: '700px',
      maxHeight: '90vh',
      data: { mode: 'view', role }
    });
  }

  deleteRole(role: Role): void {
    if (role.esPredefinido) {
      this.snackBar.open('No se pueden eliminar roles predefinidos', 'Cerrar', { duration: 3000 });
      return;
    }

    if (confirm('Estas seguro de eliminar el rol "' + role.nombre + '"?')) {
      this.rolesService.deleteRole(role.id, this.firebaseUid).subscribe({
        next: () => {
          this.snackBar.open('Rol eliminado', 'Cerrar', { duration: 3000 });
          this.loadRoles();
        },
        error: (err) => {
          console.error('Error al eliminar rol:', err);
          this.snackBar.open(err.error?.message || 'Error al eliminar rol', 'Cerrar', { duration: 3000 });
        }
      });
    }
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
}
