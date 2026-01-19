import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from './entities/payment.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>
  ) {}

  async create(createPaymentDto: CreatePaymentDto, userId: string): Promise<Payment> {
    const payment = this.paymentRepository.create({
      ...createPaymentDto,
      userId,
      createdBy: userId,
      status: 'PENDING'
    });

    return this.paymentRepository.save(payment);
  }

  async findAll(userId: string): Promise<Payment[]> {
    return this.paymentRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' }
    });
  }

  async findOne(id: string, userId: string): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({
      where: { id, userId }
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }

    return payment;
  }

  async update(id: string, updatePaymentDto: UpdatePaymentDto, userId: string): Promise<Payment> {
    const payment = await this.findOne(id, userId);
    Object.assign(payment, updatePaymentDto);
    return this.paymentRepository.save(payment);
  }

  async remove(id: string, userId: string): Promise<void> {
    const payment = await this.findOne(id, userId);
    await this.paymentRepository.remove(payment);
  }
}
