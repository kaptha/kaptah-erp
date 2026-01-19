import { 
  Entity, 
  Column, 
  PrimaryGeneratedColumn, 
  CreateDateColumn, 
  UpdateDateColumn,
  ManyToOne, 
  JoinColumn,
  OneToMany
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { IServiceCategory } from '../../interfaces/service-category.interface';
import { IService } from '../../interfaces/service.interface';  // Ajustada la ruta

@Entity('service_categories')
export class ServiceCategory implements IServiceCategory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ default: true })
  active: boolean;

  @Column()
  userId: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  //@ManyToOne(() => User)
  //@JoinColumn({ name: 'userId' })
  //user: User;

  services: IService[]; 
}