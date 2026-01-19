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

@Entity('product_categories')
export class ProductCategory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ default: true })
  active: boolean;

  @Column({ type: 'int', name: 'userId' })
  userId: number;

  @Column()
  tipo: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

@Entity('service_categories')
export class ServiceCategory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ default: true })
  active: boolean;

  @Column({ type: 'int', name: 'userId' })
  userId: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

export type CategoryType = ProductCategory | ServiceCategory;