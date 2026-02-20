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
import { BranchTransferService } from './branch-transfer.service';
import { CreateBranchTransferDto } from './dto/create-transfer.dto';
import { UpdateTransferStatusDto } from './dto/update-transfer-status.dto';
import { FilterBranchTransferDto } from './dto/filter-transfer.dto';

interface RequestWithUser extends Request {
  user?: {
    firebaseUid: string;
  };
}

@Controller('branch-transfers')
export class BranchTransferController {
  constructor(private readonly branchTransferService: BranchTransferService) {}

  @Post()
  create(@Body() createDto: CreateBranchTransferDto, @Req() req: RequestWithUser) {
    if (!req.user?.firebaseUid) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    return this.branchTransferService.create(createDto, req.user.firebaseUid);
  }

  @Get()
  findAll(@Query() filterDto: FilterBranchTransferDto, @Req() req: RequestWithUser) {
    if (!req.user?.firebaseUid) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    filterDto.userId = req.user.firebaseUid;
    return this.branchTransferService.findAll(filterDto, req.user.firebaseUid);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithUser) {
    if (!req.user?.firebaseUid) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    return this.branchTransferService.findOne(id, req.user.firebaseUid);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateTransferStatusDto,
    @Req() req: RequestWithUser
  ) {
    if (!req.user?.firebaseUid) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    return this.branchTransferService.updateStatus(id, updateDto, req.user.firebaseUid);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithUser) {
    if (!req.user?.firebaseUid) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    return this.branchTransferService.remove(id, req.user.firebaseUid);
  }
}
