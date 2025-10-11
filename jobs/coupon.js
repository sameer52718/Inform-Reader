import axios from 'axios';
import qs from 'qs';
import { XMLParser } from 'fast-xml-parser';
import Category from '../models/Category.js';
import SubCategory from '../models/SubCategory.js';
import Coupon from '../models/Coupon.js';
import logger from '../logger.js';

export const runCouponSync = async () => {
    const jobId = Date.now().toString(); // Unique job ID for logging
    logger.info(`[Coupon][Job:${jobId}] Starting coupon sync`);

    try {
        // --- Step 1: Validate environment variables ---
        const { RAKUTEN_BEARER_TOKEN, RAKUTEN_PUBLISHER_SID } = process.env;
        if (!RAKUTEN_BEARER_TOKEN || !RAKUTEN_PUBLISHER_SID) {
            logger.error(`[Coupon][Job:${jobId}] Missing required environment variables`, {
                missing: [!RAKUTEN_BEARER_TOKEN && 'RAKUTEN_BEARER_TOKEN', !RAKUTEN_PUBLISHER_SID && 'RAKUTEN_PUBLISHER_SID'].filter(Boolean),
            });
            return {
                success: false,
                message: 'Missing required environment variables',
                totalFetched: 0,
                inserted: 0,
                skipped: 0,
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
                logger.error(`[Coupon][Job:${jobId}] Failed to get access token from Rakuten API`);
                return {
                    success: false,
                    message: 'Failed to get access token from Rakuten API',
                    totalFetched: 0,
                    inserted: 0,
                    skipped: 0,
                };
            }
        } catch (tokenError) {
            logger.error(`[Coupon][Job:${jobId}] Error fetching access token`, {
                error: tokenError.message,
                stack: tokenError.stack,
            });
            return {
                success: false,
                message: 'Error fetching access token from Rakuten API',
                totalFetched: 0,
                inserted: 0,
                skipped: 0,
            };
        }

        // --- Step 3: Fetch Coupons ---
        let couponResponse;
        try {
            couponResponse = await axios.get('https://api.linksynergy.com/coupon/1.0', {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    Accept: 'application/xml',
                },
                params: { sid: RAKUTEN_PUBLISHER_SID },
            });
        } catch (apiError) {
            logger.error(`[Coupon][Job:${jobId}] Failed to fetch coupons from Rakuten API`, {
                error: apiError.message,
                stack: apiError.stack,
            });
            return {
                success: false,
                message: 'Failed to fetch coupons from Rakuten API',
                totalFetched: 0,
                inserted: 0,
                skipped: 0,
            };
        }

        // --- Step 4: Parse XML ---
        let couponData;
        try {
            const parser = new XMLParser({
                ignoreAttributes: false,
                parseAttributeValue: true,
                removeNSPrefix: true,
            });
            couponData = parser.parse(couponResponse.data);
        } catch (parseError) {
            logger.error(`[Coupon][Job:${jobId}] Failed to parse XML response`, {
                error: parseError.message,
                stack: parseError.stack,
            });
            return {
                success: false,
                message: 'Failed to parse XML response from Rakuten API',
                totalFetched: 0,
                inserted: 0,
                skipped: 0,
            };
        }

        const links = couponData?.couponfeed?.link || [];
        if (!Array.isArray(links) || links.length === 0) {
            logger.info(`[Coupon][Job:${jobId}] No coupons found`);
            return {
                success: true,
                message: 'No coupons found',
                totalFetched: 0,
                inserted: 0,
                skipped: 0,
            };
        }

        logger.info(`[Coupon][Job:${jobId}] Found ${links.length} coupons`);

        // --- Step 5: Ensure "Coupons" category exists ---
        let category;
        try {
            category = await Category.findOne({ name: 'Coupons' });
            if (!category) {
                category = await Category.create({ name: 'Coupons', slug: 'coupons' });
                logger.info(`[Coupon][Job:${jobId}] Created new category: Coupons`);
            }
        } catch (categoryError) {
            logger.error(`[Coupon][Job:${jobId}] Failed to create/find category 'Coupons'`, {
                error: categoryError.message,
                stack: categoryError.stack,
            });
            return {
                success: false,
                message: 'Failed to create/find category Coupons',
                totalFetched: links.length,
                inserted: 0,
                skipped: 0,
            };
        }

        // --- Step 6: Process Coupons ---
        let inserted = 0;
        let skipped = 0;
        const couponBulkOps = [];
        const subCategoryCache = new Map(); // Cache subcategories to avoid duplicate queries

        for (const link of links) {
            try {
                const advertiserId = link?.advertiserid || 'unknown';
                const offerDescription = link?.offerdescription || '';
                const couponCode = link?.couponcode || null;

                // 🧩 Category Name
                let categoryName = 'Uncategorized';
                const rawCategory = link?.categories?.category;
                if (rawCategory) {
                    if (Array.isArray(rawCategory)) {
                        categoryName = rawCategory[0]?.['#text']?.trim() || 'Uncategorized';
                    } else if (typeof rawCategory === 'object' && rawCategory['#text']) {
                        categoryName = rawCategory['#text'].trim();
                    } else if (typeof rawCategory === 'string') {
                        categoryName = rawCategory.trim();
                    }
                }

                // 🧩 Promotion Type
                let promotionType = '';
                const rawPromo = link?.promotiontypes?.promotiontype;
                if (rawPromo) {
                    if (typeof rawPromo === 'object' && rawPromo['#text']) {
                        promotionType = rawPromo['#text'].trim();
                    } else if (typeof rawPromo === 'string') {
                        promotionType = rawPromo.trim();
                    }
                }

                // 🧩 Network Name
                let networkName = '';
                const rawNetwork = link?.network;
                if (rawNetwork) {
                    if (typeof rawNetwork === 'object' && rawNetwork['#text']) {
                        networkName = rawNetwork['#text'].trim();
                    } else if (typeof rawNetwork === 'string') {
                        networkName = rawNetwork.trim();
                    }
                }

                // --- Check for duplicates
                const existing = await Coupon.findOne({
                    advertiserid: advertiserId,
                    offerdescription: offerDescription,
                    couponcode: couponCode,
                });

                if (existing) {
                    skipped++;
                    logger.info(`[Coupon][Job:${jobId}] Skipped duplicate coupon: ${offerDescription} (Advertiser: ${advertiserId})`);
                    continue;
                }

                // --- Ensure SubCategory exists
                let subCategory;
                const cacheKey = `${categoryName}:${category._id}`;
                if (subCategoryCache.has(cacheKey)) {
                    subCategory = subCategoryCache.get(cacheKey);
                } else {
                    try {
                        subCategory = await SubCategory.findOne({
                            name: categoryName,
                            categoryId: category._id,
                        });
                        if (!subCategory) {
                            subCategory = await SubCategory.create({
                                name: categoryName,
                                categoryId: category._id,
                            });
                            logger.info(`[Coupon][Job:${jobId}] Created new subcategory: ${categoryName}`);
                        }
                        subCategoryCache.set(cacheKey, subCategory);
                    } catch (subCategoryError) {
                        logger.warn(`[Coupon][Job:${jobId}] Failed to create/find subcategory: ${categoryName}`, {
                            error: subCategoryError.message,
                            stack: subCategoryError.stack,
                        });
                        skipped++;
                        continue;
                    }
                }

                // --- Prepare Coupon for bulk write
                couponBulkOps.push({
                    insertOne: {
                        document: {
                            categoryId: category._id,
                            subCategoryId: subCategory._id,
                            promotiontypes: { promotiontype: promotionType },
                            offerdescription: offerDescription,
                            offerstartdate: link?.offerstartdate ? new Date(link.offerstartdate) : null,
                            offerenddate: link?.offerenddate ? new Date(link.offerenddate) : null,
                            couponcode: couponCode,
                            clickurl: link?.clickurl || '',
                            impressionpixel: link?.impressionpixel || '',
                            advertiserid: advertiserId,
                            advertisername: link?.advertisername || '',
                            network: networkName,
                        },
                    },
                });

                logger.info(`[Coupon][Job:${jobId}] Prepared coupon: ${offerDescription} (Advertiser: ${advertiserId})`);
            } catch (couponError) {
                logger.warn(`[Coupon][Job:${jobId}] Skipping invalid coupon for advertiser ${link?.advertiserid || 'unknown'}`, {
                    error: couponError.message,
                    stack: couponError.stack,
                });
                skipped++;
            }
        }

        // --- Step 7: Execute bulk write to MongoDB ---
        if (couponBulkOps.length > 0) {
            try {
                const result = await Coupon.bulkWrite(couponBulkOps, { ordered: false });
                inserted = result.insertedCount;
                logger.info(`[Coupon][Job:${jobId}] Successfully inserted ${inserted} coupons`);
            } catch (dbError) {
                logger.error(`[Coupon][Job:${jobId}] Failed to insert coupons in MongoDB`, {
                    error: dbError.message,
                    stack: dbError.stack,
                });
                return {
                    success: false,
                    message: 'Failed to insert coupons in MongoDB',
                    totalFetched: links.length,
                    inserted: 0,
                    skipped: links.length,
                };
            }
        } else {
            logger.warn(`[Coupon][Job:${jobId}] No valid coupons to insert in MongoDB`);
        }

        // --- Step 8: Return result ---
        logger.info(`[Coupon][Job:${jobId}] Coupon sync completed`, {
            totalFetched: links.length,
            inserted,
            skipped,
        });

        return {
            success: true,
            message: 'Coupons processed successfully',
            totalFetched: links.length,
            inserted,
            skipped,
        };
    } catch (error) {
        logger.error(`[Coupon][Job:${jobId}] Unexpected error during coupon sync`, {
            error: error.message,
            stack: error.stack,
        });
        return {
            success: false,
            message: 'Unexpected error during coupon sync',
            totalFetched: 0,
            inserted: 0,
            skipped: 0,
        };
    }
};