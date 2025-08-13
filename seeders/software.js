import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import Software from '../models/Software.js';
import Category from '../models/Category.js';
import SubCategory from '../models/SubCategory.js';
import Type from '../models/Type.js';

dotenv.config();

const BATCH_SIZE = 100; // Set batch size for insertions

// Read and deduplicate software data from JSON files
const platforms = ['Android', 'Mac', 'Windows', 'iOS'];
const softwareData = [];
const seenEntries = new Set(); // Track unique entries by slug and version

for (const platform of platforms) {
  const rawData = fs.readFileSync(`seeders/${platform}.json`);
  const platformData = JSON.parse(rawData).map((item) => ({ ...item, platform }));

  for (const item of platformData) {
    const key = `${item.slug}-${item.version}-${item.platform}`; // Unique key for deduplication
    if (!seenEntries.has(key)) {
      seenEntries.add(key);
      softwareData.push(item);
    }
  }
}

// Save deduplicated data to output.json
fs.writeFileSync('seeders/output.json', JSON.stringify(softwareData, null, 2));
console.log(`🗂️ Deduplicated data saved to seeders/output.json (${softwareData.length} unique entries)`);

// Maps to cache categories, subcategories, and types to avoid redundant DB calls
const categoryMap = new Map();
const subCategoryMap = new Map();
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
      // Get or create category based on the platform (Android, Mac, Windows, iOS)
      let category = categoryMap.get(item.platform);
      if (!category) {
        category = await Category.findOne({ name: item.platform }).select('_id');
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
            name: item.platform,
            status: true,
          });
          console.log(`🆕 Created new category: ${item.platform}`);
        }
        categoryMap.set(item.platform, category); // Cache the category result
      }

      // Get or create subcategory based on the category field in the data
      let subCategory = subCategoryMap.get(item.category);
      if (!subCategory) {
        subCategory = await SubCategory.findOne({ name: item.category, categoryId: category._id }).select('_id');
        if (!subCategory) {
          let type = typeMap.get('Software');
          if (!type) {
            type = await Type.findOne({ name: 'Software' }).select('_id');
            if (!type) {
              type = await Type.create({ name: 'Software', slug: 'software' });
            }
            typeMap.set('Software', type); // Cache the type result
          }

          subCategory = await SubCategory.create({
            adminId: null,
            typeId: type._id,
            categoryId: category._id,
            name: item.category,
            status: true,
            isDeleted: false,
            order: 1,
          });
          console.log(`🆕 Created new subcategory: ${item.category} under ${item.platform}`);
        }
        subCategoryMap.set(item.category, subCategory); // Cache the subcategory result
      }

      // Format software object
      const formatted = {
        adminId: null,
        categoryId: category._id,
        subCategoryId: subCategory._id,

        name: item.name,
        slug: item.slug,
        overview: item.overview,
        logo: item.logo || '',
        download: item.download,

        releaseDate: new Date(item.releaseDate),
        lastUpdate: item.lastUpdate ? new Date(item.lastUpdate) : new Date(),

        version: item.version,
        operatingSystem: Array.isArray(item.operatingSystem) ? item.operatingSystem : [item.operatingSystem],

        size: Math.floor(Math.random() * 500) + 100, // Size in MB
        tag: Array.isArray(item.tag) ? item.tag : [item.tag],
        downloadCount: parseInt(item.downloadCount.replace(/,/g, '')) || 0,

        status: true,
        isDeleted: false,
        wishList: [],
      };

      // Check if the software already exists in the database (slug + version)
      // const exists = await Software.findOne({ slug: item.slug, version: item.version, categoryId: category._id });
      // if (exists) {
      //   console.log(`⚠️ Skipped (already exists in DB): ${item.name} v${item.version} ${category._id}`);
      //   continue; // Skip this software if it already exists
      // }

      // Add formatted software to the batch
      batchData.push(formatted);

      // If the batch size is reached, insert the data in bulk
      if (batchData.length >= BATCH_SIZE) {
        await Software.insertMany(batchData);
        added += batchData.length;
        console.log(`✅ Inserted ${batchData.length} softwares into the database, total added: ${added}`);
        batchData.length = 0; // Clear the batch after insertion
      }
    }

    // Insert any remaining data that wasn't inserted in the last batch
    if (batchData.length > 0) {
      await Software.insertMany(batchData);
      added += batchData.length;
      console.log(`✅ Inserted ${batchData.length} softwares into the database, total added: ${added}`);
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
