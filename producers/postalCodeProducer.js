import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { queues } from '../queue/bullBoard.js';
import PostalCode from '../models/PostalCode.js';
import ContentMeta from '../models/ContentMeta.js';
import logger from '../logger.js';

dotenv.config();

const MONGODB_URI = process.env.MONGO_DB_URL;

await mongoose.connect(MONGODB_URI);
logger.info('✅ Connected to MongoDB (Producer)');

async function enqueuePostalCodeJobs() {
  try {
    // 1️⃣ Fetch all active postal codes
    const postalCodes = await PostalCode.find({ isDeleted: false, status: true }).select('_id').lean();

    if (!postalCodes.length) {
      logger.warn('⚠️ No postal codes found to process');
      return;
    }

    // 2️⃣ Get all postal codes that already have generated content
    const existingContent = await ContentMeta.find({
      refModel: 'PostalCode',
      language: 'en',
      countryCode: 'pk',
    })
      .select('refId')
      .lean();

    const existingIds = new Set(existingContent.map((c) => c.refId.toString()));

    // 3️⃣ Filter out postal codes that already have content
    const postalCodesToProcess = postalCodes.filter((p) => !existingIds.has(p._id.toString()));

    if (!postalCodesToProcess.length) {
      logger.info('🎉 All postal codes already have content generated.');
      return;
    }

    logger.info(`📦 Found ${postalCodesToProcess.length} postal codes needing content`);

    let count = 0;

    // 4️⃣ Enqueue each postal code as a job
    for (const postal of postalCodesToProcess) {
      const jobData = {
        postalId: postal._id,
        countryCode: 'pk',
        language: 'en',
      };

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
