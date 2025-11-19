import axios from 'axios';
import dotenv from 'dotenv';
import Name from '../models/Name.js';
import Software from '../models/Software.js';
import PostalCode from '../models/PostalCode.js';
import BankCode from '../models/BankCode.js';
import Sitemap from '../models/Sitemap.js';
import { fileURLToPath } from 'url';
import path from 'path';
import logger from '../logger.js';
import { staticPages, supportedCountries } from './data.js';

dotenv.config();

const BATCH_SIZE = 20000;
const MAX_DOC_SIZE = 14 * 1024 * 1024; // 14 MB safe cap

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
  path: path.resolve(__dirname, '../.env'),
});

// ==================================================================
// 🔵 UNIVERSAL XML BUILDER (updated to use correct subdomains)
// ==================================================================
function buildXml(type, subdomain, items) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${items
  .map((item) => {
    let loc = '';

    if (type === 'names') {
      loc = `https://${subdomain}.informreaders.com/baby-names/${item.slug}`;
    } else if (type === 'software') {
      loc = `https://${subdomain}.informreaders.com/software/${item.subCategoryId.slug}/${item.slug}`;
    } else if (type === 'postalcodes') {
      loc = `https://${subdomain}.informreaders.com/postalcode/${item.stateSlug}/${item.areaSlug}/${item.code}`;
    } else if (type === 'bankcodes') {
      loc = `https://${subdomain}.informreaders.com/bank-codes/${item.bankSlug}/${item.branchSlug}/${item.swiftCode}`;
    }

    return `
  <url>
    <loc>${loc}</loc>
    <lastmod>${new Date(item.updatedAt || Date.now()).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
  })
  .join('')}
</urlset>`;
}

// ==================================================================
// STATIC PAGES
// ==================================================================
function buildStaticPagesXml(subdomain) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticPages
  .map(
    (page) => `
  <url>
    <loc>https://${subdomain}.informreaders.com${page.path}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`,
  )
  .join('')}
</urlset>`;
}

// ==================================================================
// PROCESS BATCHES
// ==================================================================
const processInBatches = async (docs, type, subdomain, allFiles) => {
  let batch = 1;
  let i = 0;

  while (i < docs.length) {
    let currentBatchSize = BATCH_SIZE;
    let chunk = docs.slice(i, i + currentBatchSize);

    let xml = buildXml(type, subdomain, chunk);

    while (Buffer.byteLength(xml, 'utf-8') > MAX_DOC_SIZE && currentBatchSize > 1000) {
      currentBatchSize = Math.floor(currentBatchSize / 2);
      chunk = docs.slice(i, i + currentBatchSize);
      xml = buildXml(type, subdomain, chunk);
    }

    const fileName = `sitemap-${type}-${subdomain}-batch-${batch}.xml`;

    await Sitemap.findOneAndUpdate({ fileName }, { fileName, type, country: subdomain, batch, xmlContent: xml }, { upsert: true, new: true });

    logger.info(`✅ Saved ${fileName} (${chunk.length} records)`);

    allFiles.push(fileName);
    i += currentBatchSize;
    batch++;
  }
};

// ==================================================================
// BABY NAMES & SOFTWARE → ALL COUNTRIES
// ==================================================================
const generateForAllCountries = async (docs, type, allFiles) => {
  const tasks = Object.keys(supportedCountries).map(async (subdomain) => {
    if (!docs.length) return;
    await processInBatches(docs, type, subdomain, allFiles);
  });
  await Promise.all(tasks);
};

// ==================================================================
// POSTAL CODES → ONLY ITS OWN COUNTRY SUBDOMAIN
// ==================================================================
const generatePostalCodeSitemaps = async (allFiles) => {
  logger.info('🔄 Fetching postal codes...');

  const postals = await PostalCode.find({ isDeleted: false, status: true }).populate('countryId', 'countryCode').lean();

  logger.info(`📦 Total postal codes fetched: ${postals.length}`);

  const grouped = {};
  postals.forEach((pc) => {
    const subdomain = pc.countryId.countryCode.toLowerCase();
    if (!grouped[subdomain]) grouped[subdomain] = [];
    grouped[subdomain].push(pc);
  });

  for (const subdomain of Object.keys(grouped)) {
    await processInBatches(grouped[subdomain], 'postalcodes', subdomain, allFiles);
  }
};

// ==================================================================
// BANK CODES → ONLY ITS OWN COUNTRY SUBDOMAIN
// ==================================================================
const generateBankCodeSitemaps = async (allFiles) => {
  logger.info('🔄 Fetching bank codes...');

  const banks = await BankCode.find({ isDeleted: false, status: true }).populate('countryId', 'countryCode').lean();

  logger.info(`📦 Total bank codes fetched: ${banks.length}`);

  const grouped = {};

  banks.forEach((bc) => {
    if (!bc.countryId || !bc.countryId.countryCode) {
      logger.warn(`⚠️ Skipped BankCode with missing countryId: ${bc._id}`);
      return;
    }

    const subdomain = bc.countryId.countryCode.toLowerCase();

    if (!grouped[subdomain]) grouped[subdomain] = [];
    grouped[subdomain].push(bc);
  });

  for (const subdomain of Object.keys(grouped)) {
    await processInBatches(grouped[subdomain], 'bankcodes', subdomain, allFiles);
  }
};

// ==================================================================
// STATIC PAGES
// ==================================================================
const generateStaticPagesSitemap = async (allFiles) => {
  const tasks = Object.keys(supportedCountries).map(async (subdomain) => {
    const xml = buildStaticPagesXml(subdomain);
    const fileName = `sitemap-static-${subdomain}.xml`;

    await Sitemap.findOneAndUpdate({ fileName }, { fileName, type: 'static', country: subdomain, batch: 0, xmlContent: xml }, { upsert: true, new: true });

    allFiles.push(fileName);
  });

  await Promise.all(tasks);
};

// ==================================================================
// GLOBAL INDEX
// ==================================================================
const generateGlobalSitemapIndex = async () => {
  const sitemaps = await Sitemap.find({ fileName: { $ne: 'sitemap-index.xml' } }, 'fileName updatedAt').sort({ updatedAt: -1 });

  const index = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps
  .map(
    (sm) => `
  <sitemap>
    <loc>https://api.informreaders.com/sitemaps/${sm.fileName}</loc>
    <lastmod>${new Date(sm.updatedAt).toISOString()}</lastmod>
  </sitemap>`,
  )
  .join('')}
</sitemapindex>`;

  await Sitemap.findOneAndUpdate(
    { fileName: 'sitemap-index.xml' },
    { fileName: 'sitemap-index.xml', type: 'index', country: 'global', batch: 0, xmlContent: index },
    { upsert: true, new: true },
  );

  logger.info('📑 Global sitemap index generated');
};

// ==================================================================
// MAIN FUNCTION
// ==================================================================
export const generateAllSitemaps = async () => {
  try {
    const allFiles = [];

    // Static pages for all countries
    await generateStaticPagesSitemap(allFiles);

    // Postal Codes → Only own country
    await generatePostalCodeSitemaps(allFiles);

    // Bank Codes → Only own country
    await generateBankCodeSitemaps(allFiles);

    // Names → All countries
    const names = await Name.find({ isDeleted: false, status: true }).lean();
    await generateForAllCountries(names, 'names', allFiles);

    // Software → All countries
    const softwares = await Software.find({ isDeleted: false, status: true }).populate('subCategoryId', 'slug').lean();
    await generateForAllCountries(softwares, 'software', allFiles);

    // Global index
    await generateGlobalSitemapIndex();

    logger.info('🎉 All sitemaps generated successfully!');
  } catch (err) {
    logger.error(`❌ Error generating sitemaps: ${err.message}`);
  }
};
