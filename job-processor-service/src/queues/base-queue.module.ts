import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { QueueName, QueueConfig, RedisConfig } from '../config/queue.config';

@Global()
@Module({
  imports: [
    // Registrar todas las colas
    BullModule.forRoot({
      redis: RedisConfig,
      defaultJobOptions: {
        removeOnComplete: true,
        attempts: 3
      }
    }),
    BullModule.registerQueue(
      { name: QueueName.EMAIL, ...QueueConfig[QueueName.EMAIL] },
      { name: QueueName.PDF_GENERATION, ...QueueConfig[QueueName.PDF_GENERATION] },
      { name: QueueName.XML_PROCESSING, ...QueueConfig[QueueName.XML_PROCESSING] },
      { name: QueueName.CFDI_TIMBRADO, ...QueueConfig[QueueName.CFDI_TIMBRADO] },
      { name: QueueName.NOTIFICATION, ...QueueConfig[QueueName.NOTIFICATION] },
      { name: QueueName.REPORT_GENERATION, ...QueueConfig[QueueName.REPORT_GENERATION] },
      { name: QueueName.INVENTORY_UPDATE, ...QueueConfig[QueueName.INVENTORY_UPDATE] },
      { name: QueueName.ACCOUNTING, ...QueueConfig[QueueName.ACCOUNTING] }
    )
  ],
  exports: [BullModule]
})
export class BaseQueueModule {}