export enum QueueName {
  EMAIL = 'email-queue',
  PDF_GENERATION = 'pdf-generation-queue',
  XML_PROCESSING = 'xml-processing-queue',
  CFDI_TIMBRADO = 'cfdi-timbrado-queue',
  NOTIFICATION = 'notification-queue',
  REPORT_GENERATION = 'report-generation-queue',
  INVENTORY_UPDATE = 'inventory-update-queue',
  ACCOUNTING = 'accounting-queue'
}

export const QueueConfig = {
  // Cola 1: EMAILS - Prioridad Media
  [QueueName.EMAIL]: {
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      },
      removeOnComplete: 100, // Mantener últimos 100
      removeOnFail: 500       // Mantener últimos 500 fallos
    },
    limiter: {
      max: 50,        // 50 emails
      duration: 1000  // por segundo
    }
  },

  // Cola 2: PDF GENERATION - Prioridad Baja
  [QueueName.PDF_GENERATION]: {
    defaultJobOptions: {
      attempts: 2,
      backoff: {
        type: 'fixed',
        delay: 5000
      },
      removeOnComplete: 50,
      removeOnFail: 200,
      priority: 5 // Menor prioridad
    },
    limiter: {
      max: 20,        // 20 PDFs
      duration: 1000  // por segundo
    }
  },

  // Cola 3: XML PROCESSING - Prioridad Alta (CRÍTICA)
  [QueueName.XML_PROCESSING]: {
    defaultJobOptions: {
      attempts: 1, // No reintentar, mejor loggear y seguir
      timeout: 30000, // 30 segundos máximo
      removeOnComplete: true, // Limpiar inmediatamente
      removeOnFail: 1000,
      priority: 1 // Máxima prioridad
    },
    limiter: {
      max: 100,       // 100 XMLs
      duration: 1000  // por segundo
    }
  },

  // Cola 4: CFDI TIMBRADO - Prioridad Alta
  [QueueName.CFDI_TIMBRADO]: {
    defaultJobOptions: {
      attempts: 5, // Reintentar si PAC falla
      backoff: {
        type: 'exponential',
        delay: 3000
      },
      removeOnComplete: 100,
      removeOnFail: 500,
      priority: 2
    },
    limiter: {
      max: 10,        // 10 timbrados
      duration: 1000  // por segundo (límite PAC)
    }
  },

  // Cola 5: NOTIFICATIONS (WebSocket, Push) - Prioridad Media-Alta
  [QueueName.NOTIFICATION]: {
    defaultJobOptions: {
      attempts: 2,
      backoff: {
        type: 'fixed',
        delay: 1000
      },
      removeOnComplete: 50,
      removeOnFail: 100,
      priority: 3
    }
  },

  // Cola 6: REPORT GENERATION - Prioridad Baja
  [QueueName.REPORT_GENERATION]: {
    defaultJobOptions: {
      attempts: 2,
      timeout: 60000, // 1 minuto
      removeOnComplete: 20,
      removeOnFail: 50,
      priority: 10 // Muy baja prioridad
    }
  },

  // Cola 7: INVENTORY UPDATE - Prioridad Media
  [QueueName.INVENTORY_UPDATE]: {
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000
      },
      removeOnComplete: 200,
      removeOnFail: 300,
      priority: 4
    }
  },

  // Cola 8: ACCOUNTING (CxC, CxP) - Prioridad Media
  [QueueName.ACCOUNTING]: {
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'fixed',
        delay: 2000
      },
      removeOnComplete: 500,
      removeOnFail: 500,
      priority: 4
    }
  }
};

export const RedisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null, // Importante para BullMQ
  enableReadyCheck: false
};