import { Injectable, NotFoundException, Logger, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { Client } from './entities/client.entity';
import { UserEntityRelationsService } from '../user-entity-relations/user-entity-relations.service';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class ClientsService {
  private readonly logger = new Logger(ClientsService.name);
  
  constructor(
    @InjectRepository(Client)
    private clientsRepository: Repository<Client>,
    private userEntityRelationsService: UserEntityRelationsService,
    private usersService: UsersService
  ) {}

  async create(createClientDto: CreateClientDto, firebaseUid: string): Promise<Client> {
    const user = await this.usersService.findUserByFirebaseUid(firebaseUid);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
  
    const newClient = this.clientsRepository.create({
      ...createClientDto,
      userId: user.ID 
    });
  
    return await this.clientsRepository.save(newClient);
  }

  async findAllByRealtimeDbKey(realtimeDbKey: string): Promise<Client[]> {
    const user = await this.usersService.findUserByRealtimeDbKey(realtimeDbKey);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return this.clientsRepository.find({ where: { userId: user.ID } });
  }

  async findAllByUser(firebaseUid: string): Promise<Client[]> {
    const user = await this.usersService.findUserByFirebaseUid(firebaseUid);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return this.clientsRepository.find({ where: { userId: user.ID } });
  }

  async findOne(ID: number, firebaseUid: string): Promise<Client> {
    const user = await this.usersService.findUserByFirebaseUid(firebaseUid);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const relation = await this.userEntityRelationsService.findRelation(user.ID, ID, 'Cliente');
    if (!relation) {
      throw new NotFoundException('Cliente no encontrado');
    }

    const client = await this.clientsRepository.findOne({ where: { ID } });
    if (!client) {
      throw new NotFoundException('Cliente no encontrado');
    }
    return client;
  }

  // 👇 NUEVO MÉTODO: Buscar cliente por RFC
  async findByRfc(rfc: string, firebaseUid: string): Promise<Client | null> {
  try {
    const user = await this.usersService.findUserByFirebaseUid(firebaseUid);
    if (!user) {
      return null;
    }

    const client = await this.clientsRepository.findOne({
      where: { 
        Rfc: rfc, 
        userId: user.ID 
      },
    });
    
    return client;
  } catch (error) {
    this.logger.error('Error buscando cliente por RFC:', error.message);
    return null;
  }
}

  async update(id: number, updateClientDto: UpdateClientDto): Promise<Client> {
    const client = await this.clientsRepository.findOne({ where: { ID: id } });
    
    if (!client) {
      throw new NotFoundException(`Cliente con ID ${id} no encontrado`);
    }

    Object.assign(client, updateClientDto);

    const updatedClient = await this.clientsRepository.save(client);
    console.log('Cliente actualizado en la base de datos:', updatedClient);
    
    return updatedClient;
  }

  async remove(ID: number): Promise<void> {
    console.log(`Intentando eliminar cliente con ID: ${ID}`);
    const result = await this.clientsRepository.delete(ID);
    if (result.affected === 0) {
      throw new NotFoundException(`Cliente con ID ${ID} no encontrado`);
    }
  }
}
