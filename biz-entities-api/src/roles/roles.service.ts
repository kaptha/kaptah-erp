import { Injectable, NotFoundException, ForbiddenException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './entities/role.entity';
import { UsuarioRole } from './entities/usuario-role.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { AssignRoleDto } from './dto/assign-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
  private readonly logger = new Logger(RolesService.name);

  constructor(
    @InjectRepository(Role)
    private rolesRepository: Repository<Role>,
    @InjectRepository(UsuarioRole)
    private usuarioRolesRepository: Repository<UsuarioRole>,
  ) {}

  async seedRolesForAccount(ownerFirebaseUid: string): Promise<{ message: string }> {
    this.logger.log('Seeding roles for account: ' + ownerFirebaseUid);

    const existingRoles = await this.rolesRepository.find({
      where: { cuentaFirebaseUid: ownerFirebaseUid },
    });

    if (existingRoles.length > 0) {
      this.logger.log('Roles already exist for this account');
      return { message: 'Roles ya existen para esta cuenta' };
    }

    const predefinedRoles = [
      { nombre: 'Administrador', descripcion: 'Acceso total al sistema', permisos: this.getAdminPermissions() },
      { nombre: 'Vendedor', descripcion: 'Operaciones comerciales y ventas', permisos: this.getVendedorPermissions() },
      { nombre: 'Almacenista', descripcion: 'Control de inventario y compras', permisos: this.getAlmacenistaPermissions() },
      { nombre: 'Contador', descripcion: 'Finanzas y facturacion completa', permisos: this.getContadorPermissions() },
      { nombre: 'Facturador', descripcion: 'Solo facturacion electronica', permisos: this.getFacturadorPermissions() },
    ];

    for (const roleData of predefinedRoles) {
      const role = this.rolesRepository.create({
        ...roleData,
        esPredefinido: true,
        cuentaFirebaseUid: ownerFirebaseUid,
      });
      await this.rolesRepository.save(role);
    }

    const adminRole = await this.rolesRepository.findOne({
      where: { nombre: 'Administrador', cuentaFirebaseUid: ownerFirebaseUid },
    });

    if (adminRole) {
      const assignment = this.usuarioRolesRepository.create({
        usuarioFirebaseUid: ownerFirebaseUid,
        rolId: adminRole.id,
        asignadoPor: ownerFirebaseUid,
      });
      await this.usuarioRolesRepository.save(assignment);
      this.logger.log('Admin role assigned to owner');
    }

    return { message: 'Roles creados exitosamente' };
  }

  async findAllByAccount(cuentaFirebaseUid: string): Promise<Role[]> {
    return this.rolesRepository.find({
      where: { cuentaFirebaseUid },
      order: { esPredefinido: 'DESC', nombre: 'ASC' },
    });
  }

  async findUserRole(usuarioFirebaseUid: string): Promise<UsuarioRole | null> {
    return this.usuarioRolesRepository.findOne({
      where: { usuarioFirebaseUid },
      relations: ['rol'],
    });
  }

  async getUserPermissions(usuarioFirebaseUid: string): Promise<Record<string, any> | null> {
    const userRole = await this.findUserRole(usuarioFirebaseUid);
    if (!userRole) return null;
    return userRole.rol.permisos;
  }

  async assignRole(dto: AssignRoleDto, adminFirebaseUid: string): Promise<UsuarioRole> {
    await this.verifyAdminPermission(adminFirebaseUid);

    const role = await this.rolesRepository.findOne({ where: { id: dto.rolId } });
    if (!role) throw new NotFoundException('Rol no encontrado');

    const existing = await this.usuarioRolesRepository.findOne({
      where: { usuarioFirebaseUid: dto.usuarioFirebaseUid },
    });

    if (existing) {
      existing.rolId = dto.rolId;
      existing.asignadoPor = adminFirebaseUid;
      return this.usuarioRolesRepository.save(existing);
    }

    const assignment = this.usuarioRolesRepository.create({
      ...dto,
      asignadoPor: adminFirebaseUid,
    });
    return this.usuarioRolesRepository.save(assignment);
  }

  async createCustomRole(dto: CreateRoleDto, adminFirebaseUid: string): Promise<Role> {
    await this.verifyAdminPermission(adminFirebaseUid);

    const role = this.rolesRepository.create({
      ...dto,
      esPredefinido: false,
      cuentaFirebaseUid: adminFirebaseUid,
    });
    return this.rolesRepository.save(role);
  }

  async updateRole(id: number, dto: UpdateRoleDto, adminFirebaseUid: string): Promise<Role> {
    await this.verifyAdminPermission(adminFirebaseUid);

    const role = await this.rolesRepository.findOne({ where: { id } });
    if (!role) throw new NotFoundException('Rol no encontrado');
    if (role.esPredefinido) throw new ForbiddenException('No se pueden modificar roles predefinidos');

    Object.assign(role, dto);
    return this.rolesRepository.save(role);
  }

  async deleteRole(id: number, adminFirebaseUid: string): Promise<{ message: string }> {
    await this.verifyAdminPermission(adminFirebaseUid);

    const role = await this.rolesRepository.findOne({ where: { id } });
    if (!role) throw new NotFoundException('Rol no encontrado');
    if (role.esPredefinido) throw new ForbiddenException('No se pueden eliminar roles predefinidos');

    const usersWithRole = await this.usuarioRolesRepository.count({ where: { rolId: id } });
    if (usersWithRole > 0) {
      throw new ConflictException('No se puede eliminar: hay usuarios con este rol asignado');
    }

    await this.rolesRepository.remove(role);
    return { message: 'Rol eliminado exitosamente' };
  }

  private async verifyAdminPermission(firebaseUid: string): Promise<void> {
    const userRole = await this.findUserRole(firebaseUid);
    if (!userRole || userRole.rol.nombre !== 'Administrador') {
      throw new ForbiddenException('Solo el administrador puede gestionar roles');
    }
  }

  private fullAccess() {
    return { leer: true, crear: true, editar: true, eliminar: true };
  }
  private readOnly() {
    return { leer: true, crear: false, editar: false, eliminar: false };
  }
  private noAccess() {
    return { leer: false, crear: false, editar: false, eliminar: false };
  }
  private crudNoDelete() {
    return { leer: true, crear: true, editar: true, eliminar: false };
  }

  private getAdminPermissions() {
    const modules = [
      'clientes', 'proveedores', 'empleados', 'categorias', 'productos', 'servicios',
      'inventario_multi_sucursal', 'ordenes_compra', 'cotizaciones', 'ordenes_venta',
      'guias_remision', 'notas_venta', 'cuentas_cobrar', 'cuentas_pagar',
      'ingresos', 'egresos', 'cfdi', 'descarga_cfdi', 'roles',
    ];
    return Object.fromEntries(modules.map(m => [m, this.fullAccess()]));
  }

  private getVendedorPermissions() {
    return {
      clientes: this.crudNoDelete(), proveedores: this.noAccess(), empleados: this.noAccess(),
      categorias: this.noAccess(), productos: this.readOnly(), servicios: this.readOnly(),
      inventario_multi_sucursal: this.noAccess(), ordenes_compra: this.noAccess(),
      cotizaciones: this.crudNoDelete(), ordenes_venta: this.crudNoDelete(),
      guias_remision: this.crudNoDelete(), notas_venta: this.crudNoDelete(),
      cuentas_cobrar: this.noAccess(), cuentas_pagar: this.noAccess(),
      ingresos: this.noAccess(), egresos: this.noAccess(),
      cfdi: this.noAccess(), descarga_cfdi: this.noAccess(), roles: this.noAccess(),
    };
  }

  private getAlmacenistaPermissions() {
    return {
      clientes: this.noAccess(), proveedores: this.crudNoDelete(), empleados: this.noAccess(),
      categorias: this.crudNoDelete(), productos: this.crudNoDelete(), servicios: this.crudNoDelete(),
      inventario_multi_sucursal: this.crudNoDelete(), ordenes_compra: this.crudNoDelete(),
      cotizaciones: this.noAccess(), ordenes_venta: this.noAccess(),
      guias_remision: this.readOnly(), notas_venta: this.noAccess(),
      cuentas_cobrar: this.noAccess(), cuentas_pagar: this.noAccess(),
      ingresos: this.noAccess(), egresos: this.noAccess(),
      cfdi: this.noAccess(), descarga_cfdi: this.noAccess(), roles: this.noAccess(),
    };
  }

  private getContadorPermissions() {
    return {
      clientes: this.readOnly(), proveedores: this.readOnly(), empleados: this.noAccess(),
      categorias: this.noAccess(), productos: this.noAccess(), servicios: this.noAccess(),
      inventario_multi_sucursal: this.noAccess(), ordenes_compra: this.readOnly(),
      cotizaciones: this.noAccess(), ordenes_venta: this.readOnly(),
      guias_remision: this.noAccess(), notas_venta: this.readOnly(),
      cuentas_cobrar: this.crudNoDelete(), cuentas_pagar: this.crudNoDelete(),
      ingresos: this.crudNoDelete(), egresos: this.crudNoDelete(),
      cfdi: this.crudNoDelete(), descarga_cfdi: this.crudNoDelete(), roles: this.noAccess(),
    };
  }

  private getFacturadorPermissions() {
    return {
      clientes: this.readOnly(), proveedores: this.noAccess(), empleados: this.noAccess(),
      categorias: this.noAccess(), productos: this.noAccess(), servicios: this.noAccess(),
      inventario_multi_sucursal: this.noAccess(), ordenes_compra: this.noAccess(),
      cotizaciones: this.noAccess(), ordenes_venta: this.noAccess(),
      guias_remision: this.noAccess(), notas_venta: this.readOnly(),
      cuentas_cobrar: this.noAccess(), cuentas_pagar: this.noAccess(),
      ingresos: this.noAccess(), egresos: this.noAccess(),
      cfdi: this.crudNoDelete(), descarga_cfdi: this.crudNoDelete(), roles: this.noAccess(),
    };
  }
}
