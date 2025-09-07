import mongoose from 'mongoose';
import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import Name from '../models/Name.js';
import Software from '../models/Software.js';
import PostalCode from '../models/PostalCode.js';
import BankCode from '../models/BankCode.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
  path: path.resolve(__dirname, '../.env'),
});

const BATCH_SIZE = 20000;
const PUBLIC_DIR = path.join(__dirname, '../public/sitemaps');

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
const generateSitemap = async (type, country, batch, items) => {
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
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
    <lastmod>${new Date(item.updatedAt).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
  })
  .join('')}
</urlset>`;

  const fileName = `sitemap-${type}-${country}-batch-${batch}.xml`;
  const filePath = path.join(PUBLIC_DIR, fileName);

  await fs.mkdir(PUBLIC_DIR, { recursive: true });
  await fs.writeFile(filePath, sitemap);

  console.log(`✅ Generated ${type} sitemap batch ${batch} for ${country} with ${items.length} records`);
  return fileName;
};

const generateGlobalSitemapIndex = async (sitemapFiles) => {
  const index = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapFiles
  .map(
    (file) => `
  <sitemap>
    <loc>https://api.informreaders.com/sitemaps/${file}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
  </sitemap>`,
  )
  .join('')}
</sitemapindex>`;

  const fileName = 'sitemap-index.xml';
  const filePath = path.join(PUBLIC_DIR, fileName);

  await fs.writeFile(filePath, index);
  console.log(`📑 Generated global sitemap index: ${fileName}`);
  return fileName;
};

const pingGoogle = async (sitemapUrl) => {
  try {
    const encodedUrl = encodeURIComponent(sitemapUrl);
    await axios.get(`http://www.google.com/ping?sitemap=${encodedUrl}`);
    console.log(`🚀 Pinged Google for ${sitemapUrl}`);
  } catch (err) {
    console.error(`❌ Error pinging Google for ${sitemapUrl}:`, err.message);
  }
};

// ================== BATCH PROCESSOR ==================
const processInBatches = async (docs, type, country, allFiles) => {
  let batch = 1;
  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const chunk = docs.slice(i, i + BATCH_SIZE);
    const fileName = await generateSitemap(type, country, batch, chunk);
    allFiles.push(fileName);
    batch++;
  }
};

// ================== MAIN ==================
// ================== MAIN ==================
const generateAllSitemaps = async () => {
  try {
    console.log('🚀 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_DB_URL);
    console.log('✅ MongoDB connected');

    const allFiles = [];

    // ===== Names =====
    console.log('🔄 Fetching names...');
    const names = await Name.find({ isDeleted: false, status: true }).lean();
    console.log(`📦 Total names fetched: ${names.length}`);

    for (const country of Object.keys(supportedCountries)) {
        console.log(`📝 Generating name sitemaps for ${country} (${names.length} records)`);
        await processInBatches(names, 'names', country, allFiles);
    }

    // ===== Software =====
    console.log('🔄 Fetching software...');
    const softwares = await Software.find({ isDeleted: false, status: true }).lean();
    console.log(`📦 Total software fetched: ${softwares.length}`);

    for (const country of Object.keys(supportedCountries)) {
      if (softwares.length > 0) {
        console.log(`📝 Generating software sitemaps for ${country}`);
        await processInBatches(softwares, 'software', country, allFiles);
      }
    }

    // ===== Postal Codes =====
    console.log('🔄 Fetching postal codes...');
    const postals = await PostalCode.find({ isDeleted: false, status: true }).populate('countryId', 'slug').lean();
    console.log(`📦 Total postal codes fetched: ${postals.length}`);

    for (const country of Object.keys(supportedCountries)) {
      console.log(`📝 Generating postal code sitemaps for ${country} (${postals.length} records)`);
      await processInBatches(postals, 'postalcodes', country, allFiles);
    }

    // ===== Swift Codes =====
    console.log('🔄 Fetching bank codes...');
    const banks = await BankCode.find({ isDeleted: false, status: true }).populate('countryId', 'slug').lean();
    console.log(`📦 Total bank codes fetched: ${banks.length}`);

    for (const country of Object.keys(supportedCountries)) {
      console.log(`📝 Generating Swift Code sitemaps for ${country} (${banks.length} records)`);
      await processInBatches(banks, 'swiftcodes', country, allFiles);
    }

    // ===== Global Index =====
    console.log('🗂 Generating global sitemap index...');
    const indexFile = await generateGlobalSitemapIndex(allFiles);

    // ===== Ping Google =====
    console.log('📡 Pinging Google with sitemap index...');
    await pingGoogle(`https://api.informreaders.com/sitemaps/${indexFile}`);

    console.log('🎉 All sitemaps and global index generated successfully!');
  } catch (err) {
    console.error('❌ Error generating sitemaps:', err);
  } finally {
    console.log('🔌 Disconnecting MongoDB...');
    await mongoose.disconnect();
    console.log('✅ MongoDB disconnected');
  }
};

generateAllSitemaps();
