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
import { BranchService } from './branch.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { Request } from 'express';
import { UsersService } from 'src/users/users.service';

interface RequestWithUser extends Request {
  user?: {
    firebaseUid: string;
  };
}

@Controller('branches')
@UseGuards(FirebaseAuthGuard)
export class BranchController {
  private readonly logger = new Logger(BranchController.name);
  
  constructor(
    private readonly branchService: BranchService,
    private readonly usersService: UsersService
  ) {}

  @Post()
  async create(@Body() createBranchDto: CreateBranchDto, @Req() req: RequestWithUser) {
    this.logger.log('Datos recibidos en el backend:', createBranchDto);
    if (!req.user || !req.user.firebaseUid) {
      throw new UnauthorizedException('No se pudo obtener el UID de Firebase del usuario');
    }
    return this.branchService.create(createBranchDto, req.user.firebaseUid);
  }

  @Get(':realtimeDbKey')
  async findAll(@Param('realtimeDbKey') realtimeDbKey: string) {
    return this.branchService.findAllByRealtimeDbKey(realtimeDbKey);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateBranchDto: UpdateBranchDto) {
    return this.branchService.update(+id, updateBranchDto);
  }

  @Delete(':ID')
  async remove(@Param('ID') ID: string) {
    this.logger.log(`Recibida solicitud para eliminar sucursal con ID: ${ID}`);
    return this.branchService.remove(+ID);
  }
}
