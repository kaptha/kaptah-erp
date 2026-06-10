import {
  Controller, Get, Post, Body, Put, Param,
  Delete, UseGuards, Req, UnauthorizedException,
  NotFoundException, Logger, Query
} from '@nestjs/common';
import { FirebaseAuthGuard } from '../guards/firebase-auth.guard';
import { BranchService } from './branch.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { Request } from 'express';

interface RequestWithUser extends Request {
  user?: { firebaseUid?: string; uid?: string; };
}

@Controller('branches')
export class BranchController {
  private readonly logger = new Logger(BranchController.name);

  constructor(private readonly branchService: BranchService) {}

  @Get('firebase/:firebaseUid')
  async findByFirebaseUid(@Param('firebaseUid') firebaseUid: string) {
    return this.branchService.findAllByUser(firebaseUid);
  }

  @Get(':realtimeDbKey')
  async findAll(@Param('realtimeDbKey') realtimeDbKey: string) {
    return this.branchService.findAllByRealtimeDbKey(realtimeDbKey);
  }

  @Post()
  @UseGuards(FirebaseAuthGuard)
  async create(
    @Body() createBranchDto: CreateBranchDto,
    @Req() req: RequestWithUser,
    @Query('cuentaUid') cuentaUid?: string
  ) {
    const tokenUid = req.user?.firebaseUid || req.user?.uid;
    const ownerUid = cuentaUid || tokenUid;
    if (!ownerUid) {
      throw new UnauthorizedException('No se pudo obtener el UID de Firebase del usuario');
    }
    this.logger.log(`Creando sucursal para ownerUid: ${ownerUid}`);
    return this.branchService.create(createBranchDto, ownerUid);
  }

  @Put(':id')
  @UseGuards(FirebaseAuthGuard)
  async update(@Param('id') id: string, @Body() updateBranchDto: UpdateBranchDto) {
    return this.branchService.update(+id, updateBranchDto);
  }

  @Delete(':ID')
  @UseGuards(FirebaseAuthGuard)
  async remove(@Param('ID') ID: string) {
    return this.branchService.remove(+ID);
  }
}
