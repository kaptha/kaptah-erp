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
  UseGuards  // ← AGREGAR
} from '@nestjs/common';
import { FirebaseAuthGuard } from '../guards/firebase-auth.guard';  // ← AGREGAR
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
@UseGuards(FirebaseAuthGuard)  // ← AGREGAR
export class BranchInventoryController {
  constructor(
    private readonly branchInventoryService: BranchInventoryService,
    private readonly usersService: UsersService
  ) {}

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

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateBranchInventoryDto,
    @Req() req: RequestWithUser
  ) {
    if (!req.user?.firebaseUid) {
      throw new UnauthorizedException('Usuario no autenticado');
    }

    const user = await this.usersService.findByFirebaseUid(req.user.firebaseUid);
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    return this.branchInventoryService.update(id, updateDto, String(user.ID));
  }

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
