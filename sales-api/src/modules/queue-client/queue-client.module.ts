import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { QueueClientService } from './queue-client.service';

enum QueueName {
  EMAIL = 'email-queue',
  PDF_GENERATION = 'pdf-generation-queue',
  XML_PROCESSING = 'xml-processing-queue',
  CFDI_TIMBRADO = 'cfdi-timbrado-queue',
  NOTIFICATION = 'notification-queue',
  REPORT_GENERATION = 'report-generation-queue',
  INVENTORY_UPDATE = 'inventory-update-queue',
  ACCOUNTING = 'accounting-queue'
}

const RedisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
  enableReadyCheck: false
};

@Global()
@Module({
  imports: [
    BullModule.forRoot({
      redis: RedisConfig,
      defaultJobOptions: {
        removeOnComplete: true,
        attempts: 3
      }
    }),
    BullModule.registerQueue(
      { name: QueueName.EMAIL },
      { name: QueueName.PDF_GENERATION },
      { name: QueueName.XML_PROCESSING },
      { name: QueueName.CFDI_TIMBRADO },
      { name: QueueName.NOTIFICATION },
      { name: QueueName.REPORT_GENERATION },
      { name: QueueName.INVENTORY_UPDATE },
      { name: QueueName.ACCOUNTING }
    )
  ],
  providers: [QueueClientService],
  exports: [QueueClientService, BullModule]
})
export class QueueClientModule {}