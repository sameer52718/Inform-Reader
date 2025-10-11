import axios from 'axios';
import qs from 'qs';
import cron from 'node-cron';
import { XMLParser } from 'fast-xml-parser';
import Merchant from '../models/Merchant.js';
import dotenv from 'dotenv';
import { RateLimiter } from 'limiter';
import logger from '../logger.js';

// Load environment variables
dotenv.config();

// Configure rate limiter (100 requests per minute)
const rateLimiter = new RateLimiter({ tokensPerInterval: 100, interval: 'minute' });

// API Client with error handling
class LinkSynergyAPI {
  constructor() {
    this.baseURL = 'https://api.linksynergy.com';
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
    });
  }

  async getAccessToken(jobId) {
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

      const accessToken = response?.data?.access_token;
      if (!accessToken) {
        logger.error(`[Merchant][Job:${jobId}] Failed to get access token: No token in response`);
        return null;
      }
      return accessToken;
    } catch (error) {
      logger.error(`[Merchant][Job:${jobId}] Failed to get access token`, {
        error: error.message,
        stack: error.stack,
      });
      return null;
    }
  }

  async fetchMerchantList(accessToken, jobId) {
    try {
      const remainingTokens = await rateLimiter.getTokensRemaining();
      if (remainingTokens < 1) {
        logger.warn(`[Merchant][Job:${jobId}] Rate limiter: No tokens available`);
        return null;
      }
      await rateLimiter.removeTokens(1);

      const response = await this.client.get('/advertisersearch/1.0', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      });

      const parser = new XMLParser();
      const parsed = parser.parse(response.data);
      const merchants = Array.isArray(parsed?.result?.midlist?.merchant) ? parsed.result.midlist.merchant : [parsed?.result?.midlist?.merchant].filter(Boolean);

      if (!merchants.length) {
        logger.warn(`[Merchant][Job:${jobId}] No merchants found in API response`);
      }
      return merchants;
    } catch (error) {
      logger.error(`[Merchant][Job:${jobId}] Failed to fetch merchant list`, {
        error: error.message,
        stack: error.stack,
      });
      return null;
    }
  }

  async fetchMerchantDetails(advertiserId, accessToken, jobId) {
    try {
      const remainingTokens = await rateLimiter.getTokensRemaining();
      if (remainingTokens < 1) {
        logger.warn(`[Merchant][Job:${jobId}] Rate limiter: No tokens available for merchant ${advertiserId}`);
        return null;
      }
      await rateLimiter.removeTokens(1);

      const response = await this.client.get(`/v2/advertisers/${advertiserId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      });
      return response.data?.advertiser || null;
    } catch (error) {
      logger.error(`[Merchant][Job:${jobId}] Failed to fetch details for merchant ${advertiserId}`, {
        error: error.message,
        stack: error.stack,
      });
      return null;
    }
  }
}

// Merchant Service
class MerchantService {
  static async updateMerchantList(merchants, jobId) {
    try {
      const bulkOps = merchants.map((ad) => ({
        updateOne: {
          filter: { advertiserId: ad.mid },
          update: {
            $set: {
              advertiserId: ad.mid,
              name: ad.merchantname || 'Unknown',
              detailsFetched: false,
            },
          },
          upsert: true,
        },
      }));

      const result = await Merchant.bulkWrite(bulkOps, { ordered: false });
      logger.info(`[Merchant][Job:${jobId}] Stored ${merchants.length} merchants in DB`, {
        modified: result.modifiedCount,
        upserted: result.upsertedCount,
      });
      return merchants.length;
    } catch (error) {
      logger.error(`[Merchant][Job:${jobId}] Error updating merchant list`, {
        error: error.message,
        stack: error.stack,
      });
      return 0;
    }
  }

  static async updateMerchantDetails(merchant, info, jobId) {
    try {
      await Merchant.findByIdAndUpdate(merchant._id, {
        $set: {
          ...info,
          detailsFetched: true,
        },
      });
      logger.info(`[Merchant][Job:${jobId}] Updated merchant: ${info.name || 'Unknown'}`, {
        advertiserId: merchant.advertiserId,
      });
      return true;
    } catch (error) {
      logger.error(`[Merchant][Job:${jobId}] Failed to update merchant ${merchant.advertiserId}`, {
        error: error.message,
        stack: error.stack,
      });
      return false;
    }
  }
}

// Export the runSyncJob function
export const runSyncJob = async () => {
  const jobId = Date.now().toString(); // Unique job ID for logging
  logger.info(`[Merchant][Job:${jobId}] Starting Merchant Sync Job`);

  // Validate environment variables
  const { RAKUTEN_BEARER_TOKEN } = process.env;
  if (!RAKUTEN_BEARER_TOKEN) {
    logger.error(`[Merchant][Job:${jobId}] Missing required environment variable: RAKUTEN_BEARER_TOKEN`);
    return {
      success: false,
      message: 'Missing required environment variable: RAKUTEN_BEARER_TOKEN',
      merchantsProcessed: 0,
      detailsFetched: 0,
    };
  }

  let merchantsProcessed = 0;
  let detailsFetched = 0;
  let mongoConnected = false;

  const api = new LinkSynergyAPI();

  try {
    // Get access token
    const accessToken = await api.getAccessToken(jobId);
    if (!accessToken) {
      return {
        success: false,
        message: 'Failed to get access token from Rakuten API',
        merchantsProcessed: 0,
        detailsFetched: 0,
      };
    }

    // Fetch merchant list
    const merchants = await api.fetchMerchantList(accessToken, jobId);
    if (!merchants) {
      return {
        success: false,
        message: 'Failed to fetch merchant list from API',
        merchantsProcessed: 0,
        detailsFetched: 0,
      };
    }

    // Update merchant list
    merchantsProcessed = await MerchantService.updateMerchantList(merchants, jobId);
    logger.info(`[Merchant][Job:${jobId}] Starting merchant details fetch (1 per minute)`);

    // Process merchant details with rate limiting
    let stillPending = true;
    while (stillPending) {
      try {
        const merchant = await Merchant.findOne({ detailsFetched: false });
        if (!merchant) {
          logger.info(`[Merchant][Job:${jobId}] All merchants processed`);
          stillPending = false;
          break;
        }

        const info = await api.fetchMerchantDetails(merchant.advertiserId, accessToken, jobId);
        if (info) {
          const updated = await MerchantService.updateMerchantDetails(merchant, info, jobId);
          if (updated) detailsFetched++;
        }
      } catch (error) {
        logger.error(`[Merchant][Job:${jobId}] Error processing merchant details`, {
          error: error.message,
          stack: error.stack,
        });
      }

      // Wait 1 minute to respect rate limit
      await new Promise((resolve) => setTimeout(resolve, 60 * 1000));
    }

    // Return result
    return {
      success: true,
      message: `Successfully processed ${merchantsProcessed} merchants and fetched details for ${detailsFetched}`,
      merchantsProcessed,
      detailsFetched,
    };
  } catch (error) {
    logger.error(`[Merchant][Job:${jobId}] Unexpected error during merchant sync`, {
      error: error.message,
      stack: error.stack,
    });
    return {
      success: false,
      message: 'Unexpected error during merchant sync',
      merchantsProcessed,
      detailsFetched,
    };
  } finally {
    if (mongoConnected) {
      try {
        logger.info(`[Merchant][Job:${jobId}] MongoDB connection closed`);
      } catch (closeError) {
        logger.error(`[Merchant][Job:${jobId}] Failed to close MongoDB connection`, {
          error: closeError.message,
          stack: closeError.stack,
        });
      }
    }
  }
};

// Export the cron job setup
export const startCronJob = () => {
  let isSyncRunning = false;

  cron.schedule('0 0 * * *', async () => {
    const jobId = Date.now().toString(); // Unique job ID for logging
    if (isSyncRunning) {
      logger.warn(`[Cron][Job:${jobId}] Previous merchant sync job still running, skipping`);
      return;
    }

    isSyncRunning = true;
    try {
      logger.info(`[Cron][Job:${jobId}] Starting merchant sync job at ${new Date().toISOString()}`);
      const result = await runSyncJob();
      logger.info(`[Cron][Job:${jobId}] Merchant sync job completed`, {
        success: result.success,
        message: result.message,
        merchantsProcessed: result.merchantsProcessed,
        detailsFetched: result.detailsFetched,
      });
    } catch (error) {
      logger.error(`[Cron][Job:${jobId}] Unexpected error in merchant sync job`, {
        error: error.message,
        stack: error.stack,
      });
    } finally {
      isSyncRunning = false;
    }
  });
};

// Handle unhandled promise rejections to prevent crashes
process.on('unhandledRejection', (error) => {
  logger.error('[Cron] Unhandled promise rejection', {
    error: error.message,
    stack: error.stack,
  });
});

// Handle process termination
process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM. Closing MongoDB connection');
  try {
    logger.info('MongoDB connection closed');
  } catch (closeError) {
    logger.error('Failed to close MongoDB connection on SIGTERM', {
      error: closeError.message,
      stack: closeError.stack,
    });
  }
  process.exit(0);
});
