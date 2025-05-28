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

const parser = new Parser();

function parseCsv(filePath) {
  return new Promise((resolve, reject) => {
    const feeds = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => feeds.push(row))
      .on('end', () => resolve(feeds))
      .on('error', reject);
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
    console.log(`[Init] Loaded ${feeds.length} RSS feed entries.`);

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

    // Uncomment when ready to schedule:
    // cron.schedule('0 0 * * *', async () => {
    //   console.log(`[Cron] Running feed fetch at ${new Date().toISOString()}`);
    //   for (const feed of feeds) {
    //     const feedUrl = feed['RSS Feed URL'];
    //     const feedCategoryName = feed['Category']?.trim() || 'General';
    //     const countryCode = feed['Country Code']?.toUpperCase();
    //     const country = countryMap.get(countryCode);

    //     if (!country) {
    //       console.warn(`[Warn] Country code '${countryCode}' not found. Skipping feed: ${feedUrl}`);
    //       continue;
    //     }

    //     try {
    //       const parsed = await parser.parseURL(feedUrl);
    //       console.log(`[Feed] Parsed ${parsed.items.length} items from ${feedUrl}`);

    //       for (const item of parsed.items) {
    //         try {
    //           const existing = await Article.findOne({ link: item.link, country: country._id });
    //           if (existing) {
    //             console.log(`[Skip] Article already exists: ${item.title} [${countryCode}]`);
    //             continue;
    //           }

    //           let category = categoryMap.get(feedCategoryName.toLowerCase());
    //           if (!category) {
    //             console.log(`[Info] Creating new category: ${feedCategoryName}`);
    //             category = await Category.create({
    //               adminId: null,
    //               typeId: type._id,
    //               name: feedCategoryName,
    //             });
    //             categoryMap.set(feedCategoryName.toLowerCase(), category);
    //           }

    //           const articleData = {
    //             title: item.title,
    //             link: item.link,
    //             pubDate: item.pubDate ? new Date(item.pubDate) : new Date(),
    //             country: country._id,
    //             category: category._id,
    //             content: cleanContentSnippet(item.contentSnippet),
    //             source: feed['source'] || 'Google',
    //           };

    //           await Article.create(articleData);
    //           console.log(`[Add] Article added: ${item.title}`);
    //         } catch (createErr) {
    //           if (createErr.code === 11000) {
    //             console.warn(`[Duplicate] Skipped duplicate article: ${item.link} [${countryCode}]`);
    //           } else {
    //             console.error(`[Error] Failed to save article '${item.title}': ${createErr.message}`);
    //           }
    //         }
    //       }
    //     } catch (feedErr) {
    //       console.error(`[Error] Failed to fetch or parse feed: ${feedUrl} - ${feedErr.message}`);
    //     }
    //   }
    //   console.log(`[Cron] Finished cycle at ${new Date().toISOString()}`);
    // });
    cron.schedule('0 0 * * *', () => {
      console.log(`[Cron] Running Currency fetch at ${new Date().toISOString()}`);

      fetchAndSaveCurrencyRates();
    });

    cron.schedule('0 0 * * *', () => {
      console.log(`[Cron] Running Metals fetch at ${new Date().toISOString()}`);

      fetchAndSaveMetalPrices();
    });
  } catch (err) {
    console.error(`[Startup Error] ${err.message}`);
  }
}

export default startCron;
