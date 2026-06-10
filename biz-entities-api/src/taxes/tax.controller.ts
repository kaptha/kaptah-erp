import {
  Controller, Get, Post, Body, Put, Param,
  Delete, UseGuards, Req, UnauthorizedException, Logger, Query
} from '@nestjs/common';
import { Request } from 'express';
import { FirebaseAuthGuard } from '../guards/firebase-auth.guard';
import { TaxService } from './tax.service';
import { CreateTaxDto } from './dto/create-tax.dto';
import { UpdateTaxDto } from './dto/update-tax.dto';

interface RequestWithUser extends Request {
  user?: { firebaseUid?: string; uid?: string; };
}

@Controller('taxes')
export class TaxController {
  private readonly logger = new Logger(TaxController.name);

  constructor(private readonly taxService: TaxService) {}

  @Get('firebase/:firebaseUid')
  async findByFirebaseUid(@Param('firebaseUid') firebaseUid: string) {
    return this.taxService.findAllByUser(firebaseUid);
  }

  @Get(':realtimeDbKey')
  async findAll(@Param('realtimeDbKey') realtimeDbKey: string) {
    return this.taxService.findAllByRealtimeDbKey(realtimeDbKey);
  }

  @Post()
  @UseGuards(FirebaseAuthGuard)
  async create(
    @Body() createTaxDto: CreateTaxDto,
    @Req() req: RequestWithUser,
    @Query('cuentaUid') cuentaUid?: string
  ) {
    const tokenUid = req.user?.firebaseUid || req.user?.uid;
    const ownerUid = cuentaUid || tokenUid;
    if (!ownerUid) {
      throw new UnauthorizedException('No se pudo obtener el UID de Firebase del usuario');
    }
    this.logger.log(`Creando impuesto para ownerUid: ${ownerUid}`);
    return this.taxService.create(createTaxDto, ownerUid);
  }

  @Put(':id')
  @UseGuards(FirebaseAuthGuard)
  async update(@Param('id') id: string, @Body() updateTaxDto: UpdateTaxDto) {
    return this.taxService.update(+id, updateTaxDto);
  }

  @Delete(':ID')
  @UseGuards(FirebaseAuthGuard)
  async remove(@Param('ID') ID: string) {
    this.logger.log(`Eliminando impuesto con ID: ${ID}`);
    return this.taxService.remove(+ID);
  }
}
