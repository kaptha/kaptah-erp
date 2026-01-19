import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('logos')
export class Logo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  // Campos antiguos para almacenamiento local
  @Column({ nullable: true })
  filename: string;

  @Column({ nullable: true })
  path: string;

  // Campos nuevos para Cloudinary
  @Column({ nullable: true })
  url: string;

  @Column({ nullable: true })
  publicId: string;

  @Column()
  originalName: string;

  @Column()
  mimeType: string;

  @Column()
  size: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}