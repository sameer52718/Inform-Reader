import BaseController from '../BaseController.js';
import Country from '../../models/Country.js';
import Type from '../../models/Type.js';
import Category from '../../models/Category.js';
import SubCategory from '../../models/SubCategory.js';
import Brand from '../../models/Brand.js';
import Religion from '../../models/Religion.js';
import Company from '../../models/Company.js';
import Model from '../../models/Model.js';
import Make from '../../models/Make.js';
import Config from '../../models/Config.js';
import City from '../../models/City.js';
import Nationality from '../../models/Nationality.js';
import Advertisement from '../../models/Advertisement.js';
import axios from 'axios';
import { parseStringPromise } from 'xml2js';
import qs from 'qs';
import { XMLParser } from 'fast-xml-parser';
import dotenv from 'dotenv';
import Coupon from '../../models/Coupon.js';
import Merchant from '../../models/Merchant.js';
import Offer from '../../models/Offer.js';
dotenv.config();

class CommonController extends BaseController {
  constructor() {
    super();
    this.country = this.country.bind(this);
    this.type = this.type.bind(this);
    this.category = this.category.bind(this);
    this.subCategory = this.subCategory.bind(this);
    this.brand = this.brand.bind(this);
    this.religion = this.religion.bind(this);
    this.company = this.company.bind(this);
    this.make = this.make.bind(this);
    this.model = this.model.bind(this);
    this.getConfig = this.getConfig.bind(this);
    this.cities = this.cities.bind(this);
    this.translateContent = this.translateContent.bind(this);
    this.nationality = this.nationality.bind(this);
    this.advertiser = this.advertiser.bind(this);
    this.myAdvertiser = this.myAdvertiser.bind(this);
    this.coupon = this.coupon.bind(this);
    this.getAllOffers = this.getAllOffers.bind(this);
    this.cjCoupon = this.cjCoupon.bind(this);
  }

  async cjCoupon(req, res, next) {
    try {
      // --- Step 1: Set up headers ---
      const headers = {
        Authorization: `Bearer ${process.env.CJ_TOKEN}`,
        Accept: 'application/xml',
      };

      // --- Step 2: Fetch Coupons from CJ Link Search API ---
      const response = await axios.get('https://link-search.api.cj.com/v2/link-search?website-id=101424322&advertiser-ids=joined&promotion-type=coupon', { headers });

      // --- Step 3: Parse XML safely ---
      const parser = new XMLParser({
        ignoreAttributes: false,
        parseAttributeValue: true,
        removeNSPrefix: true,
      });

      const parsed = parser.parse(response.data);
      const links = parsed?.['cj-api']?.links?.link;

      if (!links || (Array.isArray(links) && links.length === 0)) {
        return res.status(200).json({ success: true, message: 'No coupons found.' });
      }

      // Normalize to array
      const couponList = Array.isArray(links) ? links : [links];

      // --- Step 4: Ensure "Coupons" category exists ---
      let category = await Category.findOne({ name: 'Coupons' });
      if (!category) {
        category = await Category.create({ name: 'Coupons', slug: 'coupons' });
      }

      let inserted = 0;
      let skipped = 0;

      // --- Step 5: Process Coupons ---
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

          // Extract image from HTML
          const impressionPixel = link['link-code-html']?.match(/<img[^>]+src=["'](.*?)["']/)?.[1] || '';

          // Parse date correctly
          let lastUpdated = null;
          if (link['last-updated']) {
            const rawDate = link['last-updated'];
            const parsedDate = new Date(rawDate);
            if (!isNaN(parsedDate.getTime())) {
              lastUpdated = parsedDate;
            } else {
              console.warn(`⚠️ Skipped invalid date: ${rawDate}`);
            }
          }

          // --- Skip duplicates ---
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

          // --- Ensure SubCategory exists ---
          let subCategory = await SubCategory.findOne({
            name: categoryName,
            categoryId: category._id,
          });
          if (!subCategory) {
            subCategory = await SubCategory.create({
              name: categoryName,
              categoryId: category._id,
            });
          }

          // --- Create Coupon ---
          await Coupon.create({
            adminId: null,
            categoryId: category._id,
            subCategoryId: subCategory._id,
            promotiontypes: { promotiontype: promotionType },
            offerdescription: offerDescription,
            offerstartdate: link['promotion-start-date'] ? new Date(link['promotion-start-date']) : null,
            offerenddate: link['promotion-end-date'] ? new Date(link['promotion-end-date']) : null,
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
          console.warn(`Skipping coupon (advertiser-id: ${link['advertiser-id'] || 'unknown'}): ${innerErr.message}`);
        }
      }

      // --- Step 6: Respond ---
      return res.status(200).json({
        success: true,
        message: 'Coupons fetched and saved successfully.',
        totalFetched: couponList.length,
        inserted,
        skipped,
      });
    } catch (error) {
      console.error('Error in coupon import:', error.response?.data || error.message);
      return next({
        status: 500,
        message: 'Failed to fetch or save coupons.',
        error: error.message,
      });
    }
  }

  async advertiser(req, res, next) {
    try {
      const headers = {
        Authorization: `Bearer ${process.env.CJ_TOKEN}`, // Use env variable for security
        Accept: 'application/xml', // v2 returns XML
      };

      // Step 1: Call Advertiser Lookup API
      const url = `https://advertiser-lookup.api.cj.com/v2/advertiser-lookup?requestor-cid=${process.env.CJ_CID}&advertiser-ids=joined`;
      const response = await axios.get(url, { headers });

      // Step 2: Parse XML response
      const parsedData = await parseStringPromise(response.data);
      const advertisers = parsedData['cj-api'].advertisers[0].advertiser || [];

      console.log(`Found ${advertisers.length} advertisers.`);

      // Step 3: Map and store advertisers
      const storedAdvertisers = [];
      for (const adv of advertisers) {
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
          actions:
            adv.actions?.[0]?.action?.map((action) => ({
              name: action.name[0],
              type: action.type[0],
              id: action.id[0],
              commission: {
                default: action.commission[0].default?.[0] || '0.00%',
                itemlist:
                  action.commission[0].itemlist?.map((item) => ({
                    value: item._ || '0.00',
                    name: item.$?.name || '',
                    id: item.$?.id || '',
                  })) || [],
              },
            })) || [],
          linkTypes: adv['link-types']?.[0]?.['link-type'] || [],
        };

        // Step 4: Store/Update in MongoDB (no duplicates)
        const updatedAdvertiser = await Advertisement.findOneAndUpdate({ advertiserId: advertiserData.advertiserId }, advertiserData, {
          upsert: true,
          new: true,
          runValidators: true,
        });
        storedAdvertisers.push(updatedAdvertiser);

        console.log(`Stored/Updated: ${advertiserData.advertiserName}`);

        // Delay to avoid rate limits (25 calls/minute)
        await new Promise((resolve) => setTimeout(resolve, 2500));
      }

      return res.json({
        error: false,
        message: 'Advertisers stored successfully',
        count: storedAdvertisers.length,
        advertisers: storedAdvertisers,
      });
    } catch (error) {
      console.error('Error:', error.response?.data || error.message);
      return res.status(500).json({
        error: true,
        message: error.message || 'Internal Server Error',
      });
    }
  }

  async myAdvertiser(req, res, next) {
    try {
      const bearerToken = 'TVhIUmdPenFyUVdJRTREOUttQ3k2ZE1FZ0xhc1VwMTY6QUlUemxGQjk4b0dBY0VneVdWVnpPRWFoR1BCZGNVNGk=';

      const data = qs.stringify({
        grant_type: 'password',
        scope: '4571385',
      });

      // Step 1: Get token
      const tokenResponse = await axios.post('https://api.linksynergy.com/token', data, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Bearer ${bearerToken}`,
        },
      });

      const accessToken = tokenResponse.data.access_token;

      const keyword = req.query.keyword || ''; // Optional: from query string
      const status = 'approved'; // Fetch only approved advertisers
      const headers = {
        authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json', // v2 uses JSON
      };

      const response = await axios.get(`https://api.linksynergy.com/advertisersearch/1.0?merchantname=${keyword}`, { headers });
      // const response = await axios.get(`https://api.linksynergy.com/v2/advertisers/815`, { headers, });

      const parser = new XMLParser();
      const advertisers = parser.parse(response.data);
      console.log(advertisers.result.midlist.merchant);

      for (const ad of advertisers.result.midlist.merchant) {
        try {
          const response = await axios.get(`https://api.linksynergy.com/v2/advertisers/${ad.mid}`, { headers });
          const advertiserInfo = response.data?.advertiser;
          console.log(advertiserInfo);
          await Merchant.findOneAndUpdate(
            { advertiserId: advertiserInfo.id },
            {
              advertiserId: advertiserInfo.id,
              name: advertiserInfo.name,
              url: advertiserInfo.url,
              description: advertiserInfo.description,
              can_partner: advertiserInfo.can_partner,
              contact: advertiserInfo.contact || {},
              policies: advertiserInfo.policies || {},
              features: advertiserInfo.features || {},
              network: advertiserInfo.network || {},
            },
            { upsert: true, new: true },
          );
          console.log(`Stored/Updated: ${advertiserInfo.name}`);
        } catch (innerErr) {
          console.error(`Failed to fetch advertiser ${ad.mid}:`, innerErr.message);
        }
      }

      return res.json({
        error: false,
        data: advertisers, // JSON data directly
      });
    } catch (error) {
      console.error('Error:', error.response?.data || error.message);
      return res.status(error.response?.status || 500).json({
        error: true,
        message: error.message || 'Internal Server Error',
      });
    }
  }

  // async myAdvertiser(req, res, next) {
  //   try {
  //     // 1️⃣ Generate Access Token
  //     const bearerToken =
  //       "TVhIUmdPenFyUVdJRTREOUttQ3k2ZE1FZ0xhc1VwMTY6QUlUemxGQjk4b0dBY0VneVdWVnpPRWFoR1BCZGNVNGk=";

  //     const tokenData = qs.stringify({
  //       grant_type: "password",
  //       scope: "4571385",
  //     });

  //     const tokenResponse = await axios.post("https://api.linksynergy.com/token", tokenData, {
  //       headers: {
  //         "Content-Type": "application/x-www-form-urlencoded",
  //         Authorization: `Basic ${bearerToken}`, // ✅ must be Basic
  //       },
  //     });

  //     const accessToken = tokenResponse.data.access_token;

  //     if (!accessToken) throw new Error("Failed to retrieve access token");

  //     let keyword;
  //     // 2️⃣ Fetch Advertiser List
  //     const listResponse = await axios.get(
  //       `https://api.linksynergy.com/advertisersearch/1.0?merchantname=${keyword}`,
  //       {
  //         headers: {
  //           Authorization: `Bearer ${accessToken}`,
  //           Accept: "application/json",
  //         },
  //       }
  //     );

  //     // const advertisers = listResponse.data?.advertisers || [];
  //     const parser = new XMLParser();
  //     const advertisers = parser.parse(listResponse.data) || [];
  //     if (advertisers.length === 0) {
  //       return res.json({ error: false, message: "No advertisers found." });
  //     }
  //     console.log(advertisers);

  //     // 3️⃣ Loop through each advertiser & fetch full info
  //     for (const ad of advertisers) {
  //       try {
  //         const infoResponse = await axios.get(
  //           `https://api.linksynergy.com/v2/advertisers/${ad.mid}`,
  //           {
  //             headers: {
  //               Authorization: `Bearer ${accessToken}`,
  //               Accept: "application/json",
  //             },
  //           }
  //         );

  //         const advertiserInfo = infoResponse.data?.advertiser;

  //         if (advertiserInfo) {
  //           await Merchant.findOneAndUpdate(
  //             { advertiserId: advertiserInfo.id },
  //             {
  //               advertiserId: advertiserInfo.id,
  //               name: advertiserInfo.name,
  //               url: advertiserInfo.url,
  //               description: advertiserInfo.description,
  //               can_partner: advertiserInfo.can_partner,
  //               contact: advertiserInfo.contact || {},
  //               policies: advertiserInfo.policies || {},
  //               features: advertiserInfo.features || {},
  //               network: advertiserInfo.network || {},
  //             },
  //             { upsert: true, new: true }
  //           );
  //         }
  //       } catch (innerErr) {
  //         console.error(`Failed to fetch advertiser ${ad.mid}:`, innerErr.message);
  //       }
  //     }

  //     // 4️⃣ Return success response
  //     return res.json({
  //       error: false,
  //       message: "Merchant data synced successfully",
  //     });

  //   } catch (error) {
  //     console.error('Error:', error.response?.data || error.message);
  //     return res.status(error.response?.status || 500).json({
  //       error: true,
  //       message: error.message || 'Internal Server Error',
  //     });
  //   }
  // }

  async coupon(req, res, next) {
    try {
      // --- Step 1: Get Access Token ---
      const bearerToken = process.env.RAKUTEN_BEARER_TOKEN;
      const tokenData = qs.stringify({
        grant_type: 'password',
        scope: '4571385',
      });

      const tokenResponse = await axios.post('https://api.linksynergy.com/token', tokenData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Bearer ${bearerToken}`,
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
        return res.status(200).json({ success: true, message: 'No coupons found.' });
      }

      // --- Step 4: Ensure "Coupons" category exists ---
      let category = await Category.findOne({ name: 'Coupons' });
      if (!category) {
        category = await Category.create({ name: 'Coupons', slug: 'coupons' });
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
          console.warn('Skipping invalid coupon:', err.message);
        }
      });

      await Promise.all(couponPromises);

      // --- Step 6: Respond ---
      return res.status(200).json({
        success: true,
        message: 'Coupons fetched and saved successfully.',
        totalFetched: links.length,
        inserted,
        skipped,
      });
    } catch (error) {
      console.error('Error in coupon import:', error.response?.data || error.message);
      return next({
        status: 500,
        message: 'Failed to fetch or save coupons.',
        error: error.message,
      });
    }
  }

  async getAllOffers(req, res, next) {
    try {
      const bearerToken = 'TVhIUmdPenFyUVdJRTREOUttQ3k2ZE1FZ0xhc1VwMTY6QUlUemxGQjk4b0dBY0VneVdWVnpPRWFoR1BCZGNVNGk=';

      const data = qs.stringify({
        grant_type: 'password',
        scope: '4571385',
      });

      // Step 1: Get token
      const tokenResponse = await axios.post('https://api.linksynergy.com/token', data, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Bearer ${bearerToken}`,
        },
      });

      const accessToken = tokenResponse.data.access_token;

      const headers = {
        accept: 'application/json',
        authorization: `Bearer ${accessToken}`,
      };

      let allOffers = [];
      let totalOffers = 0;
      let currentPage = 1;
      let hasMorePages = true;
      const limit = 100; // Higher limit for efficiency

      console.log('🚀 Starting to fetch all offers from API...');

      // Step 2: Fetch all pages
      while (hasMorePages) {
        try {
          const url = `https://api.linksynergy.com/v1/offers?offer_status=active&page=${currentPage}&limit=${limit}`;
          console.log(`📄 Fetching page ${currentPage}...`);

          const response = await axios.get(url, { headers });
          const apiData = response.data;
          const currentPageOffers = apiData.offers || [];
          const metadata = apiData.metadata || {};

          console.log(`✅ Page ${currentPage}: Found ${currentPageOffers.length} offers`);

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
          await Offer.insertMany(processedOffers, { ordered: false })
            .then((result) => {
              allOffers = allOffers.concat(result);
              totalOffers += result.length;
              console.log(`💾 Stored ${result.length} offers from page ${currentPage}`);
            })
            .catch((err) => {
              console.error(`⚠️ Error storing offers from page ${currentPage}:`, err.message);
              // Continue with next page even if some inserts fail
            });

          totalOffers = totalFromMetadata;
          currentPage++;

          // Small delay to avoid rate limiting
          await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (pageError) {
          console.error(`❌ Error fetching page ${currentPage}:`, pageError.message);
          if (pageError.response?.status === 429) {
            console.log('⏳ Rate limited, waiting 1 minute...');
            await new Promise((resolve) => setTimeout(resolve, 60000));
            // Retry the same page
            currentPage--;
          } else {
            throw pageError; // Rethrow other errors
          }
        }
      }

      console.log(`🎉 Successfully fetched and stored ${totalOffers} offers from ${currentPage - 1} pages`);

      // Step 3: Return response
      return res.json({
        error: false,
        offer: {
          metadata: {
            api_name_version: 'offers-v1.4.0',
            total: totalOffers,
            total_pages: currentPage - 1,
            last_fetched_at: new Date(),
          },
          offers: allOffers.slice(0, 5), // Return first 5 as sample
        },
        message: `Successfully stored ${totalOffers} offers`,
      });
    } catch (err) {
      console.error('❌ Failed to fetch offers:', err.message);
      return res.status(500).json({
        error: true,
        message: err.message || 'Failed to fetch and store offers',
      });
    }
  }

  // async coupon(req, res, next) {
  //   try {
  //     // Validate environment variables
  //     const required = ['RAKUTEN_CLIENT_ID', 'RAKUTEN_CLIENT_SECRET', 'RAKUTEN_REFRESH_TOKEN', 'RAKUTEN_PUBLISHER_SID', 'RAKUTEN_REDIRECT_URI'];
  //     for (let varName of required) {
  //       if (!process.env[varName]) throw new Error(`Missing environment variable: ${varName}`);
  //     }

  //     console.log('Environment Variables:', {
  //       client_id: process.env.RAKUTEN_CLIENT_ID,
  //       refresh_token: process.env.RAKUTEN_REFRESH_TOKEN ? '[REDACTED]' : undefined,
  //       sid: process.env.RAKUTEN_PUBLISHER_SID,
  //       redirect_uri: process.env.RAKUTEN_REDIRECT_URI,
  //     });

  //     // Step 1: Try refreshing token with multiple scopes
  //     const tokenUrl = 'https://api.linksynergy.com/token';
  //     const scopes = ['publisher', process.env.RAKUTEN_PUBLISHER_SID];
  //     let accessToken, newRefreshToken;

  //     for (let scope of scopes) {
  //       try {
  //         const tokenParams = new URLSearchParams({
  //           grant_type: 'refresh_token',
  //           refresh_token: process.env.RAKUTEN_REFRESH_TOKEN,
  //           client_id: process.env.RAKUTEN_CLIENT_ID,
  //           client_secret: process.env.RAKUTEN_CLIENT_SECRET,
  //           scope,
  //         });

  //         console.log(`Attempting token refresh with scope: ${scope}`);

  //         const tokenResponse = await axios.post(tokenUrl, tokenParams, {
  //           headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  //         });

  //         accessToken = tokenResponse.data.access_token;
  //         newRefreshToken = tokenResponse.data.refresh_token;
  //         if (accessToken) {
  //           console.log(`Token refresh successful with scope: ${scope}`);
  //           break;
  //         }
  //       } catch (scopeError) {
  //         console.error(`Token refresh failed with scope ${scope}:`, scopeError.response?.data || scopeError.message);
  //         if (scope === scopes[1]) throw scopeError; // Rethrow if both scopes fail
  //       }
  //     }

  //     if (!accessToken) throw new Error('Failed to obtain access token with any scope');

  //     // Update .env if new refresh token received
  //     if (newRefreshToken && newRefreshToken !== process.env.RAKUTEN_REFRESH_TOKEN) {
  //       try {
  //         const envPath = path.join(process.cwd(), '.env');
  //         let envContent = fs.readFileSync(envPath, 'utf8');
  //         envContent = envContent.replace(/RAKUTEN_REFRESH_TOKEN=.*/, `RAKUTEN_REFRESH_TOKEN=${newRefreshToken}`);
  //         fs.writeFileSync(envPath, envContent);
  //         console.log('Updated .env with new refresh token');
  //       } catch (envError) {
  //         console.warn('Failed to update .env file:', envError.message);
  //       }
  //     }

  //     // Step 2: Fetch coupons
  //     const couponUrl = 'https://api.linksynergy.com/coupon/1.0';
  //     const couponParams = {
  //       sid: process.env.RAKUTEN_PUBLISHER_SID,
  //       // Optional: network: 'US', category: 'coupon'
  //     };

  //     console.log('Coupon Request Params:', couponParams);

  //     const couponResponse = await axios.get(couponUrl, {
  //       headers: {
  //         Authorization: `Bearer ${accessToken}`,
  //         Accept: 'application/json',
  //       },
  //       params: couponParams,
  //     });

  //     const coupons = couponResponse.data?.coupon || couponResponse.data?.coupons || [];

  //     return res.json({
  //       error: false,
  //       message: 'Coupons retrieved successfully',
  //       count: coupons.length,
  //       coupons,
  //     });
  //   } catch (error) {
  //     console.error('Error in coupon function:', {
  //       message: error.message,
  //       response: error.response?.data,
  //       status: error.response?.status,
  //     });

  //     if (error.message.includes('Converting circular structure to JSON')) {
  //       return res.status(500).json({
  //         error: true,
  //         message: 'Circular structure error in response. Ensure response does not include raw axios response objects.',
  //       });
  //     }

  //     if (error.response?.status === 400 && error.response?.data?.error_description?.includes('Invalid refresh_token')) {
  //       const authUrl = `https://api.linksynergy.com/oauth2/authorize?client_id=${process.env.RAKUTEN_CLIENT_ID}&redirect_uri=${process.env.RAKUTEN_REDIRECT_URI}&response_type=code&scope=publisher`;
  //       return res.status(400).json({
  //         error: true,
  //         message: 'Invalid refresh token. To generate a new one:\n' +
  //           `1. Open this URL in a browser: ${authUrl}\n` +
  //           '2. Log in, authorize, and get the code from the redirect URL.\n' +
  //           '3. Send the code to your /callback endpoint (setup required, see below).\n' +
  //           '4. The /callback will save the refresh_token to .env.\n' +
  //           'Example /callback route:\n' +
  //           'app.get("/callback", async (req, res) => {\n' +
  //           '  const { code } = req.query;\n' +
  //           '  if (!code) return res.status(400).send("No code provided");\n' +
  //           '  try {\n' +
  //           '    const response = await axios.post("https://api.linksynergy.com/token", ' +
  //           'new URLSearchParams({ grant_type: "authorization_code", code, ' +
  //           'client_id: process.env.RAKUTEN_CLIENT_ID, client_secret: process.env.RAKUTEN_CLIENT_SECRET, ' +
  //           'redirect_uri: process.env.RAKUTEN_REDIRECT_URI, scope: "publisher" }), ' +
  //           '{ headers: { "Content-Type": "application/x-www-form-urlencoded" } });\n' +
  //           '    const { refresh_token } = response.data;\n' +
  //           '    fs.writeFileSync(path.join(process.cwd(), ".env"), ' +
  //           '`RAKUTEN_REFRESH_TOKEN=${refresh_token}\\n`, { flag: "a" });\n' +
  //           '    res.send("Refresh token saved to .env");\n' +
  //           '  } catch (error) { res.status(500).send(error.response?.data || error.message); }\n' +
  //           '});',
  //         details: error.response?.data,
  //       });
  //     }

  //     return res.status(500).json({
  //       error: true,
  //       message: error.response?.data?.message || error.message || 'Internal Server Error',
  //       details: error.response?.data,
  //     });
  //   }
  // }

  async country(req, res, next) {
    try {
      const { groupCountry, region, country } = req.query;
      const response = {};

      // If groupCountry is provided, group the countries by region
      if (groupCountry) {
        const groupCountry = await Country.aggregate([
          {
            $group: {
              _id: '$region',
              countries: { $push: { name: '$name', countryCode: '$countryCode', flag: '$flag' } }, // Push country details to the array
            },
          },
          {
            $sort: { _id: 1 },
          },
        ]);

        response['groupCountry'] = groupCountry;
      }

      if (region) {
        response['regionCountry'] = await Country.find({ region: region });
      }

      if (country) {
        response['country'] = await Country.find({});
      }

      return res.json({ error: false, response });
    } catch (error) {
      return this.handleError(next, error.message, 500);
    }
  }

  async type(req, res, next) {
    try {
      const types = await Type.find({ status: true }).select('name');
      return res.json({ error: false, types });
    } catch (error) {
      return this.handleError(next, error.message, 500);
    }
  }

  async nationality(req, res, next) {
    try {
      const nationalities = await Nationality.find({ status: true }).select('name');
      return res.json({ error: false, nationalities });
    } catch (error) {
      return this.handleError(next, error.message, 500);
    }
  }

  async category(req, res, next) {
    const { type } = req.query;

    try {
      const filter = { status: true, isDeleted: false };

      if (type) {
        const categoryType = await Type.findOne({ name: type });
        if (type) {
          filter.typeId = categoryType._id;
        }
      }
      console.log(filter);

      const categories = await Category.find(filter).select('name');
      return res.json({ error: false, categories });
    } catch (error) {
      return this.handleError(next, error.message, 500);
    }
  }

  async subCategory(req, res, next) {
    try {
      const filter = { status: true, isDeleted: false };

      if (req.query.categoryId) {
        filter.categoryId = req.query.categoryId;
      }

      if (req.query.category) {
        const category = await Category.findOne({
          name: req.query.category,
          status: true,
          isDeleted: false,
        }).select('name');
        console.log(category, req.query.category);

        if (!category) {
          return res.json({ error: false, subCategories: [] });
        }

        filter.categoryId = category._id;
      }
      console.log(filter);

      const subCategories = await SubCategory.find(filter).select('name ');

      return res.json({ error: false, subCategories });
    } catch (error) {
      return this.handleError(next, error.message, 500);
    }
  }

  async brand(req, res, next) {
    const { category } = req.query;
    try {
      const filter = { status: true, isDeleted: false };
      if (category) filter.category = category;

      const brands = await Brand.find(filter).select('name');
      return res.json({ error: false, brands });
    } catch (error) {
      return this.handleError(next, error.message, 500);
    }
  }

  async religion(req, res, next) {
    try {
      const religions = await Religion.find({ status: true }).select('name');
      return res.json({ error: false, religions });
    } catch (error) {
      return this.handleError(next, error.message, 500);
    }
  }

  async company(req, res, next) {
    try {
      const companies = await Company.find({ status: true }).select('name');
      return res.json({ error: false, companies });
    } catch (error) {
      return this.handleError(next, error.message, 500);
    }
  }

  async make(req, res, next) {
    try {
      const { type = 'CAR' } = req.query;

      const makes = await Make.find({ status: true, type }).select('name');
      return res.json({ error: false, data: makes });
    } catch (error) {
      return this.handleError(next, error.message, 500);
    }
  }

  async model(req, res, next) {
    try {
      const { makeId } = req.query;

      const filters = { status: true };

      if (makeId) {
        filters.makeId = makeId;
      }

      const models = await Model.find(filters).select('name');
      return res.json({ error: false, data: models });
    } catch (error) {
      return this.handleError(next, error.message, 500);
    }
  }

  async getConfig(req, res, next) {
    try {
      const config = await Config.findOne().select('logo themeColor -_id');
      return res.json({ error: false, data: config });
    } catch (error) {
      return this.handleError(next, error.message, 500);
    }
  }

  async cities(req, res, next) {
    try {
      const { country, capital, minPopulation, name } = req.query;
      const filter = { status: true, isDeleted: false };

      // Filter by country (using countryCode)
      if (country) {
        const countryDoc = await Country.findOne({ countryCode: country.toLowerCase() });
        if (countryDoc) {
          filter.country = countryDoc._id;
        } else {
          return res.json({ error: false, cities: [] });
        }
      }

      // Filter by capital (true/false)
      if (capital !== undefined) {
        filter.capital = capital === 'true';
      }

      // Filter by minimum population
      if (minPopulation) {
        const population = parseInt(minPopulation, 10);
        if (!isNaN(population)) {
          filter.population = { $gte: population };
        }
      }

      // Filter by name (case-insensitive partial match)
      if (name) {
        filter.name = { $regex: name, $options: 'i' };
      }

      const cities = await City.find(filter).select('name zone lat lng').populate('country', 'name countryCode region').limit(500);

      return res.json({ error: false, cities });
    } catch (error) {
      return this.handleError(next, error.message, 500);
    }
  }

  async translateContent(req, res, next) {
    try {
      const { json, from, to } = req.body;

      if (!json || !from || !to) {
        return res.status(400).json({ error: true, message: 'Missing required fields: json, from, to' });
      }

      const translated = await this.translateRecursive(json, from, to);
      return res.json(translated);
    } catch (error) {
      return this.handleError(next, error.message, 500);
    }
  }
}

export default new CommonController();
