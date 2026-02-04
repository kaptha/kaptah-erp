import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  ParseIntPipe,
  UseGuards,
  Req,
  InternalServerErrorException,
  UnauthorizedException,
  NotFoundException,
  Logger,
  ConflictException,
  ValidationPipe
} from '@nestjs/common';
import { FirebaseAuthGuard } from '../guards/firebase-auth.guard';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { Request } from 'express';
import { UsersService } from 'src/users/users.service';

interface RequestWithUser extends Request {
  user?: {
    firebaseUid: string;
  };
}

@Controller('clients')
@UseGuards(FirebaseAuthGuard)
export class ClientsController {
  private readonly logger = new Logger(ClientsController.name);
  
  constructor(
    private readonly clientsService: ClientsService,
    private readonly usersService: UsersService
  ) {}

  @Post()
  async create(@Body() createClientDto: CreateClientDto, @Req() req: RequestWithUser) {
    console.log('Datos recibidos en el backend:', createClientDto);
    if (!req.user || !req.user.firebaseUid) {
      throw new UnauthorizedException('No se pudo obtener el UID de Firebase del usuario');
    }
    return this.clientsService.create(createClientDto, req.user.firebaseUid);
  }

  // 👇 1. PRIMERO: GET sin parámetros (más específico)
  @Get('all')  // 👈 Cambiar a una ruta específica para evitar conflictos
  async findAllByUser(@Req() req: RequestWithUser) {
    console.log('📋 GET /clients/all - Obteniendo todos los clientes del usuario');
    if (!req.user || !req.user.firebaseUid) {
      throw new UnauthorizedException('No se pudo obtener el UID de Firebase del usuario');
    }
    return this.clientsService.findAllByUser(req.user.firebaseUid);
  }
  @Get('by-rfc/:rfc')
  async findByRfc(@Param('rfc') rfc: string, @Req() req: RequestWithUser) {
    console.log('📋 Buscando cliente por RFC:', rfc);
    if (!req.user || !req.user.firebaseUid) {
      throw new UnauthorizedException('No autorizado');
    }
    const client = await this.clientsService.findByRfc(rfc, req.user.firebaseUid);
    if (!client) {
      throw new NotFoundException(`Cliente con RFC ${rfc} no encontrado`);
    }
    return client;
  }
  @Get('firebase/:firebaseUid')
async findByFirebaseUid(@Param('firebaseUid') firebaseUid: string) {
  console.log('📋 GET /clients/firebase/:firebaseUid - firebaseUid:', firebaseUid);
  return this.clientsService.findAllByUser(firebaseUid);
}

  // 👇 2. DESPUÉS: GET con parámetro (más genérico)
  @Get(':realtimeDbKey')
  async findAll(@Param('realtimeDbKey') realtimeDbKey: string) {
    console.log('📋 GET /clients/:realtimeDbKey - realtimeDbKey:', realtimeDbKey);
    return this.clientsService.findAllByRealtimeDbKey(realtimeDbKey);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateClientDto: UpdateClientDto) {
    return this.clientsService.update(+id, updateClientDto);
  }

  @Delete(':ID')
  async remove(@Param('ID') ID: string) {
    console.log(`Recibida solicitud para eliminar cliente con ID: ${ID}`);
    return this.clientsService.remove(+ID);
  }
}