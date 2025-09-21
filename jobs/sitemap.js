import mongoose from 'mongoose';
import axios from 'axios';
import dotenv from 'dotenv';
import Name from '../models/Name.js';
import Software from '../models/Software.js';
import PostalCode from '../models/PostalCode.js';
import BankCode from '../models/BankCode.js';
import Country from '../models/Country.js';
import Sitemap from '../models/Sitemap.js';
import { fileURLToPath } from 'url';
import path from 'path';
import logger from "../logger.js"; 

dotenv.config();

const BATCH_SIZE = 20000;
const MAX_DOC_SIZE = 14 * 1024 * 1024; // 14 MB safe cap

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
  path: path.resolve(__dirname, '../.env'),
});

const supportedCountries = {
  ae: 'ar',
  af: 'ps',
  al: 'sq',
  am: 'hy',
  ao: 'pt',
  ar: 'es',
  at: 'de',
  au: 'en',
  az: 'az',
  ba: 'bs',
  bd: 'bn',
  be: 'nl',
  bf: 'fr',
  bg: 'bg',
  bh: 'ar',
  bj: 'fr',
  bn: 'ms',
  br: 'pt',
  bt: 'dz',
  bw: 'en',
  by: 'be',
  ca: 'en',
  cd: 'fr',
  cf: 'fr',
  cg: 'fr',
  ch: 'de',
  ci: 'fr',
  cl: 'es',
  cm: 'fr',
  cn: 'zh',
  co: 'es',
  cv: 'pt',
  cy: 'el',
  cz: 'cs',
  de: 'de',
  dj: 'fr',
  dk: 'da',
  dz: 'ar',
  ee: 'et',
  eg: 'ar',
  er: 'ti',
  es: 'es',
  et: 'am',
  fi: 'fi',
  fj: 'en',
  fr: 'fr',
  ga: 'fr',
  ge: 'ka',
  gh: 'en',
  gm: 'en',
  gn: 'fr',
  gq: 'es',
  gr: 'el',
  gw: 'pt',
  hr: 'hr',
  hu: 'hu',
  id: 'id',
  ie: 'en',
  il: 'he',
  in: 'hi',
  iq: 'ar',
  ir: 'fa',
  is: 'is',
  it: 'it',
  jo: 'ar',
  jp: 'ja',
  ke: 'en',
  kh: 'km',
  ki: 'en',
  kr: 'ko',
  kw: 'ar',
  kz: 'kk',
  la: 'lo',
  lk: 'ta',
  lr: 'en',
  ls: 'en',
  lt: 'lt',
  lu: 'fr',
  lv: 'lv',
  ma: 'ar',
  md: 'ro',
  me: 'sr',
  mg: 'fr',
  mk: 'mk',
  ml: 'fr',
  mm: 'my',
  mn: 'mn',
  mt: 'mt',
  mu: 'en',
  mv: 'dv',
  mw: 'en',
  mx: 'es',
  my: 'ms',
  mz: 'pt',
  na: 'en',
  ne: 'fr',
  ng: 'en',
  nl: 'nl',
  no: 'no',
  np: 'ne',
  nr: 'na',
  nz: 'en',
  om: 'ar',
  pe: 'es',
  pg: 'en',
  ph: 'tl',
  pk: 'ur',
  pl: 'pl',
  pt: 'pt',
  qa: 'ar',
  ro: 'ro',
  rs: 'sr',
  ru: 'ru',
  rw: 'rw',
  sa: 'ar',
  sb: 'en',
  sc: 'en',
  sd: 'ar',
  se: 'sv',
  sg: 'en',
  si: 'sl',
  sk: 'sk',
  sl: 'en',
  sn: 'fr',
  so: 'so',
  ss: 'en',
  st: 'pt',
  sy: 'ar',
  sz: 'en',
  td: 'fr',
  th: 'th',
  tj: 'tg',
  tm: 'tk',
  tn: 'ar',
  to: 'to',
  tr: 'tr',
  tv: 'tv',
  tz: 'sw',
  ua: 'uk',
  ug: 'en',
  uk: 'en',
  us: 'en',
  uz: 'uz',
  vn: 'vi',
  vu: 'bi',
  ws: 'sm',
  ye: 'ar',
  za: 'en',
  zm: 'en',
  zw: 'en',
};

// ================== HELPERS ==================
function buildXml(type, country, items) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${items
  .map((item) => {
    let loc = '';
    if (type === 'names') {
      loc = `https://${country}.informreaders.com/names/${item.slug}`;
    } else if (type === 'software') {
      loc = `https://${country}.informreaders.com/software/${item.slug}`;
    } else if (type === 'postalcodes') {
      const countrySlug = item.countryId?.slug || country;
      const statePart = item.state ? encodeURIComponent(item.state) : '';
      loc = `https://${countrySlug}.informreaders.com/postalcode/${countrySlug}/${statePart}/${item.slug}`;
    } else if (type === 'swiftcodes') {
      const countrySlug = item.countryId?.slug || country;
      loc = `https://${countrySlug}.informreaders.com/swiftcode/${countrySlug}/${item.slug}`;
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

const processInBatches = async (docs, type, country, allFiles) => {
  let batch = 1;
  let i = 0;

  while (i < docs.length) {
    let currentBatchSize = BATCH_SIZE;
    let chunk = docs.slice(i, i + currentBatchSize);

    let xml = buildXml(type, country, chunk);

    // shrink batch until XML fits
    while (Buffer.byteLength(xml, 'utf-8') > MAX_DOC_SIZE && currentBatchSize > 1000) {
      currentBatchSize = Math.floor(currentBatchSize / 2);
      chunk = docs.slice(i, i + currentBatchSize);
      xml = buildXml(type, country, chunk);
    }

    const fileName = `sitemap-${type}-${country}-batch-${batch}.xml`;

    await Sitemap.findOneAndUpdate({ fileName }, { fileName, type, country, batch, xmlContent: xml }, { upsert: true, new: true });

    logger.info(`✅ Saved ${fileName} (${chunk.length} records, size ${(Buffer.byteLength(xml, 'utf-8') / 1024 / 1024).toFixed(2)} MB)`);

    allFiles.push(fileName);
    i += currentBatchSize;
    batch++;
  }
};

const generateForAllCountries = async (docs, type, allFiles) => {
  const tasks = Object.keys(supportedCountries).map(async (country) => {
    if (docs.length === 0) {
      logger.warn(`⚠️ No ${type} records for ${country}, skipping...`);
      return;
    }
    logger.info(`📝 Generating ${type} sitemaps for ${country} (${docs.length} records)`);
    await processInBatches(docs, type, country, allFiles);
  });
  await Promise.all(tasks);
};

const generateGlobalSitemapIndex = async () => {
  const sitemaps = await Sitemap.find({}, 'fileName updatedAt').sort({ updatedAt: -1 });

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

  logger.info('📑 Generated global sitemap index in DB');
};

const pingGoogle = async (sitemapUrl) => {
  try {
    const encodedUrl = encodeURIComponent(sitemapUrl);
    await axios.get(`http://www.google.com/ping?sitemap=${encodedUrl}`);
    logger.info(`🚀 Pinged Google for ${sitemapUrl}`);
  } catch (err) {
    logger.error(`❌ Error pinging Google for ${sitemapUrl}: ${err.message}`);
  }
};

// ================== MAIN ==================
export const generateAllSitemaps = async () => {
  try {
    const allFiles = [];

    // ===== Postal Codes =====
    logger.info('🔄 Fetching postal codes...');
    const postals = await PostalCode.find({ isDeleted: false, status: true }).populate('countryId', 'slug').lean();
    logger.info(`📦 Total postal codes fetched: ${postals.length}`);
    await generateForAllCountries(postals, 'postalcodes', allFiles);

    // ===== Swift Codes =====
    logger.info('🔄 Fetching bank codes...');
    const banks = await BankCode.find({ isDeleted: false, status: true }).populate('countryId', 'slug').lean();
    logger.info(`📦 Total bank codes fetched: ${banks.length}`);
    await generateForAllCountries(banks, 'swiftcodes', allFiles);

    // ===== Names =====
    logger.info('🔄 Fetching names...');
    const names = await Name.find({ isDeleted: false, status: true }).lean();
    logger.info(`📦 Total names fetched: ${names.length}`);
    await generateForAllCountries(names, 'names', allFiles);

    // ===== Software =====
    logger.info('🔄 Fetching software...');
    const softwares = await Software.find({ isDeleted: false, status: true }).lean();
    logger.info(`📦 Total software fetched: ${softwares.length}`);
    await generateForAllCountries(softwares, 'software', allFiles);

    // ===== Global Index =====
    logger.info('🗂 Generating global sitemap index...');
    await generateGlobalSitemapIndex();

    // ===== Ping Google =====
    logger.info('📡 Pinging Google with sitemap index...');
    await pingGoogle('https://api.informreaders.com/sitemaps/sitemap-index.xml');

    logger.info('🎉 All sitemaps and global index generated successfully!');
  } catch (err) {
    logger.error(`❌ Error generating sitemaps: ${err.message}`);
  }
};
