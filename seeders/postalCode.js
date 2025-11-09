import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import PostalCode from '../models/PostalCode.js';
import Country from '../models/Country.js';
import slugify from 'slugify';

dotenv.config();

const BATCH_SIZE = 500; // number of postal codes to insert at once

const seedPostalCodes = async () => {
  try {
    await mongoose.connect(process.env.MONGO_DB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('🚀 Connected to MongoDB');

    // Read JSON file (your processed GeoNames data)
    const rawData = fs.readFileSync('seeders/postalCodes.json');
    const postalCodesData = JSON.parse(rawData);

    const countryCache = new Map();
    const existingPostalCodes = new Set();
    const batch = [];
    let insertedCount = 0;

    for (const item of postalCodesData) {
      if (!item.country_code || !item.postal_code) continue; // skip incomplete

      // ✅ Get or create Country reference
      const countryCode = item.country_code.toUpperCase();

      let country = countryCache.get(countryCode);
      if (!country) {
        country = await Country.findOne({ countryCode });
        if (!country) {
          country = await Country.create({
            name: countryCode,
            slug: countryCode.toLowerCase(),
            flag: '',
            region: '',
            countryCode,
            status: false,
          });
          console.log(`🌍 Created new country: ${countryCode}`);
        }
        countryCache.set(countryCode, country);
      }

      // ✅ Avoid duplicates (in batch and DB)
      const uniqueKey = `${country._id}-${item.postal_code}`;
      if (existingPostalCodes.has(uniqueKey)) continue;
      const exists = await PostalCode.findOne({ countryId: country._id, code: item.postal_code });
      if (exists) continue;
      existingPostalCodes.add(uniqueKey);

      const cleanSlug = slugify(`${item.place_name || ''}-${item.postal_code}`, {
        lower: true,
        strict: true,
        trim: true,
      });

      // ✅ Format record for insertion
      const postalCodeDoc = {
        adminId: null,
        countryId: country._id,
        state: item.admin_name1 || '',
        area: item.place_name || '',
        code: item.postal_code,
        adminName2: item.admin_name2 || '',
        adminCode1: item.admin_code1 || '',
        adminCode2: item.admin_code2 || '',
        adminName3: item.admin_name3 || '',
        adminCode3: item.admin_code3 || '',
        latitude: item.latitude || null,
        longitude: item.longitude || null,
        accuracy: item.accuracy || 6,
        slug: cleanSlug,
      };

      batch.push(postalCodeDoc);

      // ✅ Bulk insert by batch size
      if (batch.length >= BATCH_SIZE) {
        await PostalCode.insertMany(batch);
        insertedCount += batch.length;
        console.log(`✅ Inserted ${batch.length} postal codes (total ${insertedCount})`);
        batch.length = 0;
        existingPostalCodes.clear();
      }
    }

    // Insert remaining records
    if (batch.length > 0) {
      await PostalCode.insertMany(batch);
      insertedCount += batch.length;
      console.log(`✅ Inserted final ${batch.length} postal codes`);
    }

    console.log(`🎯 Total inserted: ${insertedCount}`);
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit();
  } catch (error) {
    console.error('❌ Error seeding postal codes:', error.message);
    process.exit(1);
  }
};

seedPostalCodes();
