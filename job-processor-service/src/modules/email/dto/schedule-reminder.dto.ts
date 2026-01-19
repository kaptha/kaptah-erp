import {
  IsEmail,
  IsString,
  IsOptional,
  IsEnum,
  IsObject,
  IsDateString,
} from 'class-validator';

export enum RecurrenceType {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

export class ScheduleReminderDto {
  @IsString()
  userId: string;

  @IsString()
  organizationId: string;

  @IsEmail()
  recipient: string;

  @IsString()
  invoiceId: string;

  @IsDateString()
  scheduledFor: string; // ISO date

  @IsOptional()
  @IsEnum(RecurrenceType)
  recurrence?: RecurrenceType;

  @IsObject()
  reminderData: {
    invoiceFolio: string;
    dueDate: string;
    amount: number;
    currency: string;
    daysOverdue: number;
    clientName: string;
  };
}