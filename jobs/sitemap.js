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
// POSTAL CODES → ONLY ITS OWN COUNTRY SUBDOMAIN + EXTRA PAGES
// ==================================================================
const generatePostalCodeSitemaps = async (allFiles) => {
  logger.info('🔄 Fetching postal codes...');

  const postals = await PostalCode.find({ isDeleted: false, status: true }).populate('countryId', 'countryCode').lean();

  logger.info(`📦 Total postal codes fetched: ${postals.length}`);

  // Group: country → state → area
  const grouped = {};

  postals.forEach((pc) => {
    const country = pc.countryId.countryCode.toLowerCase();

    if (!grouped[country]) grouped[country] = {};
    if (!grouped[country][pc.stateSlug]) grouped[country][pc.stateSlug] = new Set();
    grouped[country][pc.stateSlug].add(pc.areaSlug);
  });

  // 1) Generate original batch sitemaps (existing behavior)
  const countryGroups = {};
  postals.forEach((pc) => {
    const country = pc.countryId.countryCode.toLowerCase();

    if (!countryGroups[country]) countryGroups[country] = [];
    countryGroups[country].push(pc);
  });

  for (const subdomain of Object.keys(countryGroups)) {
    await processInBatches(countryGroups[subdomain], 'postalcodes', subdomain, allFiles);
  }

  // 2) Generate extra pages sitemap (NEW)
  for (const country of Object.keys(grouped)) {
    const urls = [];

    // PAGE 1: /postal-codes
    urls.push(`https://${country}.informreaders.com/postal-codes`);

    // PAGE 2: /postal-codes/:stateSlug
    Object.keys(grouped[country]).forEach((stateSlug) => {
      urls.push(`https://${country}.informreaders.com/postal-codes/${stateSlug}`);

      // PAGE 3: /postal-codes/:stateSlug/:areaSlug
      grouped[country][stateSlug].forEach((areaSlug) => {
        urls.push(`https://${country}.informreaders.com/postal-codes/${stateSlug}/${areaSlug}`);
      });
    });

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (loc) => `
  <url>
    <loc>${loc}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`,
  )
  .join('')}
</urlset>`;

    const fileName = `sitemap-postalcodes-extra-${country}.xml`;

    await Sitemap.findOneAndUpdate(
      { fileName },
      {
        fileName,
        type: 'postalcodes-extra',
        country,
        batch: 0,
        xmlContent: xml,
      },
      { upsert: true },
    );

    allFiles.push(fileName);
    logger.info(`📦 Extra postal sitemap saved: ${fileName}`);
  }
};

// ==================================================================
// BANK CODES → ONLY ITS OWN COUNTRY SUBDOMAIN + EXTRA PAGES
// ==================================================================
const generateBankCodeSitemaps = async (allFiles) => {
  logger.info('🔄 Fetching bank codes...');

  const banks = await BankCode.find({ isDeleted: false, status: true }).populate('countryId', 'countryCode').lean();

  logger.info(`📦 Total bank codes fetched: ${banks.length}`);

  // Group: country → bankSlug → branchSlug
  const grouped = {};

  banks.forEach((bc) => {
    if (!bc.countryId || !bc.countryId.countryCode) {
      logger.warn(`⚠️ Skipped BankCode with missing countryId: ${bc._id}`);
      return;
    }

    const country = bc.countryId.countryCode.toLowerCase();

    if (!grouped[country]) grouped[country] = {};
    if (!grouped[country][bc.bankSlug]) grouped[country][bc.bankSlug] = new Set();
    grouped[country][bc.bankSlug].add(bc.branchSlug);
  });

  // 1) Generate original batch-wise sitemaps (existing)
  const countryGroups = {};
  banks.forEach((bc) => {
    const country = bc.countryId.countryCode.toLowerCase();
    if (!countryGroups[country]) countryGroups[country] = [];
    countryGroups[country].push(bc);
  });

  for (const subdomain of Object.keys(countryGroups)) {
    await processInBatches(countryGroups[subdomain], 'bankcodes', subdomain, allFiles);
  }

  // 2) Generate EXTRA PAGES sitemaps (NEW)
  for (const country of Object.keys(grouped)) {
    const urls = [];

    // PAGE 1: /bank-codes
    urls.push(`https://${country}.informreaders.com/bank-codes`);

    // PAGE 2: /bank-codes/:bankSlug
    Object.keys(grouped[country]).forEach((bankSlug) => {
      urls.push(`https://${country}.informreaders.com/bank-codes/${bankSlug}`);

      // PAGE 3: /bank-codes/:bankSlug/:branchSlug
      grouped[country][bankSlug].forEach((branchSlug) => {
        urls.push(`https://${country}.informreaders.com/bank-codes/${bankSlug}/${branchSlug}`);
      });
    });

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (loc) => `
  <url>
    <loc>${loc}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`,
  )
  .join('')}
</urlset>`;

    const fileName = `sitemap-bankcodes-extra-${country}.xml`;

    await Sitemap.findOneAndUpdate(
      { fileName },
      {
        fileName,
        type: 'bankcodes-extra',
        country,
        batch: 0,
        xmlContent: xml,
      },
      { upsert: true },
    );

    allFiles.push(fileName);
    logger.info(`📦 Extra bank sitemap saved: ${fileName}`);
  }
};

// ==================================================================
// SOFTWARE EXTRA PAGES → ALL COUNTRIES
// ==================================================================
const generateSoftwareExtraSitemaps = async (softwares, allFiles) => {
  logger.info('🔄 Generating software extra pages...');

  if (!softwares.length) {
    logger.warn('⚠️ No software records found!');
    return;
  }

  // Group by country → subCategorySlug
  const grouped = {};

  softwares.forEach((sw) => {
    const subCategorySlug = sw.subCategoryId?.slug;
    if (!subCategorySlug) return;

    // Software is global across all supported countries
    Object.keys(supportedCountries).forEach((country) => {
      if (!grouped[country]) grouped[country] = new Set();
      grouped[country].add(subCategorySlug);
    });
  });

  // Generate XML per country
  for (const country of Object.keys(grouped)) {
    const urls = [];

    // PAGE 1: /software
    urls.push(`https://${country}.informreaders.com/software`);

    // PAGE 2: /software/:subCategorySlug
    grouped[country].forEach((slug) => {
      urls.push(`https://${country}.informreaders.com/software/${slug}`);
    });

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (loc) => `
  <url>
    <loc>${loc}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`,
  )
  .join('')}
</urlset>`;

    const fileName = `sitemap-software-extra-${country}.xml`;

    await Sitemap.findOneAndUpdate(
      { fileName },
      {
        fileName,
        type: 'software-extra',
        country,
        batch: 0,
        xmlContent: xml,
      },
      { upsert: true },
    );

    allFiles.push(fileName);
    logger.info(`📦 Extra software sitemap saved: ${fileName}`);
  }
};

// ==================================================================
// BABY NAMES EXTRA PAGES → ALL COUNTRIES
// ==================================================================
const generateBabyNamesExtraSitemaps = async (names, allFiles) => {
  logger.info('🔄 Generating baby names extra pages...');

  if (!names.length) {
    logger.warn('⚠️ No baby names found!');
    return;
  }

  // -----------------------------
  // GROUP RELIGION (categorySlug)
  // -----------------------------
  const religionSlugs = new Set();

  names.forEach((n) => {
    if (n.categoryId?.slug) {
      religionSlugs.add(n.categoryId.slug);
    }
  });

  // -----------------------------
  // ALPHABETS A–Z
  // -----------------------------
  const alphabets = 'abcdefghijklmnopqrstuvwxyz'.split('');

  // -----------------------------
  // Generate per country
  // -----------------------------
  for (const country of Object.keys(supportedCountries)) {
    const urls = [];

    // 1) /baby-names
    urls.push(`https://${country}.informreaders.com/baby-names`);

    // 2) /baby-names/religion/:categorySlug
    religionSlugs.forEach((slug) => {
      urls.push(`https://${country}.informreaders.com/baby-names/religion/${slug}`);
    });

    // 3) /baby-names/letter/boys-starting-with-:alphabet
    alphabets.forEach((a) => {
      urls.push(`https://${country}.informreaders.com/baby-names/letter/boys-starting-with-${a}`);
    });

    // 4) /baby-names/letter/girls-starting-with-:alphabet
    alphabets.forEach((a) => {
      urls.push(`https://${country}.informreaders.com/baby-names/letter/girls-starting-with-${a}`);
    });

    // -----------------------------
    // Build XML
    // -----------------------------
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (loc) => `
  <url>
    <loc>${loc}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`,
  )
  .join('')}
</urlset>`;

    const fileName = `sitemap-babynames-extra-${country}.xml`;

    await Sitemap.findOneAndUpdate(
      { fileName },
      {
        fileName,
        type: 'babynames-extra',
        country,
        batch: 0,
        xmlContent: xml,
      },
      { upsert: true },
    );

    allFiles.push(fileName);
    logger.info(`📦 Extra baby names sitemap saved: ${fileName}`);
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

    // Baby Names extra pages
    await generateBabyNamesExtraSitemaps(names, allFiles);

    // Software → All countries
    const softwares = await Software.find({ isDeleted: false, status: true }).populate('subCategoryId', 'slug').lean();
    await generateForAllCountries(softwares, 'software', allFiles);

    // Software extra pages
    await generateSoftwareExtraSitemaps(softwares, allFiles);

    // Global index
    await generateGlobalSitemapIndex();

    logger.info('🎉 All sitemaps generated successfully!');
  } catch (err) {
    logger.error(`❌ Error generating sitemaps: ${err.message}`);
  }
};
