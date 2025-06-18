import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import JSONStream from 'JSONStream';
import Make from '../models/Make.js';
import Model from '../models/Model.js';
import Category from '../models/Category.js';
import Type from '../models/Type.js';
import Vehicle from '../models/Vehicle.js';

dotenv.config();

const BATCH_SIZE = 100; // Set batch size for vehicle insertions only

// Helper function to normalize vehicle type
const normalizeVehicleType = (carType) => {
  if (!carType) return 'OTHER';
  const type = carType.toLowerCase().trim();
  if (type.includes('electricity') || type.includes('electric')) return 'ELECTRIC';
  if (type.includes('petrol') || type.includes('gasoline')) return 'PETROL';
  if (type.includes('hybrid')) return 'HYBRID';
  if (type.includes('diesel')) return 'DIESEL';
  return 'OTHER';
};

const seedVehicles = async () => {
  try {
    await mongoose.connect(process.env.MONGO_DB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('🚀 Connected to MongoDB');

    // Maps to cache makes, models, categories, and types
    const makeMap = new Map();
    const modelMap = new Map();
    const categoryMap = new Map();
    const typeMap = new Map();

    // Array to collect vehicles for batch insertion
    const vehicleBatch = [];

    // Set to track unique vehicles
    const existingVehicles = new Set();

    // Create a read stream for the JSON file
    const stream = fs.createReadStream('seeders/vehicle.json', { encoding: 'utf8' });
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
            });
            console.log(`✅ Created make: ${makeData.makeName}`);
          }
          makeMap.set(makeData.makeName, make);
        }

        // Process models for the current make
        for (const modelData of makeData.models) {
          const modelKey = `${makeData.makeName}:${modelData.modelName}`;
          let model = modelMap.get(modelKey);
          if (!model) {
            model = await Model.findOne({ name: modelData.modelName, makeId: make._id }).select('_id');
            if (!model) {
              model = await Model.create({
                adminId: null,
                makeId: make._id,
                name: modelData.modelName,
                image: modelData.modelImage || '',
                status: true,
                isDeleted: false,
              });
              console.log(`✅ Created model: ${modelData.modelName}`);
            }
            modelMap.set(modelKey, model);
          }

          // Process variants (vehicles) for the current model
          for (const variant of modelData.variants) {
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
            let category = categoryMap.get(variant.category);
            if (!category) {
              category = await Category.findOne({ name: variant.category, typeId: type._id }).select('_id');
              if (!category) {
                category = await Category.create({
                  adminId: null,
                  typeId: type._id,
                  name: variant.category,
                  status: true,
                  isDeleted: false,
                });
                console.log(`✅ Created category: ${variant.category}`);
              }
              categoryMap.set(variant.category, category);
            }

            // Extract year from car_title or start_of_production
            let year = null;
            if (variant.car_title) {
              const yearMatch = variant.car_title.match(/(\d{4})/);
              if (yearMatch) {
                year = parseInt(yearMatch[1], 10);
              }
            }
            if (!year && variant.start_of_production) {
              const yearMatch = variant.start_of_production.match(/(\d{4})/);
              if (yearMatch) {
                year = parseInt(yearMatch[1], 10);
              }
            }

            if (!year) {
              console.log(`⚠️ Year not found for ${variant.car_title}, skipping`);
              continue;
            }

            // Normalize vehicle type
            const vehicleType = normalizeVehicleType(variant.car_type);

            // Check for existing vehicle
            const vehicleKey = `${variant.car_title}:${year}:${vehicleType}`;
            if (!existingVehicles.has(vehicleKey)) {
              const existingVehicle = await Vehicle.findOne({
                makeId: make._id,
                modelId: model._id,
                categoryId: category._id,
                name: variant.car_title,
                year,
                vehicleType,
              });
              if (existingVehicle) {
                console.log(`⚠️ Skipped (already exists in DB): ${variant.car_title}`);
              } else {
                vehicleBatch.push({
                  adminId: null,
                  makeId: make._id,
                  modelId: model._id,
                  categoryId: category._id,
                  name: variant.car_title || 'Unknown Vehicle',
                  year,
                  vehicleType,
                  image: variant.image || '',
                  technicalSpecs: variant.technicalSpecs || [],
                  featureAndSafety: variant.featureAndSafety || [],
                  evsFeatures: variant.evsFeatures || [],
                  status: true,
                  isDeleted: false,
                });
                existingVehicles.add(vehicleKey);
              }
            }

            // Insert vehicles in batches
            if (vehicleBatch.length >= BATCH_SIZE) {
              await Vehicle.insertMany(vehicleBatch);
              console.log(`✅ Inserted ${vehicleBatch.length} vehicles into the database`);
              vehicleBatch.length = 0;
              existingVehicles.clear();
            }
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
      // Insert remaining vehicles
      if (vehicleBatch.length > 0) {
        await Vehicle.insertMany(vehicleBatch);
        console.log(`✅ Inserted ${vehicleBatch.length} vehicles into the database`);
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
    console.error('❌ Error seeding vehicles:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
};

seedVehicles();