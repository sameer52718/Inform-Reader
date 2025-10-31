import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { Queue } from 'bullmq';
import { redisOptions } from './connection.js';

// Define your queues here
export const queues = {
  generatePostalCode: new Queue('generatePostalCode', { connection: redisOptions }),
  generateBankCode: new Queue('generateBankCode', { connection: redisOptions }),
  generateLuckyName: new Queue('generateLuckyName', { connection: redisOptions }),
};
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: Object.values(queues).map((q) => new BullMQAdapter(q)),
  serverAdapter,
});

export const bullBoardRouter = serverAdapter.getRouter();
