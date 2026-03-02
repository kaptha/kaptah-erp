import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  Query,
  ParseIntPipe,
  UnauthorizedException,
  UseGuards,
  SetMetadata
} from '@nestjs/common';
import { FirebaseAuthGuard } from '../guards/firebase-auth.guard';
import { BranchInventoryService } from './branch-inventory.service';
import { CreateBranchInventoryDto } from './dto/create-branch-inventory.dto';
import { UpdateBranchInventoryDto } from './dto/update-branch-inventory.dto';
import { FilterBranchInventoryDto } from './dto/filter-branch-inventory.dto';
import { UsersService } from '../users/users.service';

interface RequestWithUser extends Request {
  user?: {
    firebaseUid: string;
    ID?: number;
  };
}

@Controller('branch-inventory')
export class BranchInventoryController {
  constructor(
    private readonly branchInventoryService: BranchInventoryService,
    private readonly usersService: UsersService
  ) {}

  // ESTE ENDPOINT NO DEBE TENER GUARD
  @Get('firebase/:firebaseUid')
  async findByFirebaseUid(
    @Param('firebaseUid') firebaseUid: string,
    @Query() filterDto: FilterBranchInventoryDto
  ) {
    console.log('📋 GET /branch-inventory/firebase/:firebaseUid - firebaseUid:', firebaseUid);
    return this.branchInventoryService.findAll(filterDto, firebaseUid);
  }
  @Post('firebase/:firebaseUid')
async createByFirebaseUid(
  @Param('firebaseUid') firebaseUid: string,
  @Body() createDto: CreateBranchInventoryDto
) {
  console.log('📝 POST /branch-inventory/firebase/:firebaseUid - firebaseUid:', firebaseUid);
  
  const user = await this.usersService.findByFirebaseUid(firebaseUid);
  if (!user) {
    throw new UnauthorizedException('Usuario no encontrado');
  }

  createDto.userId = String(user.ID);
  return this.branchInventoryService.create(createDto, firebaseUid);
}

  // ESTOS SÍ USAN GUARD
  @UseGuards(FirebaseAuthGuard)
  @Post()
  async create(@Body() createDto: CreateBranchInventoryDto, @Req() req: RequestWithUser) {
    if (!req.user?.firebaseUid) {
      throw new UnauthorizedException('Usuario no autenticado');
    }

    const user = await this.usersService.findByFirebaseUid(req.user.firebaseUid);
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    createDto.userId = String(user.ID);
    return this.branchInventoryService.create(createDto, String(user.ID));
  }

  @UseGuards(FirebaseAuthGuard)
  @Get('value/:branch_id')
  async getInventoryValue(
    @Param('branch_id', ParseIntPipe) branch_id: number,
    @Req() req: RequestWithUser
  ) {
    if (!req.user?.firebaseUid) {
      throw new UnauthorizedException('Usuario no autenticado');
    }

    const user = await this.usersService.findByFirebaseUid(req.user.firebaseUid);
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    return this.branchInventoryService.getInventoryValue(branch_id, String(user.ID));
  }

  @UseGuards(FirebaseAuthGuard)
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithUser) {
    if (!req.user?.firebaseUid) {
      throw new UnauthorizedException('Usuario no autenticado');
    }

    const user = await this.usersService.findByFirebaseUid(req.user.firebaseUid);
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    return this.branchInventoryService.findOne(id, String(user.ID));
  }

  @UseGuards(FirebaseAuthGuard)
  @Get()
  async findAll(@Query() filterDto: FilterBranchInventoryDto, @Req() req: RequestWithUser) {
    if (!req.user?.firebaseUid) {
      throw new UnauthorizedException('Usuario no autenticado');
    }

    const user = await this.usersService.findByFirebaseUid(req.user.firebaseUid);
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    filterDto.userId = String(user.ID);
    return this.branchInventoryService.findAll(filterDto, String(user.ID));
  }


@Patch('firebase/:firebaseUid/:id')
async updateByFirebaseUid(
  @Param('firebaseUid') firebaseUid: string,
  @Param('id', ParseIntPipe) id: number,
  @Body() updateDto: UpdateBranchInventoryDto
) {
  console.log(`🔄 PATCH /branch-inventory/firebase/${firebaseUid}/${id}`);
  return this.branchInventoryService.update(id, updateDto, firebaseUid);
}

// Eliminar inventario sin guard
@Delete('firebase/:firebaseUid/:id')
async removeByFirebaseUid(
  @Param('firebaseUid') firebaseUid: string,
  @Param('id', ParseIntPipe) id: number
) {
  console.log(`🗑️ DELETE /branch-inventory/firebase/${firebaseUid}/${id}`);
  await this.branchInventoryService.remove(id, firebaseUid);
  return { message: 'Inventario eliminado correctamente' };
}

  @UseGuards(FirebaseAuthGuard)
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithUser) {
    if (!req.user?.firebaseUid) {
      throw new UnauthorizedException('Usuario no autenticado');
    }

    const user = await this.usersService.findByFirebaseUid(req.user.firebaseUid);
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    return this.branchInventoryService.remove(id, String(user.ID));
  }
}
