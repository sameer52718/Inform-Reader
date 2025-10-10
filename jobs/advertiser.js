import axios from 'axios';
import { parseStringPromise } from 'xml2js';
import Advertisement from '../models/Advertisement.js';
import logger from '../logger.js';

export const runAdvertiserSync = async () => {
  try {
    // --- Step 1: Validate environment variables ---
    const { CJ_TOKEN, CJ_CID } = process.env;
    if (!CJ_TOKEN || !CJ_CID) {
      throw new Error('Missing required environment variables: CJ_TOKEN or CJ_CID');
    }

    const headers = {
      Authorization: `Bearer ${CJ_TOKEN}`,
      Accept: 'application/xml',
    };

    // --- Step 2: Call Advertiser Lookup API ---
    const url = `https://advertiser-lookup.api.cj.com/v2/advertiser-lookup?requestor-cid=${CJ_CID}&advertiser-ids=joined`;
    logger.info('[Advertiser] Fetching advertisers from CJ API');
    const response = await axios.get(url, { headers });

    // --- Step 3: Parse XML response ---
    const parsedData = await parseStringPromise(response.data);
    const advertisers = parsedData['cj-api'].advertisers[0].advertiser || [];

    logger.info(`[Advertiser] Found ${advertisers.length} advertisers`);

    // --- Step 4: Map and store advertisers ---
    const storedAdvertisers = [];
    for (const adv of advertisers) {
      try {
        const advertiserData = {
          advertiserId: adv['advertiser-id'][0],
          advertiserName: adv['advertiser-name'][0],
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
            name: action.name[0],
            type: action.type[0],
            id: action.id[0],
            commission: {
              default: action.commission[0].default?.[0] || '0.00%',
              itemlist: action.commission[0].itemlist?.map((item) => ({
                value: item._ || '0.00',
                name: item.$?.name || '',
                id: item.$?.id || '',
              })) || [],
            },
          })) || [],
          linkTypes: adv['link-types']?.[0]?.['link-type'] || [],
        };

        // --- Step 5: Store/Update in MongoDB (no duplicates) ---
        const updatedAdvertiser = await Advertisement.findOneAndUpdate(
          { advertiserId: advertiserData.advertiserId },
          advertiserData,
          { upsert: true, new: true, runValidators: true }
        );
        storedAdvertisers.push(updatedAdvertiser);

        logger.info(`[Advertiser] Stored/Updated: ${advertiserData.advertiserName}`);

        // Delay to respect CJ API rate limit (25 calls/minute)
        await new Promise((resolve) => setTimeout(resolve, 2500));
      } catch (err) {
        logger.warn(`[Advertiser] Skipping advertiser ${adv['advertiser-id']?.[0] || 'unknown'}: ${err.message}`);
      }
    }

    logger.info(`[Advertiser] Successfully stored ${storedAdvertisers.length} advertisers`);

    // --- Step 6: Return result ---
    return {
      success: true,
      message: 'Advertisers stored successfully',
      count: storedAdvertisers.length,
    };
  } catch (error) {
    logger.error('[Advertiser] Failed to fetch advertisers:', { error: error.message });
    throw error;
  }
};