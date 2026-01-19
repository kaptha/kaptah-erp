import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { Payment } from './entities/payment.entity';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private paymentsRepository: Repository<Payment>,
  ) {}

  async create(createPaymentDto: CreatePaymentDto, userId: string): Promise<Payment> {
    const payment = this.paymentsRepository.create({
      ...createPaymentDto,
      userId,
      paymentDate: new Date(),
      status: 'completed'
    });
    return this.paymentsRepository.save(payment);
  }

  findAll(): Promise<Payment[]> {
    return this.paymentsRepository.find({
      order: { createdAt: 'DESC' }
    });
  }

  async findOne(id: string): Promise<Payment> {
    const payment = await this.paymentsRepository.findOne({ where: { id } });
    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }
    return payment;
  }

  async update(id: string, updatePaymentDto: UpdatePaymentDto): Promise<Payment> {
    const payment = await this.findOne(id);
    Object.assign(payment, updatePaymentDto);
    return this.paymentsRepository.save(payment);
  }

  async remove(id: string): Promise<void> {
    const payment = await this.findOne(id);
    await this.paymentsRepository.remove(payment);
  }

  async findByAccountPayable(accountPayableId: string): Promise<Payment[]> {
    return this.paymentsRepository
      .createQueryBuilder('payment')
      .where('payment.accountPayableId = :accountPayableId', { accountPayableId })
      .getMany();
  }

  async findByAccountReceivable(accountReceivableId: string): Promise<Payment[]> {
    return this.paymentsRepository
      .createQueryBuilder('payment')
      .where('payment.accountReceivableId = :accountReceivableId', { accountReceivableId })
      .getMany();
  }
}


