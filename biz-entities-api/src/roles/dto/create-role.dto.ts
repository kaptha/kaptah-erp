export class CreateRoleDto {
  nombre: string;
  descripcion?: string;
  permisos: Record<string, { leer: boolean; crear: boolean; editar: boolean; eliminar: boolean }>;
}
