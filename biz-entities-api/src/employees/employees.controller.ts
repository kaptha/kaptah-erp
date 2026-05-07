import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  UseGuards,
  Req,
  Query,
  UnauthorizedException,
  Logger,
  ValidationPipe
} from '@nestjs/common';
import { FirebaseAuthGuard } from '../guards/firebase-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { Request } from 'express';
import { UsersService } from 'src/users/users.service';

interface RequestWithUser extends Request {
  user?: {
    firebaseUid: string;
  };
}

@Controller('employees')
@UseGuards(FirebaseAuthGuard, PermissionsGuard)
export class EmployeesController {
  private readonly logger = new Logger(EmployeesController.name);

  constructor(
    private readonly employeesService: EmployeesService,
    private readonly usersService: UsersService
  ) {}

  @Post()
  @RequirePermission('empleados.crear')
  async create(@Body() createEmployeeDto: CreateEmployeeDto, @Req() req: RequestWithUser, @Query('cuentaUid') cuentaUid?: string) {
    this.logger.log('Datos recibidos para crear empleado:', createEmployeeDto);
    if (!req.user || !req.user.firebaseUid) {
      throw new UnauthorizedException('No se pudo obtener el UID de Firebase del usuario');
    }
    const ownerUid = cuentaUid || req.user.firebaseUid;
    return this.employeesService.create(createEmployeeDto, ownerUid);
  }

  @Get(':realtimeDbKey')
  async findAll(@Param('realtimeDbKey') realtimeDbKey: string) {
    return this.employeesService.findAllByRealtimeDbKey(realtimeDbKey);
  }

  @Get('firebase/:firebaseUid')
  async findByFirebaseUid(@Param('firebaseUid') firebaseUid: string) {
    console.log('GET /employees/firebase/:firebaseUid - firebaseUid:', firebaseUid);
    return this.employeesService.findAllByUser(firebaseUid);
  }

  @Put(':id')
  @RequirePermission('empleados.editar')
  async update(
    @Param('id') id: string,
    @Body() updateEmployeeDto: UpdateEmployeeDto,
    @Query('cuentaUid') cuentaUid?: string,
  ) {
    this.logger.log(`Actualizando empleado con ID: ${id}`);
    return this.employeesService.update(+id, updateEmployeeDto);
  }

  @Delete(':id')
  @RequirePermission('empleados.eliminar')
  async remove(@Param('id') id: string, @Query('cuentaUid') cuentaUid?: string) {
    this.logger.log(`Eliminando empleado con ID: ${id}`);
    return this.employeesService.remove(+id);
  }
}