import axios from 'axios';
import qs from 'qs';
import Offer from '../models/Offer.js';
import logger from '../logger.js';

export const runOfferSync = async () => {
  const jobId = Date.now().toString(); // Unique job ID for logging
  logger.info(`[Offer][Job:${jobId}] Starting offer sync`);

  try {
    // --- Step 1: Validate environment variables ---
    const { RAKUTEN_BEARER_TOKEN } = process.env;
    if (!RAKUTEN_BEARER_TOKEN) {
      logger.error(`[Offer][Job:${jobId}] Missing required environment variable: RAKUTEN_BEARER_TOKEN`);
      return {
        success: false,
        message: 'Missing required environment variable: RAKUTEN_BEARER_TOKEN',
        totalFetched: 0,
        totalPages: 0,
      };
    }

    // --- Step 2: Get Access Token ---
    const tokenData = qs.stringify({
      grant_type: 'password',
      scope: '4571385',
    });

    let accessToken;
    try {
      const tokenResponse = await axios.post('https://api.linksynergy.com/token', tokenData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${RAKUTEN_BEARER_TOKEN}`,
        },
      });
      accessToken = tokenResponse?.data?.access_token;
      if (!accessToken) {
        logger.error(`[Offer][Job:${jobId}] Failed to get access token from Rakuten API`);
        return {
          success: false,
          message: 'Failed to get access token from Rakuten API',
          totalFetched: 0,
          totalPages: 0,
        };
      }
    } catch (tokenError) {
      logger.error(`[Offer][Job:${jobId}] Error fetching access token`, {
        error: tokenError.message,
        stack: tokenError.stack,
      });
      return {
        success: false,
        message: 'Error fetching access token from Rakuten API',
        totalFetched: 0,
        totalPages: 0,
      };
    }

    const headers = {
      accept: 'application/json',
      authorization: `Bearer ${accessToken}`,
    };

    let allOffers = [];
    let totalOffers = 0;
    let currentPage = 1;
    let hasMorePages = true;
    const limit = 100; // Higher limit for efficiency
    let retryCount = 0;
    const maxRetries = 3;

    logger.info(`[Offer][Job:${jobId}] Starting to fetch all offers from API`);

    // --- Step 3: Fetch all pages ---
    while (hasMorePages) {
      try {
        const url = `https://api.linksynergy.com/v1/offers?offer_status=active&page=${currentPage}&limit=${limit}`;
        logger.info(`[Offer][Job:${jobId}] Fetching page ${currentPage}`);

        const response = await axios.get(url, { headers });
        const apiData = response.data;
        const currentPageOffers = apiData?.offers || [];
        const metadata = apiData?.metadata || {};

        logger.info(`[Offer][Job:${jobId}] Page ${currentPage}: Found ${currentPageOffers.length} offers`);

        // Check if there are more pages
        const totalFromMetadata = metadata.total || 0;
        const totalPages = Math.ceil(totalFromMetadata / limit);
        hasMorePages = currentPage < totalPages && currentPageOffers.length > 0;

        if (currentPageOffers.length === 0) {
          logger.info(`[Offer][Job:${jobId}] No offers found on page ${currentPage}, stopping pagination`);
          hasMorePages = false;
          break;
        }

        // Transform and prepare offers for storage
        const bulkOps = currentPageOffers.map((offer) => ({
          insertOne: {
            document: {
              ...offer,
              metadata: {
                ...metadata,
                page: currentPage,
                total_pages: totalPages,
              },
            },
          },
        }));

        // Store in database
        try {
          const result = await Offer.bulkWrite(bulkOps, { ordered: false });
          allOffers = allOffers.concat(bulkOps.map(op => op.insertOne.document));
          totalOffers += result.insertedCount;
          logger.info(`[Offer][Job:${jobId}] Stored ${result.insertedCount} offers from page ${currentPage}`);
        } catch (dbError) {
          logger.error(`[Offer][Job:${jobId}] Failed to store offers for page ${currentPage}`, {
            error: dbError.message,
            stack: dbError.stack,
          });
          // Continue to next page instead of failing entirely
        }

        currentPage++;
        retryCount = 0; // Reset retry count on success

        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));

      } catch (pageError) {
        logger.error(`[Offer][Job:${jobId}] Error fetching page ${currentPage}`, {
          error: pageError.message,
          stack: pageError.stack,
        });

        if (pageError.response?.status === 429 && retryCount < maxRetries) {
          retryCount++;
          const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff: 1s, 2s, 4s
          logger.info(`[Offer][Job:${jobId}] Rate limited, retrying page ${currentPage} after ${delay}ms (attempt ${retryCount}/${maxRetries})`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue; // Retry the same page
        } else {
          logger.warn(`[Offer][Job:${jobId}] Skipping page ${currentPage} due to error`, {
            error: pageError.message,
            stack: pageError.stack,
          });
          currentPage++; // Move to next page
          retryCount = 0; // Reset retry count
        }
      }
    }

    logger.info(`[Offer][Job:${jobId}] Successfully fetched and stored ${totalOffers} offers from ${currentPage - 1} pages`);

    // --- Step 4: Return result ---
    return {
      success: true,
      message: `Successfully processed ${totalOffers} offers`,
      totalFetched: totalOffers,
      totalPages: currentPage - 1,
    };
  } catch (error) {
    logger.error(`[Offer][Job:${jobId}] Unexpected error during offer sync`, {
      error: error.message,
      stack: error.stack,
    });
    return {
      success: false,
      message: 'Unexpected error during offer sync',
      totalFetched: 0,
      totalPages: 0,
    };
  }
};