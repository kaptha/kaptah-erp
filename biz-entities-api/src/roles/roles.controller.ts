import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe, Logger } from '@nestjs/common';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { AssignRoleDto } from './dto/assign-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { IsString, IsEmail, IsNumber } from 'class-validator';

class CreateSubUserDto {
  @IsString()
  nombre: string;
  @IsEmail()
  email: string;
  @IsNumber()
  rolId: number;
  @IsString()
  adminFirebaseUid: string;
}

@Controller('roles')
export class RolesController {
  private readonly logger = new Logger(RolesController.name);

  constructor(private readonly rolesService: RolesService) {}

  @Get('sub-users/:firebaseUid')
  getSubUsers(@Param('firebaseUid') firebaseUid: string) {
    this.logger.log('GET /roles/sub-users/' + firebaseUid);
    return this.rolesService.getSubUsers(firebaseUid);
  }

  @Get('account/:firebaseUid')
  findAll(@Param('firebaseUid') firebaseUid: string) {
    this.logger.log('GET /roles/account/' + firebaseUid);
    return this.rolesService.findAllByAccount(firebaseUid);
  }

  @Get('user/:firebaseUid')
  findUserRole(@Param('firebaseUid') firebaseUid: string) {
    this.logger.log('GET /roles/user/' + firebaseUid);
    return this.rolesService.findUserRole(firebaseUid);
  }

  @Get('permissions/:firebaseUid')
  getUserPermissions(@Param('firebaseUid') firebaseUid: string) {
    this.logger.log('GET /roles/permissions/' + firebaseUid);
    return this.rolesService.getUserPermissions(firebaseUid);
  }

  @Post('create-sub-user')
  createSubUser(@Body() body: CreateSubUserDto) {
    this.logger.log('POST /roles/create-sub-user - ' + body.email);
    const { adminFirebaseUid, ...data } = body;
    return this.rolesService.createSubUser(data, adminFirebaseUid);
  }

  @Post('seed/:firebaseUid')
  seedRoles(@Param('firebaseUid') firebaseUid: string) {
    this.logger.log('POST /roles/seed/' + firebaseUid);
    return this.rolesService.seedRolesForAccount(firebaseUid);
  }

  @Post('assign')
  assignRole(@Body() body: AssignRoleDto & { adminFirebaseUid: string }) {
    this.logger.log('POST /roles/assign');
    const { adminFirebaseUid, ...dto } = body;
    return this.rolesService.assignRole(dto, adminFirebaseUid);
  }

  @Post('custom')
  createCustomRole(@Body() body: CreateRoleDto & { adminFirebaseUid: string }) {
    this.logger.log('POST /roles/custom');
    const { adminFirebaseUid, ...dto } = body;
    return this.rolesService.createCustomRole(dto, adminFirebaseUid);
  }

  @Put(':id')
  updateRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateRoleDto & { adminFirebaseUid: string },
  ) {
    this.logger.log('PUT /roles/' + id);
    const { adminFirebaseUid, ...dto } = body;
    return this.rolesService.updateRole(id, dto, adminFirebaseUid);
  }

  @Delete(':id')
  deleteRole(@Param('id', ParseIntPipe) id: number, @Body() body: { adminFirebaseUid: string }) {
    this.logger.log('DELETE /roles/' + id);
    return this.rolesService.deleteRole(id, body.adminFirebaseUid);
  }
}
