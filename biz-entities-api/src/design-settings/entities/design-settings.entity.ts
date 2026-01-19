import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('user_design_settings')
export class DesignSettings {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'userId' })
  userId: number;

  @Column({ name: 'invoice_design_id', nullable: true })
  invoiceDesignId: string;

  @Column({ name: 'delivery_note_design_id', nullable: true })
  deliveryNoteDesignId: string;

  @Column({ name: 'quote_design_id', nullable: true })
  quoteDesignId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}