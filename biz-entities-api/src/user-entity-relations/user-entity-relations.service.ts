import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntityRelation } from './entities/user-entity-relation.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class UserEntityRelationsService {
  constructor(
    @InjectRepository(UserEntityRelation)
    private readonly userEntityRelationRepository: Repository<UserEntityRelation>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
  ) {}

 
  async findRelation(userId: number, entityId: number, entityType: string): Promise<UserEntityRelation | null> {
    return this.userEntityRelationRepository.findOne({ 
      where: { 
        ID_Usuario: userId, 
        ID_Entidad: entityId, 
        Tipo_Entidad: entityType 
      } 
    });
  }

  async removeRelation(userId: number, entityId: number, entityType: string): Promise<void> {
    await this.userEntityRelationRepository.delete({ 
      ID_Usuario: userId, 
      ID_Entidad: entityId, 
      Tipo_Entidad: entityType 
    });
  }

  async createRelation(userId: string, entityId: number, entityType: string): Promise<UserEntityRelation> {
    const user = await this.userRepository.findOne({ where: { ID: parseInt(userId) } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const relation = this.userEntityRelationRepository.create({
      ID_Usuario: user.ID,
      ID_Entidad: entityId,
      Tipo_Entidad: entityType,
    });
    return await this.userEntityRelationRepository.save(relation);
  }

  async findRelationsByUser(userId: number): Promise<UserEntityRelation[]> {
    return this.userEntityRelationRepository.find({
      where: { ID_Usuario: userId }
    });
  }
}
