import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { queues } from '../queue/bullBoard.js'; // import your BullMQ queues
import PostalCode from '../models/PostalCode.js';
import logger from '../logger.js';

dotenv.config();

const MONGODB_URI = process.env.MONGO_DB_URL;

await mongoose.connect(MONGODB_URI);
logger.info('✅ Connected to MongoDB (Producer)');

async function enqueuePostalCodeJobs() {
  try {
    // Fetch postal codes that need content
    const postalCodes = await PostalCode.find({ isDeleted: false, status: true }).lean();

    if (!postalCodes.length) {
      logger.warn('⚠️ No postal codes found to process');
      return;
    }

    logger.info(`📦 Found ${postalCodes.length} postal codes`);
    let count = 0;

    for (const postal of postalCodes) {
      const jobData = {
        postalId: postal._id,
        countryCode: "pk" ,
        language: 'en', 
      };

      // 🧠 Add job to queue
      await queues.generatePostalCode.add('generate', jobData);

      count++;
      if (count % 50 === 0) {
        logger.info(`🌀 Enqueued ${count} jobs so far...`);
      }
    }

    logger.info(`🎯 Successfully enqueued ${count} postal code jobs`);
  } catch (err) {
    logger.error(`❌ Error enqueuing jobs: ${err.message}`);
  } finally {
    await mongoose.disconnect();
    logger.info('🔌 MongoDB disconnected (Producer finished)');
    process.exit(0);
  }
}

// Run it
enqueuePostalCodeJobs();
