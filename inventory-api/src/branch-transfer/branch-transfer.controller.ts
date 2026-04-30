import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  UnauthorizedException,
  UseGuards
} from '@nestjs/common';
import { BranchTransferService } from './branch-transfer.service';
import { CreateBranchTransferDto } from './dto/create-branch-transfer.dto';
import { UpdateTransferStatusDto } from './dto/update-transfer-status.dto';
import { FilterBranchTransferDto } from './dto/filter-branch-transfer.dto';
import { UsersService } from '../users/users.service';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { FirebaseAuthGuard } from '../guards/firebase-auth.guard';
@Controller('branch-transfers')
export class BranchTransferController {
  constructor(
    private readonly branchTransferService: BranchTransferService,
    private readonly usersService: UsersService
  ) {}

  // Obtener todas las transferencias
  @Get('firebase/:firebaseUid')
  async findAll(
    @Param('firebaseUid') firebaseUid: string,
    @Query() filterDto: FilterBranchTransferDto
  ) {
    console.log('📋 GET /branch-transfers/firebase/:firebaseUid - firebaseUid:', firebaseUid);
    
    const user = await this.usersService.findByFirebaseUid(firebaseUid);
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    return this.branchTransferService.findAll(filterDto, firebaseUid);
  }

  // Crear transferencia
  @UseGuards(FirebaseAuthGuard, PermissionsGuard)
  @RequirePermission('inventario_multi_sucursal.crear')
  @Post('firebase/:firebaseUid')
  async create(
    @Param('firebaseUid') firebaseUid: string,
    @Body() createDto: CreateBranchTransferDto
  ) {
    console.log('📝 POST /branch-transfers/firebase/:firebaseUid');
    
    const user = await this.usersService.findByFirebaseUid(firebaseUid);
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    return this.branchTransferService.create(createDto, firebaseUid);
  }

  // Obtener transferencia por ID
  @Get('firebase/:firebaseUid/:id')
  async findOne(
    @Param('firebaseUid') firebaseUid: string,
    @Param('id', ParseIntPipe) id: number
  ) {
    return this.branchTransferService.findOne(id, firebaseUid);
  }

  // Aprobar transferencia
  @Patch('firebase/:firebaseUid/:id/approve')
  async approve(
    @Param('firebaseUid') firebaseUid: string,
    @Param('id', ParseIntPipe) id: number,
    @Body('approved_by') approved_by: string
  ) {
    console.log(`✅ PATCH /branch-transfers/firebase/${firebaseUid}/${id}/approve`);
    return this.branchTransferService.approveTransfer(id, approved_by, firebaseUid);
  }

  // Completar transferencia
  @Patch('firebase/:firebaseUid/:id/complete')
  async complete(
    @Param('firebaseUid') firebaseUid: string,
    @Param('id', ParseIntPipe) id: number
  ) {
    console.log(`✅ PATCH /branch-transfers/firebase/${firebaseUid}/${id}/complete`);
    return this.branchTransferService.completeTransfer(id, firebaseUid);
  }

  // Cancelar transferencia
  @Patch('firebase/:firebaseUid/:id/cancel')
  async cancel(
    @Param('firebaseUid') firebaseUid: string,
    @Param('id', ParseIntPipe) id: number,
    @Body('reason') reason: string
  ) {
    console.log(`❌ PATCH /branch-transfers/firebase/${firebaseUid}/${id}/cancel`);
    return this.branchTransferService.cancelTransfer(id, reason, firebaseUid);
  }

  // Actualizar estado
  @Patch('firebase/:firebaseUid/:id/status')
  async updateStatus(
    @Param('firebaseUid') firebaseUid: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStatusDto: UpdateTransferStatusDto
  ) {
    return this.branchTransferService.updateTransferStatus(id, updateStatusDto, firebaseUid);
  }

  // Eliminar transferencia
  @UseGuards(FirebaseAuthGuard, PermissionsGuard)
  @RequirePermission('inventario_multi_sucursal.eliminar')
  @Delete('firebase/:firebaseUid/:id')
  async remove(
    @Param('firebaseUid') firebaseUid: string,
    @Param('id', ParseIntPipe) id: number
  ) {
    console.log(`🗑️ DELETE /branch-transfers/firebase/${firebaseUid}/${id}`);
    return this.branchTransferService.remove(id, firebaseUid);
  }
}
