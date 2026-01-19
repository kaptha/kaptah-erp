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
import { TaxService } from './tax.service';
import { CreateTaxDto } from './dto/create-tax.dto';
import { UpdateTaxDto } from './dto/update-tax.dto';
import { Request } from 'express';
import { UsersService } from 'src/users/users.service';

interface RequestWithUser extends Request {
  user?: {
    firebaseUid: string;
  };
}

@Controller('taxes')
@UseGuards(FirebaseAuthGuard)
export class TaxController {
  private readonly logger = new Logger(TaxController.name);
  
  constructor(
    private readonly taxService: TaxService,
    private readonly usersService: UsersService
  ) {}

  @Post()
  async create(@Body() createTaxDto: CreateTaxDto, @Req() req: RequestWithUser) {
    this.logger.log('Datos recibidos en el backend:', createTaxDto);
    if (!req.user || !req.user.firebaseUid) {
      throw new UnauthorizedException('No se pudo obtener el UID de Firebase del usuario');
    }
    return this.taxService.create(createTaxDto, req.user.firebaseUid);
  }

  @Get(':realtimeDbKey')
  async findAll(@Param('realtimeDbKey') realtimeDbKey: string) {
    return this.taxService.findAllByRealtimeDbKey(realtimeDbKey);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateTaxDto: UpdateTaxDto) {
    return this.taxService.update(+id, updateTaxDto);
  }

  @Delete(':ID')
  async remove(@Param('ID') ID: string) {
    this.logger.log(`Recibida solicitud para eliminar impuesto con ID: ${ID}`);
    return this.taxService.remove(+ID);
  }
}