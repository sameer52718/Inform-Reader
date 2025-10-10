import axios from 'axios';
import qs from 'qs';
import Offer from '../models/Offer.js';
import logger from '../logger.js';

export const runOfferSync = async () => {
  try {
    // --- Step 1: Get Access Token ---
    const bearerToken = process.env.RAKUTEN_BEARER_TOKEN;
    if (!bearerToken) throw new Error('RAKUTEN_BEARER_TOKEN not set in environment variables');

    const data = qs.stringify({
      grant_type: 'password',
      scope: '4571385',
    });

    const tokenResponse = await axios.post('https://api.linksynergy.com/token', data, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${bearerToken}`,
      },
    });

    const accessToken = tokenResponse.data.access_token;
    if (!accessToken) throw new Error('Failed to get access token from Rakuten API');

    const headers = {
      accept: 'application/json',
      authorization: `Bearer ${accessToken}`,
    };

    let allOffers = [];
    let totalOffers = 0;
    let currentPage = 1;
    let hasMorePages = true;
    const limit = 100; // Higher limit for efficiency

    logger.info('[Offer] Starting to fetch all offers from API');

    // --- Step 2: Fetch all pages ---
    while (hasMorePages) {
      try {
        const url = `https://api.linksynergy.com/v1/offers?offer_status=active&page=${currentPage}&limit=${limit}`;
        logger.info(`[Offer] Fetching page ${currentPage}`);

        const response = await axios.get(url, { headers });
        const apiData = response.data;
        const currentPageOffers = apiData.offers || [];
        const metadata = apiData.metadata || {};

        logger.info(`[Offer] Page ${currentPage}: Found ${currentPageOffers.length} offers`);

        // Check if there are more pages
        const totalFromMetadata = metadata.total || 0;
        const totalPages = Math.ceil(totalFromMetadata / limit);
        hasMorePages = currentPage < totalPages && currentPageOffers.length > 0;

        if (currentPageOffers.length === 0) {
          hasMorePages = false;
          break;
        }

        // Transform and prepare offers for storage
        const processedOffers = currentPageOffers.map((offer) => ({
          ...offer,
          metadata: {
            ...metadata,
            page: currentPage,
            total_pages: totalPages,
          },
        }));

        // Store in database
        const result = await Offer.insertMany(processedOffers, { ordered: false });
        allOffers = allOffers.concat(result);
        totalOffers += result.length;
        logger.info(`[Offer] Stored ${result.length} offers from page ${currentPage}`);

        totalOffers = totalFromMetadata;
        currentPage++;

        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));

      } catch (pageError) {
        logger.error(`[Offer] Error fetching page ${currentPage}: ${pageError.message}`);
        if (pageError.response?.status === 429) {
          logger.info('[Offer] Rate limited, waiting 1 minute');
          await new Promise((resolve) => setTimeout(resolve, 60000));
          // Retry the same page
          currentPage--;
        } else {
          throw pageError; // Rethrow other errors
        }
      }
    }

    logger.info(`[Offer] Successfully fetched and stored ${totalOffers} offers from ${currentPage - 1} pages`);

    // --- Step 3: Return result ---
    return {
      success: true,
      message: `Successfully stored ${totalOffers} offers`,
      totalFetched: totalOffers,
      totalPages: currentPage - 1,
    };
  } catch (error) {
    logger.error('[Offer] Failed to fetch offers:', { error: error.message });
    throw error;
  }
};