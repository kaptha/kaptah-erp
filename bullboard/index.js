
const express = require('express');
const { createBullBoard } = require('@bull-board/api');
const { BullAdapter } = require('@bull-board/api/bullAdapter');
const { ExpressAdapter } = require('@bull-board/express');
const Queue = require('bull');

const app = express();
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/');

// Configurar Redis
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
};

// Crear instancias de las colas
const emailQueue = new Queue('email-queue', { redis: redisConfig });
const pdfQueue = new Queue('pdf-generation-queue', { redis: redisConfig });
const xmlQueue = new Queue('xml-processing-queue', { redis: redisConfig });
const timbradoQueue = new Queue('cfdi-timbrado-queue', { redis: redisConfig });
const notificationQueue = new Queue('notification-queue', { redis: redisConfig });
const reportQueue = new Queue('report-generation-queue', { redis: redisConfig });
const inventoryQueue = new Queue('inventory-update-queue', { redis: redisConfig });
const accountingQueue = new Queue('accounting-queue', { redis: redisConfig });

// Crear dashboard
createBullBoard({
  queues: [
    new BullAdapter(emailQueue),
    new BullAdapter(pdfQueue),
    new BullAdapter(xmlQueue),
    new BullAdapter(timbradoQueue),
    new BullAdapter(notificationQueue),
    new BullAdapter(reportQueue),
    new BullAdapter(inventoryQueue),
    new BullAdapter(accountingQueue),
  ],
  serverAdapter,
});

app.use('/', serverAdapter.getRouter());

const PORT = process.env.PORT || 3100;
app.listen(PORT, () => {
  console.log(`🎯 Bull Board corriendo en http://localhost:${PORT}`);
  console.log(`📊 Dashboard disponible`);
});