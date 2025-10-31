import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { queues } from '../queue/bullBoard.js';
import Name from '../models/Name.js';
import logger from '../logger.js';

dotenv.config();

const MONGODB_URI = process.env.MONGO_DB_URL;

await mongoose.connect(MONGODB_URI);
logger.info('✅ Connected to MongoDB (Lucky Name Producer)');

async function enqueueLuckyNameJobs() {
  try {
    // 1️⃣ Fetch all active names which don't have lucky number yet
    const names = await Name.find({
      isDeleted: false,
      status: true,
      $or: [{ luckyNumber: { $exists: false } }, { luckyNumber: null }],
    })
      .select('_id name')
      .lean();

    if (!names.length) {
      logger.warn('⚠️ No names found that need lucky data generation');
      return;
    }

    logger.info(`📦 Found ${names.length} names needing lucky data`);

    let count = 0;

    // 2️⃣ Enqueue each name as a job
    for (const n of names) {
      const jobData = {
        nameId: n._id,
        name: n.name,
      };

      await queues.generateLuckyName.add('generate', jobData);
      count++;

      if (count % 50 === 0) {
        logger.info(`🌀 Enqueued ${count} jobs so far...`);
      }
    }

    logger.info(`🎯 Successfully enqueued ${count} lucky name jobs`);
  } catch (err) {
    logger.error(`❌ Error enqueuing lucky name jobs: ${err.message}`);
  } finally {
    await mongoose.disconnect();
    logger.info('🔌 MongoDB disconnected (Lucky Name Producer finished)');
    process.exit(0);
  }
}

// Run it
enqueueLuckyNameJobs();
