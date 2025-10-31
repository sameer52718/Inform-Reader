import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Worker } from 'bullmq';
import Name from '../models/Name.js';
import logger from '../logger.js';
import { redisOptions } from '../queue/connection.js';

dotenv.config();

const MONGODB_URI = process.env.MONGO_DB_URL;

// 🧩 MongoDB Connection
await mongoose.connect(MONGODB_URI);
logger.info('✅ MongoDB connected for Lucky Name Worker');

// 🧠 Helper: Sleep
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

// 🧮 Calculate lucky number (A=1 ... Z=26 → reduced to single digit)
function getLuckyNumber(name) {
  const letters = name.toUpperCase().replace(/[^A-Z]/g, '');
  let sum = 0;
  for (const ch of letters) sum += ch.charCodeAt(0) - 64;
  while (sum > 9)
    sum = sum
      .toString()
      .split('')
      .reduce((a, b) => a + Number(b), 0);
  return sum;
}

// 🎨 Map number → color & stone
function getLuckyColorAndStone(num) {
  const map = {
    1: { color: 'Red', stone: 'Ruby' },
    2: { color: 'Orange', stone: 'Pearl' },
    3: { color: 'Yellow', stone: 'Topaz' },
    4: { color: 'Green', stone: 'Emerald' },
    5: { color: 'Blue', stone: 'Sapphire' },
    6: { color: 'Indigo', stone: 'Diamond' },
    7: { color: 'Violet', stone: 'Amethyst' },
    8: { color: 'Gold', stone: 'Onyx' },
    9: { color: 'Silver', stone: 'Opal' },
  };
  return map[num] || { color: 'White', stone: 'Crystal' };
}

// 🧩 BullMQ Worker
const worker = new Worker(
  'generateLuckyName',
  async (job) => {
    const { nameId, name } = job.data;

    if (!nameId || !name) {
      logger.warn('⚠️ Missing nameId or name in job data');
      return;
    }

    try {
      logger.info(`🔮 Processing lucky name for: ${name}`);

      const luckyNumber = getLuckyNumber(name);
      const { color, stone } = getLuckyColorAndStone(luckyNumber);

      await Name.findByIdAndUpdate(
        nameId,
        {
          luckyNumber,
          luckyColor: color,
          luckyStone: stone,
          luckyGeneratedAt: new Date(),
        },
        { new: true },
      );

      logger.info(`✅ Lucky generated: ${name} → #${luckyNumber} (${color}, ${stone})`);

      await sleep(1000);
      return { success: true, name, luckyNumber, color, stone };
    } catch (err) {
      logger.error(`❌ Error in lucky name job (${nameId}): ${err.message}`);
      throw err;
    }
  },
  {
    connection: redisOptions,
    concurrency: 2, // 2 jobs at a time
  },
);

// 🧩 Worker Events
worker.on('completed', (job) => {
  logger.info(`🎯 Job completed: ${job.id}`);
});

worker.on('failed', (job, err) => {
  logger.error(`🚨 Job failed (${job.id}): ${err.message}`);
});

// 🧘 Graceful Shutdown
process.on('SIGINT', async () => {
  await worker.close();
  await mongoose.disconnect();
  logger.info('🔌 MongoDB disconnected (Lucky Name Worker stopped)');
  process.exit(0);
});
