import axios from 'axios';
import qs from 'qs';
import { XMLParser } from 'fast-xml-parser';
import Category from '../models/Category.js';
import SubCategory from '../models/SubCategory.js';
import Coupon from '../models/Coupon.js';
import logger from '../logger.js';

export const runCouponSync = async () => {
    try {
        // --- Step 1: Get Access Token ---
        const bearerToken = process.env.RAKUTEN_BEARER_TOKEN;
        if (!bearerToken) throw new Error('RAKUTEN_BEARER_TOKEN not set in environment variables');

        const tokenData = qs.stringify({
            grant_type: 'password',
            scope: '4571385',
        });

        const tokenResponse = await axios.post('https://api.linksynergy.com/token', tokenData, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Authorization: `Basic ${bearerToken}`,
            },
        });

        const accessToken = tokenResponse?.data?.access_token;
        if (!accessToken) throw new Error('Failed to get access token from Rakuten API');

        // --- Step 2: Fetch Coupons ---
        const couponResponse = await axios.get('https://api.linksynergy.com/coupon/1.0', {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/xml',
            },
            params: { sid: process.env.RAKUTEN_PUBLISHER_SID },
        });

        // --- Step 3: Parse XML ---
        const parser = new XMLParser({
            ignoreAttributes: false,
            parseAttributeValue: true,
            removeNSPrefix: true,
        });
        const couponData = parser.parse(couponResponse.data);
        const links = couponData?.couponfeed?.link || [];

        if (!Array.isArray(links) || links.length === 0) {
            logger.info('[Coupon] No coupons found.');
            return { success: true, message: 'No coupons found.', totalFetched: 0, inserted: 0, skipped: 0 };
        }

        // --- Step 4: Ensure "Coupons" category exists ---
        let category = await Category.findOne({ name: 'Coupons' });
        if (!category) {
            category = await Category.create({ name: 'Coupons', slug: 'coupons' });
            logger.info('[Coupon] Created new category: Coupons');
        }

        let inserted = 0;
        let skipped = 0;

        // --- Step 5: Process Coupons ---
        const couponPromises = links.map(async (link) => {
            try {
                const advertiserId = link?.advertiserid;
                const offerDescription = link?.offerdescription;
                const couponCode = link?.couponcode || null;

                // 🧩 Category Name
                let categoryName = 'Uncategorized';
                const rawCategory = link?.categories?.category;
                if (rawCategory) {
                    if (Array.isArray(rawCategory)) {
                        categoryName = rawCategory[0]['#text']?.trim() || 'Uncategorized';
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

                // --- Skip duplicates
                const existing = await Coupon.findOne({
                    advertiserid: advertiserId,
                    offerdescription: offerDescription,
                    couponcode: couponCode,
                });

                if (existing) {
                    skipped++;
                    return null;
                }

                // --- Ensure SubCategory exists
                let subCategory = await SubCategory.findOne({
                    name: categoryName,
                    categoryId: category._id,
                });
                if (!subCategory) {
                    subCategory = await SubCategory.create({
                        name: categoryName,
                        categoryId: category._id,
                    });
                    logger.info(`[Coupon] Created new subcategory: ${categoryName}`);
                }

                // --- Create Coupon
                await Coupon.create({
                    categoryId: category._id,
                    subCategoryId: subCategory._id,
                    promotiontypes: { promotiontype: promotionType },
                    offerdescription: offerDescription,
                    offerstartdate: link?.offerstartdate ? new Date(link.offerstartdate) : null,
                    offerenddate: link?.offerenddate ? new Date(link.offerenddate) : null,
                    couponcode: couponCode,
                    clickurl: link?.clickurl,
                    impressionpixel: link?.impressionpixel,
                    advertiserid: advertiserId,
                    advertisername: link?.advertisername,
                    network: networkName,
                });

                inserted++;
            } catch (err) {
                logger.warn(`[Coupon] Skipping invalid coupon: ${err.message}`);
            }
        });

        await Promise.all(couponPromises);

        // --- Step 6: Log Results ---
        logger.info('[Coupon] Coupon sync completed', {
            totalFetched: links.length,
            inserted,
            skipped,
        });

        return {
            success: true,
            message: 'Coupons fetched and saved successfully.',
            totalFetched: links.length,
            inserted,
            skipped,
        };
    } catch (error) {
        logger.error('[Coupon] Error in coupon sync:', { error: error.message });
        throw error;
    }
};