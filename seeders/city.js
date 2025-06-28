import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import csvParser from 'csv-parser';
import City from '../models/City.js';
import Country from '../models/Country.js';

dotenv.config();

const BATCH_SIZE = 100;

const isCapital = (capitalValue) => {
    if (!capitalValue) return false;
    const value = capitalValue.toLowerCase().trim();
    return value === 'primary' || value === 'admin';
};

const seedCities = async () => {
    try {
        await mongoose.connect(process.env.MONGO_DB_URL, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('🚀 Connected to MongoDB');

        const countryMap = new Map();
        const cityBatch = [];
        const existingCities = new Set();
        const rows = [];

        // Step 1: Read and buffer all CSV data
        await new Promise((resolve, reject) => {
            fs.createReadStream('seeders/worldcities.csv')
                .pipe(csvParser())
                .on('data', (row) => rows.push(row))
                .on('end', resolve)
                .on('error', reject);
        });

        console.log(`📦 Loaded ${rows.length} rows from CSV`);

        // Step 2: Process and insert in batches
        for (const row of rows) {
            try {
                const iso2 = row.iso2?.toLowerCase();
                const cityKey = `${row.city}:${row.lat}:${row.lng}`;

                if (existingCities.has(cityKey)) continue;

                let country = countryMap.get(iso2);
                if (!country) {
                    country = await Country.findOne({ countryCode: iso2 }).select('_id');
                    if (!country) {
                        console.log(`⚠️ Skipped ${row.city}: ISO2 ${iso2} not found`);
                        continue;
                    }
                    countryMap.set(iso2, country);
                }

                cityBatch.push({
                    name: row.city,
                    lat: parseFloat(row.lat) || 0,
                    lng: parseFloat(row.lng) || 0,
                    country: country._id,
                    capital: isCapital(row.capital),
                    population: isNaN(parseInt(row.population, 10)) ? 0 : parseInt(row.population, 10),
                    status: true,
                    isDeleted: false,
                });
                existingCities.add(cityKey);

                if (cityBatch.length >= BATCH_SIZE) {
                    try {
                        await City.insertMany(cityBatch, { ordered: false });
                        console.log(`✅ Inserted batch of ${cityBatch.length}`);
                    } catch (insertErr) {
                        console.error('❌ Insert error:', insertErr?.writeErrors?.map(e => e.err?.errmsg) || insertErr.message);
                    }
                    cityBatch.length = 0;
                }
            } catch (err) {
                console.error(`❌ Error processing ${row.city || 'unknown'}:`, err.message);
            }
        }

        // Insert remaining cities
        if (cityBatch.length > 0) {
            try {
                await City.insertMany(cityBatch, { ordered: false });
                console.log(`✅ Inserted final batch of ${cityBatch.length}`);
            } catch (insertErr) {
                console.error('❌ Final insert error:', insertErr?.writeErrors?.map(e => e.err?.errmsg) || insertErr.message);
            }
        }

        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
        process.exit(0);
    } catch (error) {
        console.error('❌ Seeder failed:', error.message);
        await mongoose.disconnect();
        process.exit(1);
    }
};

seedCities();
