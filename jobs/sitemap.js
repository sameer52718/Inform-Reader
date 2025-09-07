import mongoose from "mongoose";
import fs from "fs/promises";
import path from "path";
import axios from "axios";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import Name from "../models/Name.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env (one folder back from current file)
dotenv.config({
  path: path.resolve(__dirname, "../.env"),
});

const BATCH_SIZE = 5000;
const PUBLIC_DIR = path.join(__dirname, "../public/sitemaps");

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

const generateSitemap = async (country, batch, items) => {
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${items
  .map(
    (item) => `
  <url>
    <loc>https://${country}.informreaders.com/names/${item.slug}</loc>
    <lastmod>${new Date(item.updatedAt).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`
  )
  .join("")}
</urlset>`;

  const fileName = `sitemap-names-${country}-batch-${batch}.xml`;
  const filePath = path.join(PUBLIC_DIR, fileName);

  await fs.mkdir(PUBLIC_DIR, { recursive: true });
  await fs.writeFile(filePath, sitemap);

  console.log(`✅ Generated sitemap batch ${batch} for ${country} with ${items.length} names`);
  return fileName; // return just file name for index
};

const generateSitemapIndex = async (country, sitemapFiles) => {
  const index = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapFiles
  .map(
    (file) => `
  <sitemap>
    <loc>https://api.informreaders.com/sitemaps/${file}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
  </sitemap>`
  )
  .join("")}
</sitemapindex>`;

  const fileName = `sitemap-names-${country}-index.xml`;
  const filePath = path.join(PUBLIC_DIR, fileName);

  await fs.writeFile(filePath, index);
  console.log(`📑 Generated sitemap index for ${country}: ${fileName}`);
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

// ================== MAIN ==================
const generateAllSitemaps = async () => {
  try {
    await mongoose.connect(process.env.MONGO_DB_URL);


    for (const country of supportedCountries) {
      console.log(`🔄 Generating sitemaps for ${country}...`);

      const cursor = Name.find({ isDeleted: false, status: true }).cursor();
      let batch = 1;
      let chunk = [];
      const sitemapFiles = [];

      for await (const doc of cursor) {
        chunk.push(doc);
        if (chunk.length === BATCH_SIZE) {
          const fileName = await generateSitemap(country, batch, chunk);
          sitemapFiles.push(fileName);
          chunk = [];
          batch++;
        }
      }

      // last chunk
      if (chunk.length > 0) {
        const fileName = await generateSitemap(country, batch, chunk);
        sitemapFiles.push(fileName);
      }

      // Generate index
      const indexFile = await generateSitemapIndex(country, sitemapFiles);

      // Ping Google only once with index
      await pingGoogle(`https://api.informreaders.com/sitemaps/${indexFile}`);
    }

    console.log("🎉 All sitemaps and indexes generated successfully!");
  } catch (err) {
    console.error("❌ Error generating sitemaps:", err);
  } finally {
    await mongoose.disconnect();
  }
};

generateAllSitemaps();