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
  UnauthorizedException,
  Logger,
  ValidationPipe
} from '@nestjs/common';
import { FirebaseAuthGuard } from '../guards/firebase-auth.guard';
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
@UseGuards(FirebaseAuthGuard)
export class EmployeesController {
  private readonly logger = new Logger(EmployeesController.name);

  constructor(
    private readonly employeesService: EmployeesService,
    private readonly usersService: UsersService
  ) {}

  @Post()
  async create(@Body() createEmployeeDto: CreateEmployeeDto, @Req() req: RequestWithUser) {
    this.logger.log('Datos recibidos para crear empleado:', createEmployeeDto);
    
    if (!req.user || !req.user.firebaseUid) {
      throw new UnauthorizedException('No se pudo obtener el UID de Firebase del usuario');
    }

    return this.employeesService.create(createEmployeeDto, req.user.firebaseUid);
  }

  @Get(':realtimeDbKey')
  async findAll(@Param('realtimeDbKey') realtimeDbKey: string) {
    return this.employeesService.findAllByRealtimeDbKey(realtimeDbKey);
  }

  @Put(':id')
  async update(
    @Param('id') id: string, 
    @Body() updateEmployeeDto: UpdateEmployeeDto
  ) {
    this.logger.log(`Actualizando empleado con ID: ${id}`);
    return this.employeesService.update(+id, updateEmployeeDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    this.logger.log(`Eliminando empleado con ID: ${id}`);
    return this.employeesService.remove(+id);
  }
}
