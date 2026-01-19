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
import { ProductCategory } from '../../category/entities/category.entity';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ length: 50, nullable: true, unique: true })
  sku: string;

  @Column({ length: 100, nullable: true })
  barcode: string;

  @Column({ length: 50, name: 'sat_key' })
  satKey: string;

  @Column()
  unit_key: string;

  @Column()
  categoryId: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  cost: number;

  @Column({ name: 'min_stock', default: 0 })
  minStock: number;

  @Column({ name: 'max_stock', nullable: true })
  maxStock: number;

  @Column({ name: 'current_stock', default: 0 })
  currentStock: number;

  @Column({ default: true })
  active: boolean;

  @Column({ name: 'userId' })
  userId: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  //@ManyToOne(() => User)
  //@JoinColumn({ 
    //name: 'userId',
    //referencedColumnName: 'ID'  
  //})
  //user: User;

  @ManyToOne(() => ProductCategory)
@JoinColumn({ name: 'categoryId' })  
category: ProductCategory;
}