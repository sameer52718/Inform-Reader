import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import Name from '../models/Name.js';
import Religion from '../models/Religion.js';
import Category from '../models/Category.js';
import Type from '../models/Type.js';

dotenv.config();

const BATCH_SIZE = 500; // Set batch size for insertions

const seedNames = async () => {
  try {
    await mongoose.connect(process.env.MONGO_DB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('🚀 Connected to MongoDB');

    // Read the JSON file and parse it
    const rawData = fs.readFileSync('seeders/baby_names.json');
    const namesData = JSON.parse(rawData);

    // Maps to cache religions, categories, and types to avoid redundant DB calls
    const religionMap = new Map();
    const categoryMap = new Map();
    const typeMap = new Map();
    let added = 0;
    // Set to track unique names
    const existingNamesSet = new Set();

    // Array to collect the names to insert in batches
    const batchData = [];

    for (const item of namesData) {
      // Check and get religion from map or database
      let religion = religionMap.get(item.religion || 'Unknown');
      if (!religion) {
        religion = await Religion.findOne({ name: item.religion || 'Unknown' }).select('_id');
        if (!religion) {
          religion = await Religion.create({ name: item.religion || 'Unknown', status: false });
        }
        religionMap.set(item.religion, religion); // Cache the result
      }

      // Check and get category from map or database
      let category = categoryMap.get(item.categoryName);
      if (!category) {
        category = await Category.findOne({ name: item.categoryName }).select('_id');
        if (!category) {
          let type = typeMap.get('Name');
          if (!type) {
            type = await Type.findOne({ name: 'Name' }).select('_id');
            if (!type) {
              type = await Type.create({ name: 'Name', slug: 'name' });
            }
            typeMap.set('Name', type); // Cache the type result
          }

          category = await Category.create({
            adminId: null,
            typeId: type._id,
            name: item.categoryName,
            status: false,
          });
        }
        categoryMap.set(item.categoryName, category); // Cache the category result
      }

      const formattedName = {
        adminId: null, // Optionally set admin if available
        religionId: religion._id,
        categoryId: category._id,
        name: item.name,
        initialLetter: item.name[0].toUpperCase(),
        shortMeaning: item.shortMeaning,
        longMeaning: item.longMeaning,
        gender: item.gender?.toUpperCase() === 'BOY' ? 'MALE' : item.gender?.toUpperCase() === 'GIRL' ? 'FEMALE' : 'OTHER',
        origion: item.origin,
        shortName: item.shortName || 'NO',
        nameLength: item.name.length,
      };

      batchData.push(formattedName);

      // Skip the name if it's already been added to the batch or exists in the database
      // if (existingNamesSet.has(item.name)) {
      //   console.log(`⚠️ Skipped (already exists in batch): ${item.name}`);
      //   continue; // Skip this iteration if the name is already in the set
      // }

      // const existing = await Name.findOne({ name: item.name });
      // if (existing) {
      //   console.log(`⚠️ Skipped (already exists in DB): ${item.name}`);
      // } else {
      //   batchData.push(formattedName); // Collect the data in the batch array
      //   existingNamesSet.add(item.name); // Add name to the set to ensure uniqueness
      //   // console.log(`✅ Queued for insertion: ${item.name}`);
      // }

      // If the batch size is reached, insert the data in bulk
      if (batchData.length >= BATCH_SIZE) {
        await Name.insertMany(batchData);
        added = added + BATCH_SIZE;
        console.log(`✅ Inserted ${batchData.length} names into the database , ${added}`);
        batchData.length = 0; // Clear the batch after insertion
        existingNamesSet.clear(); // Clear the set after batch insert
      }
    }

    // Insert any remaining data that wasn't inserted in the last batch
    if (batchData.length > 0) {
      await Name.insertMany(batchData);
      console.log(`✅ Inserted ${batchData.length} names into the database`);
    }

    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit();
  } catch (error) {
    console.error('❌ Error seeding names:', error.message);
    process.exit(1);
  }
};

seedNames();
