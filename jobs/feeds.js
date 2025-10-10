import fs from 'fs';
import csv from 'csv-parser';
import Parser from 'rss-parser';
import cron from 'node-cron';

import Article from '../models/Article.js';
import Country from '../models/Country.js';
import Type from '../models/Type.js';
import Category from '../models/Category.js';

import { fetchAndSaveCurrencyRates } from '../utils/fetchCurrency.js';
import { fetchAndSaveMetalPrices } from '../utils/fetchMetalPrice.js';
import { generateAllSitemaps } from './sitemap.js';

import { runSyncJob } from './merchant.js';
import { runCouponSync } from './coupon.js';
import { runOfferSync } from './offer.js';
import { runAdvertiserSync } from './advertiser.js';

import * as cheerio from 'cheerio';

import logger from '../logger.js';

const parser = new Parser();

function parseCsv(filePath) {
  return new Promise((resolve, reject) => {
    const feeds = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => feeds.push(row))
      .on('end', () => resolve(feeds))
      .on('error', (err) => {
        logger.error(`[CSV] Failed to parse file ${filePath}: ${err.message}`);
        reject(err);
      });
  });
}

function cleanContentSnippet(snippet, removeSources = false) {
  const lines = snippet
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const uniqueLines = [...new Set(lines)];

  if (removeSources) {
    return uniqueLines.map((line) => line.replace(/\s{2,}.*$/, '').replace(/\s*[-|–]\s*.*$/, ''));
  }

  return uniqueLines.join(' ');
}

async function startCron() {
  try {
    const feeds = await parseCsv('./jobs/google_news_rss.csv');
    logger.info(`[Init] Loaded ${feeds.length} RSS feed entries.`);

    const countryMap = new Map();
    const categoryMap = new Map();

    const type = await Type.findOne({ name: 'News' });
    if (!type) throw new Error("Type 'News' not found in database.");

    const categories = await Category.find({ typeId: type._id });
    const countries = await Country.find();

    categories.forEach((category) => {
      categoryMap.set(category.name.toLowerCase(), category);
    });

    countries.forEach((country) => {
      countryMap.set(country.countryCode.toUpperCase(), country);
    });

    // News fetching cron job
    cron.schedule('0 */4 * * *', async () => {
      logger.info(`[Cron] Running feed fetch at ${new Date().toISOString()}`);

      for (const feed of feeds) {
        const feedUrl = feed['RSS Feed URL'];
        const feedCategoryName = feed['Category']?.trim() || 'General';
        const countryCode = feed['Country Code']?.toUpperCase();
        const country = countryMap.get(countryCode);

        if (!country) {
          logger.warn(`[Warn] Country code '${countryCode}' not found. Skipping feed: ${feedUrl}`);
          continue;
        }

        try {
          const parsed = await parser.parseURL(feedUrl);
          logger.info(`[Feed] Parsed ${parsed.items.length} items from ${feedUrl}`);

          for (const item of parsed.items) {
            try {
              const existing = await Article.findOne({
                link: item.link,
                country: country._id,
              });
              if (existing) {
                logger.debug(`[Skip] Article already exists: ${item.title} [${countryCode}]`);
                continue;
              }

              let category = categoryMap.get(feedCategoryName.toLowerCase());
              if (!category) {
                logger.info(`[Info] Creating new category: ${feedCategoryName}`);
                category = await Category.create({
                  adminId: null,
                  typeId: type._id,
                  name: feedCategoryName,
                });
                categoryMap.set(feedCategoryName.toLowerCase(), category);
              }

              let imageUrl = null;

              for (const [key, value] of Object.entries(item)) {
                if (typeof value === 'string' && value.includes('<img')) {
                  const $ = cheerio.load(value);
                  const imgTag = $('img').first(); // pick first <img>
                  if (imgTag && imgTag.attr('src')) {
                    imageUrl = imgTag.attr('src');
                    logger.info(`[Image] Found in key "${key}": ${imageUrl}`);
                    break; // stop after first match
                  }
                }
              }

              const articleData = {
                title: item.title,
                link: item.link,
                pubDate: item.pubDate ? new Date(item.pubDate) : new Date(),
                country: country._id,
                category: category._id,
                content: cleanContentSnippet(item.contentSnippet),
                source: feed['source'] || 'Google',
                type: feedCategoryName === 'Crypto' ? 'blog' : 'news',
                image: imageUrl,
              };

              await Article.create(articleData);
              logger.info(`[Add] Article added: ${item.title}`);
            } catch (createErr) {
              if (createErr.code === 11000) {
                logger.warn(`[Duplicate] Skipped duplicate article: ${item.link} [${countryCode}]`);
              } else {
                logger.error(`[Error] Failed to save article '${item.title}': ${createErr.message}`);
              }
            }
          }
        } catch (feedErr) {
          logger.error(`[Error] Failed to fetch or parse feed: ${feedUrl} - ${feedErr.message}`);
        }
      }
      logger.info(`[Cron] Finished news cycle at ${new Date().toISOString()}`);
    });

    // Currency cron job
    cron.schedule('0 0 * * *', () => {
      logger.info(`[Cron] Running Currency fetch at ${new Date().toISOString()}`);
      fetchAndSaveCurrencyRates();
    });

    // Metals cron job
    cron.schedule('0 0 * * *', () => {
      logger.info(`[Cron] Running Metals fetch at ${new Date().toISOString()}`);
      fetchAndSaveMetalPrices();
    });

    // Sitemap cron job
    cron.schedule('0 0 * * *', () => {
      logger.info(`[Cron] Running Sitemap generation at ${new Date().toISOString()}`);
      generateAllSitemaps();
    });

    // Merchant sync cron job
    cron.schedule('0 */4 * * *', () => {
      logger.info(`[Cron] Running Merchant sync job at ${new Date().toISOString()}`);
      runSyncJob();
    });

    // Coupon sync cron job
    cron.schedule('0 */2 * * *', () => {
      logger.info(`[Cron] Running Coupon sync job at ${new Date().toISOString()}`);
      runCouponSync();
    });

    // Coupon sync cron job
    cron.schedule('0 */2 * * *', () => {
      logger.info(`[Cron] Running Coupon sync job at ${new Date().toISOString()}`);
      runOfferSync();
    });

    // Coupon sync cron job
    cron.schedule('0 */2 * * *', () => {
      logger.info(`[Cron] Running Coupon sync job at ${new Date().toISOString()}`);
      runAdvertiserSync();
    });


  } catch (err) {
    logger.error(`[Startup Error] ${err.message}`);
  }
}

export default startCron;
