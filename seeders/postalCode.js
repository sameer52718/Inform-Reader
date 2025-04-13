import mongoose from 'mongoose';
import dotenv from 'dotenv';
import PostalCode from '../models/PostalCode.js';
import Country from '../models/Country.js';
import fs from 'fs';

dotenv.config();

const rawData = fs.readFileSync('seeders/postal_codes.json');
const postalCodes = JSON.parse(rawData);

// Helper function to insert in batches
const insertInBatches = async (docs, batchSize = 500) => {
  for (let i = 0; i < docs.length; i += batchSize) {
    const batch = docs.slice(i, i + batchSize);
    await PostalCode.insertMany(batch);
    console.log(`✅ Inserted batch ${i / batchSize + 1} (${batch.length} records)`);
  }
};

const seedPostalCode = async () => {
  try {
    await mongoose.connect(process.env.MONGO_DB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('🚀 Connected to MongoDB');

    // Step 1: Get all unique country names
    const countryNames = [...new Set(postalCodes.map((entry) => entry.country))];

    // Step 2: Fetch countries by name
    const countries = await Country.find({ name: { $in: countryNames } }).select('_id name');

    // Step 3: Build country map
    const countryMap = new Map(countries.map((c) => [c.name, c._id]));

    // Step 4: Build postal code documents
    const postalCodeDocs = [];

    for (const entry of postalCodes) {
      const countryId = countryMap.get(entry.country);

      if (!countryId) {
        console.warn(`⚠️ Country not found: ${entry.country}`);
        continue;
      }

      const region = entry.region;

      if (!region || !region.postalCodes || !Array.isArray(region.postalCodes)) {
        console.warn(`⚠️ Invalid or missing region data for: ${entry.country}`);
        continue;
      }

      for (const code of region.postalCodes) {
        postalCodeDocs.push({
          countryId,
          state: region.regionName || null,
          area: code.place,
          code: code.code,
        });
      }
    }

    // Step 5: Insert in batches
    if (postalCodeDocs.length > 0) {
      await insertInBatches(postalCodeDocs, 500);
      console.log(`🎉 Finished inserting ${postalCodeDocs.length} postal codes in batches`);
    } else {
      console.log('ℹ️ No postal codes to insert');
    }
  } catch (error) {
    console.error('❌ Error seeding Postal Code data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit();
  }
};

seedPostalCode();
