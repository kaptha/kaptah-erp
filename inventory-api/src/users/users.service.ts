import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User, 'default')
    private usersRepository: Repository<User>,
  ) {}

  async findByFirebaseUid(firebaseUid: string): Promise<User | null> {
    return this.usersRepository.findOne({ 
      where: { firebaseUid }
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email }
    });
  }

  async findById(ID: number): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { ID }
    });
  }

  async create(userData: Partial<User>): Promise<User> {
    const user = this.usersRepository.create(userData);
    return this.usersRepository.save(user);
  }

  async update(id: number, userData: Partial<User>): Promise<User> {
    await this.usersRepository.update(id, userData);
    return this.findById(id);
  }
}
