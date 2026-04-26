import { Injectable, NotFoundException, ForbiddenException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Repository } from 'typeorm';
import { Role } from './entities/role.entity';
import { UsuarioRole } from './entities/usuario-role.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import admin from '../firebase/firebase-admin';
import { Resend } from 'resend';
import { User } from '../users/entities/user.entity';
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
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {
    this.resend = new Resend(process.env.RESEND_API_KEY);
  }

  private resend: Resend;

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
        cuentaFirebaseUid: ownerFirebaseUid,
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
async getUserAccounts(usuarioFirebaseUid: string): Promise<any[]> {
    const assignments = await this.usuarioRolesRepository.find({
      where: { usuarioFirebaseUid },
      relations: ['rol'],
    });

    const accounts = [];
    for (const assignment of assignments) {
      const owner = await this.usersRepository.findOne({
        where: { firebaseUid: assignment.cuentaFirebaseUid },
      });
      if (owner) {
        accounts.push({
          cuentaFirebaseUid: assignment.cuentaFirebaseUid,
          nombreCuenta: owner.nombreComercial || owner.nombre,
          rfcCuenta: owner.rfc,
          rol: assignment.rol.nombre,
          rolId: assignment.rolId,
          esPropia: assignment.usuarioFirebaseUid === assignment.cuentaFirebaseUid,
        });
      }
    }

    return accounts;
  }

  async findUserRole(usuarioFirebaseUid: string, cuentaFirebaseUid?: string): Promise<UsuarioRole | null> {
    const where: any = { usuarioFirebaseUid };
    if (cuentaFirebaseUid) {
      where.cuentaFirebaseUid = cuentaFirebaseUid;
    }
    return this.usuarioRolesRepository.findOne({
      where,
      relations: ['rol'],
    });
  }

  async getUserPermissions(usuarioFirebaseUid: string, cuentaFirebaseUid?: string): Promise<Record<string, any> | null> {
    const userRole = await this.findUserRole(usuarioFirebaseUid, cuentaFirebaseUid);
    if (!userRole) return null;
    return userRole.rol.permisos;
  }

  async assignRole(dto: AssignRoleDto, adminFirebaseUid: string): Promise<UsuarioRole> {
    await this.verifyAdminPermission(adminFirebaseUid);

    const role = await this.rolesRepository.findOne({ where: { id: dto.rolId } });
    if (!role) throw new NotFoundException('Rol no encontrado');

    const existing = await this.usuarioRolesRepository.findOne({
      where: { usuarioFirebaseUid: dto.usuarioFirebaseUid, cuentaFirebaseUid: adminFirebaseUid },
    });

    if (existing) {
      existing.rolId = dto.rolId;
      existing.asignadoPor = adminFirebaseUid;
      await this.usuarioRolesRepository.save(existing);
      return this.usuarioRolesRepository.findOne({
        where: { id: existing.id },
        relations: ['rol'],
      });
    }

    const assignment = this.usuarioRolesRepository.create({
      ...dto,
      cuentaFirebaseUid: adminFirebaseUid,
      asignadoPor: adminFirebaseUid,
    });
    await this.usuarioRolesRepository.save(assignment);
    return this.usuarioRolesRepository.findOne({
      where: { id: assignment.id },
      relations: ['rol'],
    });
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
async getSubUsers(adminFirebaseUid: string): Promise<any[]> {
    // Obtener todas las asignaciones de roles de esta cuenta
    const roles = await this.rolesRepository.find({
      where: { cuentaFirebaseUid: adminFirebaseUid },
    });
    const roleIds = roles.map(r => r.id);

    if (roleIds.length === 0) return [];

    const assignments = await this.usuarioRolesRepository.find({
      where: roleIds.map(id => ({ rolId: id })),
      relations: ['rol'],
    });

    // Para cada asignación, obtener datos del usuario
    const subUsers = [];
    for (const assignment of assignments) {
      const user = await this.usersRepository.findOne({
        where: { firebaseUid: assignment.usuarioFirebaseUid },
      });
      if (user) {
        subUsers.push({
          firebaseUid: user.firebaseUid,
          nombre: user.nombre,
          email: user.email,
          rol: assignment.rol.nombre,
          rolId: assignment.rolId,
          esAdmin: assignment.usuarioFirebaseUid === adminFirebaseUid,
          fechaCreacion: user.Fecha_Registro,
        });
      }
    }

    return subUsers;
  }
async createSubUser(data: { nombre: string; email: string; rolId: number }, adminFirebaseUid: string): Promise<any> {
    await this.verifyAdminPermission(adminFirebaseUid);

    const role = await this.rolesRepository.findOne({ where: { id: data.rolId } });
    if (!role) throw new NotFoundException('Rol no encontrado');

    const adminUser = await this.usersRepository.findOne({ where: { firebaseUid: adminFirebaseUid } });
    if (!adminUser) throw new NotFoundException('Admin no encontrado');

    // Verificar si ya tiene un rol en ESTA cuenta
    const existingAssignment = await this.usuarioRolesRepository.findOne({
      where: { cuentaFirebaseUid: adminFirebaseUid },
    });

    try {
      let firebaseUid: string;
      let isExistingUser = false;
      let tempPassword: string | null = null;

      // Verificar si el email ya existe en Firebase Auth
      try {
        const existingFirebaseUser = await admin.auth().getUserByEmail(data.email);
        firebaseUid = existingFirebaseUser.uid;
        isExistingUser = true;
        this.logger.log('User already exists in Firebase: ' + firebaseUid);

        // Verificar que no tenga ya un rol en ESTA cuenta
        const alreadyInAccount = await this.usuarioRolesRepository.findOne({
          where: { usuarioFirebaseUid: firebaseUid, cuentaFirebaseUid: adminFirebaseUid },
        });
        if (alreadyInAccount) {
          throw new ConflictException('Este usuario ya tiene un rol en tu cuenta');
        }
      } catch (error) {
        // Si el error es ConflictException, re-lanzar
        if (error instanceof ConflictException) throw error;

        // Si el error es de Firebase (user not found), crear usuario nuevo
        if (error.code === 'auth/user-not-found') {
          tempPassword = this.generateTempPassword();

          const firebaseUser = await admin.auth().createUser({
            email: data.email,
            password: tempPassword,
            displayName: data.nombre,
            emailVerified: true,
          });
          firebaseUid = firebaseUser.uid;
          this.logger.log('New Firebase user created: ' + firebaseUid);

          // Crear en Firebase Realtime DB
          const realtimeDb = admin.database();
          const userRef = await realtimeDb.ref('usuarios').push({
            nombre: data.nombre,
            email: data.email,
            firebaseUid: firebaseUid,
            rfc: adminUser.rfc,
            telefono: '',
            plan: 'basico',
            suscripcionActiva: false,
            cicloFacturacion: 'anual',
            Confirm: true,
            idToken: '',
            cuentaPadreUid: adminFirebaseUid,
          });
          this.logger.log('Realtime DB key: ' + userRef.key);

          // Crear en MySQL
          const subUserRfc = 'SUB' + firebaseUid.substring(0, 10).toUpperCase();
          const newUser = this.usersRepository.create({
            nombre: data.nombre,
            email: data.email,
            firebaseUid: firebaseUid,
            realtimeDbKey: userRef.key,
            rfc: subUserRfc,
            tipo_persona: adminUser.tipo_persona,
            fiscalReg: adminUser.fiscalReg,
            telefono: '',
          });
          await this.usersRepository.save(newUser);
          this.logger.log('MySQL user created');
        } else {
          throw error;
        }
      }

      // Asignar rol en esta cuenta
      const assignment = this.usuarioRolesRepository.create({
        usuarioFirebaseUid: firebaseUid,
        cuentaFirebaseUid: adminFirebaseUid,
        rolId: data.rolId,
        asignadoPor: adminFirebaseUid,
      });
      await this.usuarioRolesRepository.save(assignment);
      this.logger.log('Role assigned: ' + role.nombre + (isExistingUser ? ' (existing user)' : ' (new user)'));

      // Enviar email
      if (isExistingUser) {
        // Usuario existente: enviar email de vinculacion (sin contrasena)
        await this.sendLinkEmail(data.email, data.nombre, role.nombre, adminUser.nombre);
      } else {
        // Usuario nuevo: enviar email de invitacion con contrasena
        await this.sendInvitationEmail(data.email, data.nombre, tempPassword, role.nombre, adminUser.nombre);
      }

      return {
        message: isExistingUser
          ? 'Usuario vinculado exitosamente a tu cuenta'
          : 'Usuario creado exitosamente',
        user: {
          firebaseUid: firebaseUid,
          nombre: data.nombre,
          email: data.email,
          rol: role.nombre,
          isExistingUser: isExistingUser,
        },
      };
    } catch (error) {
      this.logger.error('Error creating sub-user: ' + error.message);
      throw error;
    }
  }

  private generateTempPassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password + '!1';
  }
private async sendLinkEmail(email: string, nombre: string, rolName: string, adminName: string): Promise<void> {
    try {
      await this.resend.emails.send({
        from: 'Kaptah <no-reply@kaptah.mx>',
        to: [email],
        subject: 'Te han agregado a una cuenta en Kaptah',
        html: `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;background:#f4f4f4;padding:20px;">
  <div style="max-width:600px;margin:0 auto;background:white;border-radius:8px;overflow:hidden;">
    <div style="background:#8e24aa;padding:30px;text-align:center;">
      <h1 style="color:white;margin:0;">Kaptah</h1>
    </div>
    <div style="padding:30px;">
      <h2 style="color:#333;">Hola ${nombre},</h2>
      <p style="color:#555;font-size:16px;"><strong>${adminName}</strong> te ha agregado a su cuenta en <strong>Kaptah</strong> con el rol de <strong>${rolName}</strong>.</p>
      <div style="background:#f8f0fc;border-radius:8px;padding:20px;margin:20px 0;">
        <p style="margin:0;color:#333;">La proxima vez que inicies sesion en <a href="https://app.kaptah.mx" style="color:#8e24aa;">app.kaptah.mx</a>, podras seleccionar en que cuenta deseas trabajar.</p>
      </div>
      <p style="color:#555;font-size:14px;">Usa las mismas credenciales con las que ya accedes a Kaptah.</p>
    </div>
    <div style="background:#f5f5f5;padding:15px;text-align:center;font-size:12px;color:#999;">
      Este correo fue enviado automaticamente por Kaptah.
    </div>
  </div>
</body></html>`,
      });
      this.logger.log('Link email sent to: ' + email);
    } catch (error) {
      this.logger.error('Error sending link email: ' + error.message);
    }
  }

  private async sendInvitationEmail(email: string, nombre: string, password: string, rolName: string, adminName: string): Promise<void> {
    try {
      await this.resend.emails.send({
        from: 'Kaptah <no-reply@kaptah.mx>',
        to: [email],
        subject: 'Invitacion a Kaptah - Tu cuenta ha sido creada',
        html: this.getInvitationEmailHtml(nombre, email, password, rolName, adminName),
      });
      this.logger.log('Invitation email sent to: ' + email);
    } catch (error) {
      this.logger.error('Error sending invitation email: ' + error.message);
    }
  }

  private getInvitationEmailHtml(nombre: string, email: string, password: string, rolName: string, adminName: string): string {
    return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;background:#f4f4f4;padding:20px;">
  <div style="max-width:600px;margin:0 auto;background:white;border-radius:8px;overflow:hidden;">
    <div style="background:#8e24aa;padding:30px;text-align:center;">
      <h1 style="color:white;margin:0;">Kaptah</h1>
    </div>
    <div style="padding:30px;">
      <h2 style="color:#333;">Hola ${nombre},</h2>
      <p style="color:#555;font-size:16px;">${adminName} te ha invitado a unirte a su cuenta en <strong>Kaptah</strong> con el rol de <strong>${rolName}</strong>.</p>
      <div style="background:#f8f0fc;border-radius:8px;padding:20px;margin:20px 0;">
        <p style="margin:0 0 10px;color:#333;font-weight:bold;">Tus credenciales de acceso:</p>
        <p style="margin:5px 0;color:#555;">Email: <strong>${email}</strong></p>
        <p style="margin:5px 0;color:#555;">Contrasena temporal: <strong>${password}</strong></p>
      </div>
      <p style="color:#555;font-size:14px;">Ingresa a <a href="https://app.kaptah.mx" style="color:#8e24aa;">app.kaptah.mx</a> con estas credenciales. Te recomendamos cambiar tu contrasena despues de ingresar.</p>
    </div>
    <div style="background:#f5f5f5;padding:15px;text-align:center;font-size:12px;color:#999;">
      Este correo fue enviado automaticamente por Kaptah.
    </div>
  </div>
</body></html>`;
  }
}
