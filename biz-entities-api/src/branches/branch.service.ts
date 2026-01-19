import { Injectable, NotFoundException, Logger, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { Branch } from './entities/branch.entity';
import { UserEntityRelationsService } from '../user-entity-relations/user-entity-relations.service';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class BranchService {
  private readonly logger = new Logger(BranchService.name);
  
  constructor(
    @InjectRepository(Branch)
    private branchRepository: Repository<Branch>,
    private userEntityRelationsService: UserEntityRelationsService,
    private usersService: UsersService
  ) {}

  async create(createBranchDto: CreateBranchDto, firebaseUid: string): Promise<Branch> {
    const user = await this.usersService.findUserByFirebaseUid(firebaseUid);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const newBranch = this.branchRepository.create({
      ...createBranchDto,
      userId: user.ID
    });

    return await this.branchRepository.save(newBranch);
  }

  async findAllByRealtimeDbKey(realtimeDbKey: string): Promise<Branch[]> {
    const user = await this.usersService.findUserByRealtimeDbKey(realtimeDbKey);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return this.branchRepository.find({ where: { userId: user.ID } });
  }

  async findAllByUser(firebaseUid: string): Promise<Branch[]> {
    const user = await this.usersService.findUserByFirebaseUid(firebaseUid);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return this.branchRepository.find({ where: { userId: user.ID } });
  }

  async findOne(id: number, firebaseUid: string): Promise<Branch> {
    const user = await this.usersService.findUserByFirebaseUid(firebaseUid);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const relation = await this.userEntityRelationsService.findRelation(user.ID, id, 'Sucursal');
    if (!relation) {
      throw new NotFoundException('Sucursal no encontrada');
    }

    const branch = await this.branchRepository.findOne({ where: { id } });
    if (!branch) {
      throw new NotFoundException('Sucursal no encontrada');
    }
    return branch;
  }

  async update(id: number, updateBranchDto: UpdateBranchDto): Promise<Branch> {
    const branch = await this.branchRepository.findOne({ where: { id: id } });
    
    if (!branch) {
      throw new NotFoundException(`Sucursal con ID ${id} no encontrada`);
    }

    Object.assign(branch, updateBranchDto);

    const updatedBranch = await this.branchRepository.save(branch);
    this.logger.log('Sucursal actualizada en la base de datos:', updatedBranch);
    
    return updatedBranch;
  }

  async remove(ID: number): Promise<void> {
    this.logger.log(`Intentando eliminar sucursal con ID: ${ID}`);
    const result = await this.branchRepository.delete(ID);
    if (result.affected === 0) {
      throw new NotFoundException(`Sucursal con ID ${ID} no encontrada`);
    }
  }
}
