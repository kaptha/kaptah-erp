import { 
  Entity, 
  Column, 
  PrimaryGeneratedColumn, 
  CreateDateColumn, 
  UpdateDateColumn,
  ManyToOne, 
  JoinColumn 
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ServiceCategory } from '../../service-category/entities/service-category.entity';

@Entity('services')
export class Service {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ length: 50, name: 'sat_key' })
  satKey: string;

  @Column({ name: 'unitId', type: 'varchar', length: 10 })
  unitId: string;

  @Column()
  categoryId: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ length: 3 })
  moneda: string;

  @Column({ nullable: true })
  duration: number;

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

  @ManyToOne(() => ServiceCategory)
  @JoinColumn({ name: 'categoryId' })
  category: ServiceCategory;
  
}