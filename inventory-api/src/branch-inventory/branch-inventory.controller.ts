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
  UnauthorizedException
} from '@nestjs/common';
import { BranchInventoryService } from './branch-inventory.service';
import { CreateBranchInventoryDto } from './dto/create-branch-inventory.dto';
import { UpdateBranchInventoryDto } from './dto/update-branch-inventory.dto';
import { FilterBranchInventoryDto } from './dto/filter-branch-inventory.dto';

interface RequestWithUser extends Request {
  user?: {
    firebaseUid: string;
  };
}

@Controller('branch-inventory')
export class BranchInventoryController {
  constructor(private readonly branchInventoryService: BranchInventoryService) {}

  @Post()
  create(@Body() createDto: CreateBranchInventoryDto, @Req() req: RequestWithUser) {
    if (!req.user?.firebaseUid) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    return this.branchInventoryService.create(createDto, req.user.firebaseUid);
  }

  @Get()
  findAll(@Query() filterDto: FilterBranchInventoryDto, @Req() req: RequestWithUser) {
    if (!req.user?.firebaseUid) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    filterDto.userId = req.user.firebaseUid;
    return this.branchInventoryService.findAll(filterDto, req.user.firebaseUid);
  }

  @Get('value/:branch_id')
  getInventoryValue(
    @Param('branch_id', ParseIntPipe) branch_id: number,
    @Req() req: RequestWithUser
  ) {
    if (!req.user?.firebaseUid) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    return this.branchInventoryService.getInventoryValue(branch_id, req.user.firebaseUid);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithUser) {
    if (!req.user?.firebaseUid) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    return this.branchInventoryService.findOne(id, req.user.firebaseUid);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateBranchInventoryDto,
    @Req() req: RequestWithUser
  ) {
    if (!req.user?.firebaseUid) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    return this.branchInventoryService.update(id, updateDto, req.user.firebaseUid);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithUser) {
    if (!req.user?.firebaseUid) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    return this.branchInventoryService.remove(id, req.user.firebaseUid);
  }
}
