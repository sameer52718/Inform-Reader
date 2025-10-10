import axios from 'axios';
import qs from 'qs';
import mongoose from 'mongoose';
import cron from 'node-cron';
import { XMLParser } from 'fast-xml-parser';
import Merchant from '../models/Merchant.js';
import dotenv from 'dotenv';
import { RateLimiter } from 'limiter';
import winston from 'winston';

// Load environment variables
dotenv.config();

// Validate environment variables
const requiredEnvVars = ['MONGO_DB_URL', 'RAKUTEN_BEARER_TOKEN'];
requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    throw new Error(`Missing required environment variable: ${varName}`);
  }
});

// Configure logging
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'merchant-sync.log' })
  ]
});

// Configure rate limiter (100 requests per minute)
const rateLimiter = new RateLimiter({ tokensPerInterval: 100, interval: 'minute' });

// MongoDB connection with optimized settings
const connectToMongoDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_DB_URL, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    logger.info('MongoDB Connected');
  } catch (error) {
    logger.error('MongoDB Connection Error:', { error: error.message });
    throw error;
  }
};

// API Client with error handling
class LinkSynergyAPI {
  constructor() {
    this.baseURL = 'https://api.linksynergy.com';
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
    });
  }

  async getAccessToken() {
    try {
      const data = qs.stringify({
        grant_type: 'password',
        scope: '4571385',
      });

      const response = await this.client.post('/token', data, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${process.env.RAKUTEN_BEARER_TOKEN}`,
        },
      });

      return response.data.access_token;
    } catch (error) {
      throw new Error(`Failed to get access token: ${error.message}`);
    }
  }

  async fetchMerchantList(accessToken) {
    await rateLimiter.removeTokens(1);
    try {
      const response = await this.client.get('/advertisersearch/1.0', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      });

      const parser = new XMLParser();
      const parsed = parser.parse(response.data);
      const merchants = Array.isArray(parsed?.result?.midlist?.merchant)
        ? parsed.result.midlist.merchant
        : [parsed?.result?.midlist?.merchant].filter(Boolean);

      return merchants;
    } catch (error) {
      throw new Error(`Failed to fetch merchant list: ${error.message}`);
    }
  }

  async fetchMerchantDetails(advertiserId, accessToken) {
    await rateLimiter.removeTokens(1);
    try {
      const response = await this.client.get(`/v2/advertisers/${advertiserId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      });
      return response.data?.advertiser;
    } catch (error) {
      throw new Error(`Failed to fetch details for merchant ${advertiserId}: ${error.message}`);
    }
  }
}

// Merchant Service
class MerchantService {
  static async updateMerchantList(merchants) {
    try {
      const bulkOps = merchants.map(ad => ({
        updateOne: {
          filter: { advertiserId: ad.mid },
          update: {
            $set: {
              advertiserId: ad.mid,
              name: ad.merchantname,
              detailsFetched: false,
            },
          },
          upsert: true,
        },
      }));

      const result = await Merchant.bulkWrite(bulkOps);
      logger.info(`Stored ${merchants.length} merchants in DB`, { modified: result.modifiedCount, upserted: result.upsertedCount });
      return merchants.length;
    } catch (error) {
      logger.error('Error updating merchant list:', { error: error.message });
      throw error;
    }
  }

  static async updateMerchantDetails(merchant, info) {
    try {
      await Merchant.findByIdAndUpdate(merchant._id, {
        $set: {
          ...info,
          detailsFetched: true,
        },
      });
      logger.info(`Updated merchant: ${info.name}`, { advertiserId: merchant.advertiserId });
    } catch (error) {
      logger.error(`Failed to update merchant ${merchant.advertiserId}:`, { error: error.message });
      throw error;
    }
  }
}

// Export the runSyncJob function
export const runSyncJob = async () => {
  logger.info('Starting Merchant Sync Job');
  const api = new LinkSynergyAPI();

  try {
    await connectToMongoDB();
    const accessToken = await api.getAccessToken();
    const merchants = await api.fetchMerchantList(accessToken);
    await MerchantService.updateMerchantList(merchants);

    logger.info('Starting merchant details fetch (1 per minute)');

    const processNextMerchant = async () => {
      const merchant = await Merchant.findOne({ detailsFetched: false });
      if (!merchant) {
        logger.info('All merchants processed');
        return false;
      }

      try {
        const info = await api.fetchMerchantDetails(merchant.advertiserId, accessToken);
        if (info) {
          await MerchantService.updateMerchantDetails(merchant, info);
        }
      } catch (error) {
        logger.error(`Error processing merchant ${merchant.advertiserId}:`, { error: error.message });
      }
      return true;
    };

    // Process merchants with rate limiting
    const interval = setInterval(async () => {
      const stillPending = await processNextMerchant();
      if (!stillPending) {
        clearInterval(interval);
        logger.info('All merchant details stored successfully');
        await mongoose.connection.close();
        logger.info('MongoDB connection closed');
      }
    }, 60 * 1000);

  } catch (error) {
    logger.error('Sync Job Error:', { error: error.message });
    await mongoose.connection.close();
    throw error;
  }
};

// Optionally export the cron job setup
// export const startCronJob = () => {
//   cron.schedule('0 0 * * *', async () => {
//     try {
//       await runSyncJob();
//     } catch (error) {
//       logger.error('Cron Job Error:', { error: error.message });
//     }
//   });
// };

// Handle process termination
process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM. Closing MongoDB connection');
  await mongoose.connection.close();
  process.exit(0);
});