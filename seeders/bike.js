import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import JSONStream from 'JSONStream';
import Make from '../models/Make.js';
import Category from '../models/Category.js';
import Type from '../models/Type.js';
import Vehicle from '../models/Bike.js';

dotenv.config();

const BATCH_SIZE = 100; // Set batch size for vehicle insertions only

// Helper function to normalize vehicle type
const normalizeVehicleType = (bikeType) => {
  if (!bikeType) return 'OTHER';
  const type = bikeType.toLowerCase().trim();
  if (type.includes('electricity') || type.includes('electric')) return 'ELECTRIC';
  if (type.includes('petrol') || type.includes('gasoline')) return 'PETROL';
  if (type.includes('hybrid')) return 'HYBRID';
  if (type.includes('diesel')) return 'DIESEL';
  return 'OTHER';
};

const seedBikes = async () => {
  try {
    await mongoose.connect(process.env.MONGO_DB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('🚀 Connected to MongoDB');

    // Maps to cache makes, categories, and types
    const makeMap = new Map();
    const categoryMap = new Map();
    const typeMap = new Map();

    // Array to collect bikes for batch insertion
    const bikeBatch = [];

    // Set to track unique bikes
    const existingBikes = new Set();

    // Create a read stream for the JSON file
    const stream = fs.createReadStream('seeders/bikes.json', { encoding: 'utf8' });
    const parser = JSONStream.parse('*'); // Parse each top-level array element (each make)

    parser.on('data', async (makeData) => {
      try {
        // Pause the stream to process data asynchronously
        stream.pause();

        // Process make
        let make = makeMap.get(makeData.makeName);
        if (!make) {
          make = await Make.findOne({ name: makeData.makeName }).select('_id');
          if (!make) {
            make = await Make.create({
              name: makeData.makeName,
              image: makeData.makeImage || '',
              adminId: null,
              status: true,
              isDeleted: false,
              type: 'BIKE',
            });
            console.log(`✅ Created make: ${makeData.makeName}`);
          }
          makeMap.set(makeData.makeName, make);
        }

        // Process bikes for the current make
        for (const bikeData of makeData.bikes) {
          // Check and create/get Type
          let type = typeMap.get('Vehicle');
          if (!type) {
            type = await Type.findOne({ name: 'Vehicle' }).select('_id');
            if (!type) {
              type = await Type.create({ name: 'Vehicle', slug: 'vehicle' });
              console.log(`✅ Created type: Vehicle`);
            }
            typeMap.set('Vehicle', type);
          }

          // Check and create/get Category
          let category = categoryMap.get(bikeData.category);
          if (!category) {
            category = await Category.findOne({ name: bikeData.category, typeId: type._id }).select('_id');
            if (!category) {
              category = await Category.create({
                adminId: null,
                typeId: type._id,
                name: bikeData.category,
                status: true,
                isDeleted: false,
              });
              console.log(`✅ Created category: ${bikeData.category}`);
            }
            categoryMap.set(bikeData.category, category);
          }

          // Extract year from bike_title
          let year = null;
          if (bikeData.bike_title) {
            const yearMatch = bikeData.bike_title.match(/(\d{4})/);
            if (yearMatch) {
              year = parseInt(yearMatch[1], 10);
            }
          }
          if (!year && bikeData.Year) {
            year = parseInt(bikeData.Year, 10);
          }

          if (!year) {
            console.log(`⚠️ Year not found for ${bikeData.bike_title}, skipping`);
            continue;
          }

          // Normalize vehicle type
          const vehicleType = normalizeVehicleType(bikeData.bike_type);

          // Check for existing bike
          const bikeKey = `${bikeData.bike_title}:${year}:${vehicleType}`;
          if (!existingBikes.has(bikeKey)) {
            const existingBike = await Vehicle.findOne({
              makeId: make._id,
              categoryId: category._id,
              name: bikeData.bike_title,
              year,
              vehicleType,
            });
            if (existingBike) {
              console.log(`⚠️ Skipped (already exists in DB): ${bikeData.bike_title}`);
            } else {
              bikeBatch.push({
                adminId: null,
                makeId: make._id,
                categoryId: category._id,
                name: bikeData.bike_title || 'Unknown Bike',
                year,
                vehicleType,
                image: bikeData.image || '',
                technicalSpecs: bikeData.technicalSpecs || [],
                featureAndSafety: bikeData.featureAndSafety || [],
                evsFeatures: bikeData.evsFeatures || [],
                status: true,
                isDeleted: false,
              });
              existingBikes.add(bikeKey);
            }
          }

          // Insert bikes in batches
          if (bikeBatch.length >= BATCH_SIZE) {
            await Vehicle.insertMany(bikeBatch);
            console.log(`✅ Inserted ${bikeBatch.length} bikes into the database`);
            bikeBatch.length = 0;
            existingBikes.clear();
          }
        }

        // Resume the stream after processing
        stream.resume();
      } catch (err) {
        console.error(`❌ Error processing make ${makeData.makeName}:`, err.message);
        stream.resume(); // Continue to avoid stalling
      }
    });

    parser.on('end', async () => {
      // Insert remaining bikes
      if (bikeBatch.length > 0) {
        await Vehicle.insertMany(bikeBatch);
        console.log(`✅ Inserted ${bikeBatch.length} bikes into the database`);
      }
      await mongoose.disconnect();
      console.log('🔌 Disconnected from MongoDB');
      process.exit(0);
    });

    parser.on('error', async (err) => {
      console.error('❌ JSON Parsing Error:', err.message);
      await mongoose.disconnect();
      process.exit(1);
    });

    stream.pipe(parser);
  } catch (error) {
    console.error('❌ Error seeding bikes:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
};

seedBikes();
