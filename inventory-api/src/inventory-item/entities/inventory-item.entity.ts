// src/inventory-item/entities/inventory-item.entity.ts
import { 
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn
 } from 'typeorm';
 import { MovementType } from '../enums/movement-type.enum';
 import { Product } from '../../product/entities/product.entity';
 
 @Entity('inventory_movements')
 export class InventoryItem {
  @PrimaryGeneratedColumn()
  id: number;
 
  @Column({ name: 'product_id' })
  productId: number;
 
  @Column({
    name: 'movement_type',
    type: 'enum',
    enum: MovementType
  })
  movementType: MovementType;
 
  @Column()
  quantity: number;
 
  @Column({ name: 'previous_stock' })
  previousStock: number;
 
  @Column({ name: 'new_stock' })
  newStock: number;
 
  @Column({ name: 'reference_type', nullable: true })
  referenceType: string;
 
  @Column({ name: 'reference_id', nullable: true })
  referenceId: string;
 
  @Column({ type: 'text', nullable: true })
  notes: string;
 
  @Column({ name: 'user_id' })
  userId: number;
 
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
 
  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;
 }