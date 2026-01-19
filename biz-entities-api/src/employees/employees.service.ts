import { Injectable, NotFoundException, Logger, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { Employee } from './entities/employee.entity';
import { UserEntityRelationsService } from '../user-entity-relations/user-entity-relations.service';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class EmployeesService {
  private readonly logger = new Logger(EmployeesService.name);

  constructor(
    @InjectRepository(Employee)
    private employeesRepository: Repository<Employee>,
    private userEntityRelationsService: UserEntityRelationsService,
    private usersService: UsersService
  ) {}

  async create(createEmployeeDto: CreateEmployeeDto, firebaseUid: string): Promise<Employee> {
    const user = await this.usersService.findUserByFirebaseUid(firebaseUid);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    await this.validateUniqueFields(createEmployeeDto);
    this.validateDeduccionesPercepciones(createEmployeeDto);

    const newEmployee = this.employeesRepository.create({
      ...createEmployeeDto,
      fechaInicio: new Date(createEmployeeDto.fechaInicio),
      userId: user.ID
    });

    return await this.employeesRepository.save(newEmployee);
}

  private async validateUniqueFields(dto: CreateEmployeeDto | UpdateEmployeeDto, excludeId?: number) {
    if (!dto.rfc && !dto.curp) return;

    const where = excludeId ? { id: Not(excludeId) } : {};

    if (dto.rfc) {
      const rfcExists = await this.employeesRepository.findOne({
        where: { ...where, rfc: dto.rfc }
      });
      if (rfcExists) {
        throw new ConflictException('Ya existe un empleado con este RFC');
      }
    }

    if (dto.curp) {
      const curpExists = await this.employeesRepository.findOne({
        where: { ...where, curp: dto.curp }
      });
      if (curpExists) {
        throw new ConflictException('Ya existe un empleado con este CURP');
      }
    }
  }

  private validateDeduccionesPercepciones(dto: Partial<CreateEmployeeDto | UpdateEmployeeDto>) {
    if (!dto.salarioBase && !dto.deducciones && !dto.percepciones) {
      return;
    }

    const totalDeducciones = (dto.deducciones || []).reduce((sum, ded) => 
      sum + (Number(ded.importeGravado) + Number(ded.importeExento)), 0
    );

    const totalPercepciones = (dto.percepciones || []).reduce((sum, perc) => 
      sum + (Number(perc.importeGravado) + Number(perc.importeExento)), 0
    );

    const totalIngresos = Number(dto.salarioBase || 0) + totalPercepciones;
    if (totalDeducciones > totalIngresos) {
      throw new BadRequestException(
        'El total de deducciones no puede ser mayor al salario base más percepciones'
      );
    }

    // Validar montos negativos
    const validarMontosNegativos = (items: any[] | undefined, tipo: string) => {
      items?.forEach(item => {
        if (Number(item.importeGravado) < 0 || Number(item.importeExento) < 0) {
          throw new BadRequestException(`Los importes de ${tipo} no pueden ser negativos`);
        }
      });
    };

    validarMontosNegativos(dto.deducciones, 'deducciones');
    validarMontosNegativos(dto.percepciones, 'percepciones');
  }

  async findAllByRealtimeDbKey(realtimeDbKey: string): Promise<Employee[]> {
    const user = await this.usersService.findUserByRealtimeDbKey(realtimeDbKey);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return this.employeesRepository.find({ where: { userId: user.ID } });
  }

  async update(id: number, updateEmployeeDto: UpdateEmployeeDto): Promise<Employee> {
    const employee = await this.employeesRepository.findOne({ where: { id } });
    if (!employee) {
      throw new NotFoundException(`Empleado con ID ${id} no encontrado`);
    }

    await this.validateUniqueFields(updateEmployeeDto, id);

    // Convertir la fecha a string antes de validar
    const employeeDataToValidate = {
      ...employee,
      ...updateEmployeeDto,
      fechaInicio: updateEmployeeDto.fechaInicio || 
        (employee.fechaInicio instanceof Date ? 
          employee.fechaInicio.toISOString() : 
          employee.fechaInicio)
    };

    this.validateDeduccionesPercepciones(employeeDataToValidate as CreateEmployeeDto);

    // Si hay una nueva fecha, convertirla a Date
    if (updateEmployeeDto.fechaInicio) {
      updateEmployeeDto = {
        ...updateEmployeeDto,
        fechaInicio: new Date(updateEmployeeDto.fechaInicio).toISOString()
      };
    }

    Object.assign(employee, updateEmployeeDto);
    
    const updatedEmployee = await this.employeesRepository.save(employee);
    this.logger.log('Empleado actualizado en la base de datos:', updatedEmployee);
    
    return updatedEmployee;
}

  async remove(id: number): Promise<void> {
    this.logger.log(`Intentando eliminar empleado con ID: ${id}`);
    const result = await this.employeesRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Empleado con ID ${id} no encontrado`);
    }
  }
}
