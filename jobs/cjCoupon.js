import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';
import Category from '../models/Category.js';
import SubCategory from '../models/SubCategory.js';
import Coupon from '../models/Coupon.js';
import logger from '../logger.js';

export const runCJCouponSync = async () => {
    const jobId = Date.now().toString();
    logger.info(`[CJ][Job:${jobId}] Starting CJ coupon sync`);

    try {
        // --- Step 1: Validate environment ---
        const { CJ_TOKEN } = process.env;
        if (!CJ_TOKEN) {
            logger.error(`[CJ][Job:${jobId}] Missing CJ_TOKEN`);
            return {
                success: false,
                message: 'Missing CJ_TOKEN environment variable',
                totalFetched: 0,
                inserted: 0,
                skipped: 0,
            };
        }

        const parser = new XMLParser({
            ignoreAttributes: false,
            parseAttributeValue: true,
            removeNSPrefix: true,
        });

        // --- Step 2: Category ensure ---
        let category = await Category.findOne({ name: 'Coupons' });
        if (!category) {
            category = await Category.create({ name: 'Coupons', slug: 'coupons' });
            logger.info(`[CJ][Job:${jobId}] Created 'Coupons' category`);
        }

        let inserted = 0;
        let skipped = 0;
        let totalFetched = 0;
        let currentPage = 1;
        const perPage = 100;
        const subCategoryCache = new Map();

        // --- Step 3: Pagination loop ---
        while (true) {
            try {
                logger.info(`[CJ][Job:${jobId}] Fetching page ${currentPage}`);

                const response = await axios.get(
                    `https://link-search.api.cj.com/v2/link-search?website-id=101424322&advertiser-ids=joined&promotion-type=coupon&page-number=${currentPage}`,
                    {
                        headers: {
                            Authorization: `Bearer ${CJ_TOKEN}`,
                            Accept: 'application/xml',
                        },
                    }
                );

                const parsed = parser.parse(response.data);
                const linksNode = parsed?.['cj-api']?.links;
                const links = linksNode?.link;

                const totalMatched = Number(linksNode?.['@_total-matched'] || 0);
                const recordsReturned = Number(linksNode?.['@_records-returned'] || 0);
                const pageNumber = Number(linksNode?.['@_page-number'] || 1);

                if (!links || (Array.isArray(links) && links.length === 0)) {
                    logger.info(`[CJ][Job:${jobId}] No more coupons found on page ${pageNumber}`);
                    break;
                }

                const couponList = Array.isArray(links) ? links : [links];
                totalFetched += couponList.length;

                logger.info(
                    `[CJ][Job:${jobId}] Page ${pageNumber}: fetched ${couponList.length} coupons (Total so far: ${totalFetched}/${totalMatched})`
                );

                // --- Step 4: Process each coupon ---
                for (const link of couponList) {
                    try {
                        const advertiserId = link['advertiser-id'] || null;
                        const offerDescription = link.description || '';
                        const couponCode = link['coupon-code'] || null;
                        const linkId = link['link-id'] || 0;
                        const linkName = link['link-name'] || 'Unknown';
                        const categoryName = link.category || 'Uncategorized';
                        const promotionType = link['promotion-type'] || '';
                        const networkName = 'CJ';

                        const impressionPixel =
                            link['link-code-html']?.match(/<img[^>]+src=["'](.*?)["']/)?.[1] || '';

                        let lastUpdated = null;
                        if (link['last-updated']) {
                            const parsedDate = new Date(link['last-updated']);
                            if (!isNaN(parsedDate.getTime())) lastUpdated = parsedDate;
                        }

                        // --- Duplicate check
                        const existing = await Coupon.findOne({
                            advertiserid: advertiserId,
                            offerdescription: offerDescription,
                            couponcode: couponCode,
                            refrence: 'CJ',
                        });
                        if (existing) {
                            skipped++;
                            continue;
                        }

                        // --- Ensure SubCategory (cache)
                        const cacheKey = `${categoryName}:${category._id}`;
                        let subCategory;
                        if (subCategoryCache.has(cacheKey)) {
                            subCategory = subCategoryCache.get(cacheKey);
                        } else {
                            subCategory = await SubCategory.findOne({
                                name: categoryName,
                                categoryId: category._id,
                            });
                            if (!subCategory) {
                                subCategory = await SubCategory.create({
                                    name: categoryName,
                                    categoryId: category._id,
                                });
                                logger.info(`[CJ][Job:${jobId}] Created subcategory: ${categoryName}`);
                            }
                            subCategoryCache.set(cacheKey, subCategory);
                        }

                        await Coupon.create({
                            adminId: null,
                            categoryId: category._id,
                            subCategoryId: subCategory._id,
                            promotiontypes: { promotiontype: promotionType },
                            offerdescription: offerDescription,
                            offerstartdate: link['promotion-start-date']
                                ? new Date(link['promotion-start-date'])
                                : null,
                            offerenddate: link['promotion-end-date']
                                ? new Date(link['promotion-end-date'])
                                : null,
                            couponcode: couponCode,
                            clickurl: link.clickUrl || '',
                            impressionpixel: impressionPixel,
                            advertiserid: advertiserId,
                            advertisername: link['advertiser-name'] || '',
                            network: networkName,
                            refrence: 'CJ',
                            status: link['relationship-status'] === 'joined',
                            isDeleted: false,
                            clickCommission: link['click-commission'] || 0,
                            creativeHeight: link['creative-height'] || 0,
                            creativeWidth: link['creative-width'] || 0,
                            language: link.language || '',
                            linkCodeHtml: link['link-code-html'] || '',
                            linkCodeJavascript: link['link-code-javascript'] || '',
                            destination: link.destination || '',
                            linkId,
                            linkName,
                            linkType: link['link-type'] || '',
                            allowDeepLinking: Boolean(link['allow-deep-linking']),
                            performanceIncentive: Boolean(link['performance-incentive']),
                            saleCommission: link['sale-commission'] || '',
                            mobileOptimized: Boolean(link['mobile-optimized']),
                            mobileAppDownload: Boolean(link['mobile-app-download']),
                            crossDeviceOnly: Boolean(link['cross-device-only']),
                            targetedCountries: link['targeted-countries'] || '',
                            eventName: link['event-name'] || '',
                            adContent: link['ad-content'] || '',
                            lastUpdated,
                            sevenDayEpc: link['seven-day-epc'] || '',
                            threeMonthEpc: link['three-month-epc'] || '',
                        });

                        inserted++;
                    } catch (innerErr) {
                        skipped++;
                        logger.warn(`[CJ][Job:${jobId}] Skipped coupon: ${innerErr.message}`);
                    }
                }

                // --- Stop if no more pages
                if (totalFetched >= totalMatched) {
                    logger.info(`[CJ][Job:${jobId}] All ${totalMatched} coupons fetched.`);
                    break;
                }

                currentPage++;
            } catch (pageError) {
                logger.error(`[CJ][Job:${jobId}] Failed on page ${currentPage}`, {
                    error: pageError.message,
                });
                break;
            }
        }

        // --- Step 5: Finish ---
        logger.info(`[CJ][Job:${jobId}] CJ Coupon sync completed`, {
            totalFetched,
            inserted,
            skipped,
        });

        return {
            success: true,
            message: 'CJ coupons synced successfully',
            totalFetched,
            inserted,
            skipped,
        };
    } catch (error) {
        logger.error(`[CJ][Job:${jobId}] Unexpected error`, {
            error: error.message,
            stack: error.stack,
        });
        return {
            success: false,
            message: 'Unexpected error during CJ coupon sync',
            totalFetched: 0,
            inserted: 0,
            skipped: 0,
        };
    }
};
