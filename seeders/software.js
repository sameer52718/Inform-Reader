import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import Software from '../models/Software.js';
import Category from '../models/Category.js';
import Type from '../models/Type.js';

dotenv.config();

const BATCH_SIZE = 500; // Set batch size for insertions

// Read the software data from the JSON file
const rawData = fs.readFileSync('seeders/softwares_games.json');
const softwareData = JSON.parse(rawData);

// Maps to cache categories and types to avoid redundant DB calls
const categoryMap = new Map();
const typeMap = new Map();
let added = 0;

// Array to collect the software data to insert in batches
const batchData = [];

const seedSoftware = async () => {
  try {
    await mongoose.connect(process.env.MONGO_DB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('🚀 Connected to MongoDB');

    for (const item of softwareData) {
      // Get or create category based on the operating system name
      let category = categoryMap.get(item.operatingSystem);
      if (!category) {
        category = await Category.findOne({ name: item.operatingSystem }).select('_id');

        if (!category) {
          let type = typeMap.get('Software');
          if (!type) {
            type = await Type.findOne({ name: 'Software' }).select('_id');
            if (!type) {
              type = await Type.create({ name: 'Software', slug: 'software' });
            }
            typeMap.set('Software', type); // Cache the type result
          }

          category = await Category.create({
            adminId: null,
            typeId: type._id,
            name: item.operatingSystem,
            status: true,
          });
          console.log(`🆕 Created new category: ${item.operatingSystem}`);
        }

        categoryMap.set(item.operatingSystem, category); // Cache the category result
      }

      // Format software object
      const formatted = {
        adminId: null,
        categoryId: category._id,
        subCategoryId: null,

        name: item.name,
        overview: item.overview,
        logo: item.logo || '',
        download: item.download,

        releaseDate: new Date(item.releaseDate),
        lastUpdate: item.lastUpdate ? new Date(item.lastUpdate) : new Date(),

        version: item.version,
        operatingSystem: Array.isArray(item.operatingSystem) ? item.operatingSystem : [item.operatingSystem],

        size: Math.floor(Math.random() * 500) + 100, // Size in MB
        tag: Array.isArray(item.tag) ? item.tag : [item.tag],

        status: true,
        isDeleted: false,
        wishList: [],
      };

      // Check if the software already exists (name + version)
      const exists = await Software.findOne({ name: item.name, version: item.version });
      if (exists) {
        console.log(`⚠️ Skipped (already exists): ${item.name} v${item.version}`);
        continue; // Skip this software if it already exists
      }

      // Add formatted software to the batch
      batchData.push(formatted);

      // If the batch size is reached, insert the data in bulk
      if (batchData.length >= BATCH_SIZE) {
        await Software.insertMany(batchData);
        added += BATCH_SIZE;
        console.log(`✅ Inserted ${batchData.length} softwares into the database, total added: ${added}`);
        batchData.length = 0; // Clear the batch after insertion
      }
    }

    // Insert any remaining data that wasn't inserted in the last batch
    if (batchData.length > 0) {
      await Software.insertMany(batchData);
      console.log(`✅ Inserted ${batchData.length} softwares into the database`);
    }

    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit();
  } catch (error) {
    console.error('❌ Error inserting software data:', error.message);
    process.exit(1);
  }
};

seedSoftware();
