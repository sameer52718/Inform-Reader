import axios from 'axios';
import { parseStringPromise } from 'xml2js';
import Advertisement from '../models/Advertisement.js';
import logger from '../logger.js';

export const runAdvertiserSync = async () => {
  const jobId = Date.now().toString(); // Unique job ID for logging
  logger.info(`[Advertiser][Job:${jobId}] Starting advertiser sync`);

  try {
    // --- Step 1: Validate environment variables ---
    const { CJ_TOKEN, CJ_CID } = process.env;
    if (!CJ_TOKEN || !CJ_CID) {
      logger.error(`[Advertiser][Job:${jobId}] Missing required environment variables: CJ_TOKEN or CJ_CID`);
      return {
        success: false,
        message: 'Missing required environment variables: CJ_TOKEN or CJ_CID',
        count: 0,
      };
    }

    const headers = {
      Authorization: `Bearer ${CJ_TOKEN}`,
      Accept: 'application/xml',
    };

    // --- Step 2: Call Advertiser Lookup API ---
    const url = `https://advertiser-lookup.api.cj.com/v2/advertiser-lookup?requestor-cid=${CJ_CID}&advertiser-ids=joined`;
    logger.info(`[Advertiser][Job:${jobId}] Fetching advertisers from CJ API`);
    let response;
    try {
      response = await axios.get(url, { headers });
    } catch (apiError) {
      logger.error(`[Advertiser][Job:${jobId}] Failed to fetch advertisers from CJ API`, {
        error: apiError.message,
        stack: apiError.stack,
      });
      return {
        success: false,
        message: 'Failed to fetch advertisers from CJ API',
        count: 0,
      };
    }

    // --- Step 3: Parse XML response ---
    let parsedData;
    try {
      parsedData = await parseStringPromise(response.data);
    } catch (parseError) {
      logger.error(`[Advertiser][Job:${jobId}] Failed to parse XML response`, {
        error: parseError.message,
        stack: parseError.stack,
      });
      return {
        success: false,
        message: 'Failed to parse XML response from CJ API',
        count: 0,
      };
    }

    // Check if advertisers exist in response
    const advertisers = parsedData['cj-api']?.advertisers?.[0]?.advertiser || [];
    if (!advertisers.length) {
      logger.warn(`[Advertiser][Job:${jobId}] No advertisers found in API response`);
      return {
        success: true,
        message: 'No advertisers to process',
        count: 0,
      };
    }

    logger.info(`[Advertiser][Job:${jobId}] Found ${advertisers.length} advertisers`);

    // --- Step 4: Prepare bulk operations for MongoDB ---
    const bulkOps = [];
    for (const adv of advertisers) {
      try {
        const advertiserId = adv['advertiser-id']?.[0] || 'unknown';
        const advertiserName = adv['advertiser-name']?.[0] || 'Unknown';

        const advertiserData = {
          advertiserId,
          advertiserName,
          programName: adv['program-name']?.[0] || '',
          programUrl: adv['program-url']?.[0] || '',
          accountStatus: adv['account-status']?.[0] || '',
          sevenDayEpc: adv['seven-day-epc']?.[0] || '0.00',
          threeMonthEpc: adv['three-month-epc']?.[0] || '0.00',
          language: adv.language?.[0] || '',
          relationshipStatus: adv['relationship-status']?.[0] || '',
          mobileTrackingCertified: adv['mobile-tracking-certified']?.[0] === 'true',
          cookielessTrackingEnabled: adv['cookieless-tracking-enabled']?.[0] === 'true',
          networkRank: adv['network-rank']?.[0] || '0',
          primaryCategory: {
            parent: adv['primary-category']?.[0]?.parent?.[0] || 'Unknown',
            child: adv['primary-category']?.[0]?.child?.[0] || 'Unknown',
          },
          performanceIncentives: adv['performance-incentives']?.[0] === 'true',
          actions: adv.actions?.[0]?.action?.map((action) => ({
            name: action.name?.[0] || '',
            type: action.type?.[0] || '',
            id: action.id?.[0] || '',
            commission: {
              default: action.commission?.[0]?.default?.[0] || '0.00%',
              itemlist: action.commission?.[0]?.itemlist?.map((item) => ({
                value: item._ || '0.00',
                name: item.$?.name || '',
                id: item.$?.id || '',
              })) || [],
            },
          })) || [],
          linkTypes: adv['link-types']?.[0]?.['link-type'] || [],
        };

        bulkOps.push({
          updateOne: {
            filter: { advertiserId },
            update: { $set: advertiserData },
            upsert: true,
          },
        });

        logger.info(`[Advertiser][Job:${jobId}] Prepared update for advertiser: ${advertiserName} (${advertiserId})`);
      } catch (mappingError) {
        logger.warn(`[Advertiser][Job:${jobId}] Failed to process advertiser ${adv['advertiser-id']?.[0] || 'unknown'}`, {
          error: mappingError.message,
          stack: mappingError.stack,
        });
      }
    }

    // --- Step 5: Execute bulk write to MongoDB ---
    let storedAdvertisersCount = 0;
    if (bulkOps.length > 0) {
      try {
        const result = await Advertisement.bulkWrite(bulkOps, { ordered: false });
        storedAdvertisersCount = result.upsertedCount + result.modifiedCount;
        logger.info(`[Advertiser][Job:${jobId}] Successfully stored/updated ${storedAdvertisersCount} advertisers`);
      } catch (dbError) {
        logger.error(`[Advertiser][Job:${jobId}] Failed to store advertisers in MongoDB`, {
          error: dbError.message,
          stack: dbError.stack,
        });
        return {
          success: false,
          message: 'Failed to store advertisers in MongoDB',
          count: 0,
        };
      }
    } else {
      logger.warn(`[Advertiser][Job:${jobId}] No valid advertisers to store in MongoDB`);
    }

    // --- Step 6: Return result ---
    return {
      success: true,
      message: 'Advertisers processed successfully',
      count: storedAdvertisersCount,
    };
  } catch (error) {
    logger.error(`[Advertiser][Job:${jobId}] Unexpected error during advertiser sync`, {
      error: error.message,
      stack: error.stack,
    });
    return {
      success: false,
      message: 'Unexpected error during advertiser sync',
      count: 0,
    };
  }
};