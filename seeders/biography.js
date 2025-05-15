// import mongoose from 'mongoose';
// import dotenv from 'dotenv';
// import fs from 'fs';
// import Biography from '../models/Biography.js';
// import Nationality from '../models/Nationality.js';
// import Category from '../models/Category.js';

// dotenv.config();

// const rawData = fs.readFileSync('seeders/biographies.json');
// const biographies = JSON.parse(rawData);

// const BATCH_SIZE = 500;
// const categoryMap = new Map();
// const nationalityMap = new Map();
// const batch = [];

// const normalizeField = (str) =>
//     str.toLowerCase().replace(/\s+/g, '').replace(/[^a-z]/g, '');

// const getCategory = async (name) => {
//     if (categoryMap.has(name)) return categoryMap.get(name);
//     let category = await Category.findOne({ name }).select('_id');
//     if (!category) {
//         category = await Category.create({ name });
//     }
//     categoryMap.set(name, category);
//     return category;
// };

// const getNationality = async (name) => {
//     if (nationalityMap.has(name)) return nationalityMap.get(name);
//     let nationality = await Nationality.findOne({ name }).select('_id');
//     if (!nationality) {
//         nationality = await Nationality.create({ name, countryCode: 'Not Set' });
//     }
//     nationalityMap.set(name, nationality);
//     return nationality;
// };

// const biographyExists = async (name, categoryId, nationalityId) => {
//     return await Biography.exists({ name, categoryId, nationalityId });
// };

// const seedBiographies = async () => {
//     try {
//         await mongoose.connect(process.env.MONGO_DB_URL, {
//             useNewUrlParser: true,
//             useUnifiedTopology: true,
//         });

//         console.log('🚀 Connected to MongoDB');

//         for (const item of biographies) {
//             const category = await getCategory(item.category || 'General');
//             const nationality = await getNationality(item.nationality || 'Unknown');

//             const alreadyExists = await biographyExists(item.name, category._id, nationality._id);
//             if (alreadyExists) {
//                 console.log(`⚠️ Biography already exists: ${item.name}`);
//                 continue;
//             }

//             const bioDoc = {
//                 name: item.name,
//                 description: item.description,
//                 religion: item.religion || 'Unknown',
//                 image: item.image,
//                 categoryId: category._id,
//                 nationalityId: nationality._id,
//                 generalInformation: item.generalInformation || [],
//             };

//             batch.push(bioDoc);

//             if (batch.length >= BATCH_SIZE) {
//                 await Biography.insertMany(batch, { ordered: false });
//                 console.log(`✅ Inserted ${batch.length} biographies`);
//                 batch.length = 0;
//             }
//         }

//         if (batch.length > 0) {
//             await Biography.insertMany(batch, { ordered: false });
//             console.log(`✅ Inserted remaining ${batch.length} biographies`);
//         }

//         await mongoose.disconnect();
//         console.log('🔌 Disconnected from MongoDB');
//         process.exit();
//     } catch (error) {
//         console.error('❌ Error inserting biographies:', error.message);
//         process.exit(1);
//     }
// };

// seedBiographies();

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import Biography from '../models/Biography.js';
import Nationality from '../models/Nationality.js';
import Category from '../models/Category.js';
import Type from '../models/Type.js';

dotenv.config();

const BATCH_SIZE = 500;
const categoryMap = new Map();
const nationalityMap = new Map();
const existingNamesSet = new Set(); // Track duplicates in-batch
const batch = [];

const seedBiographies = async () => {
  try {
    await mongoose.connect(process.env.MONGO_DB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('🚀 Connected to MongoDB');

    const rawData = fs.readFileSync('seeders/biographies.json');
    const biographies = JSON.parse(rawData);

    const type = await Type.findOne({ name: 'Biography' }).select('_id');

    for (const item of biographies) {
      const categoryName = item.category || 'General';
      const nationalityName = item.nationality || 'Unknown';

      // Get or create category
      let category = categoryMap.get(categoryName);
      if (!category) {
        category = await Category.findOne({ name: categoryName, typeId: type?._id }).select('_id');
        if (!category) {
          category = await Category.create({ name: categoryName, status: false, typeId: type?._id });
        }
        categoryMap.set(categoryName, category);
      }

      // Get or create nationality
      let nationality = nationalityMap.get(nationalityName);
      if (!nationality) {
        nationality = await Nationality.findOne({ name: nationalityName }).select('_id');
        if (!nationality) {
          nationality = await Nationality.create({ name: nationalityName, countryCode: 'Not Set' });
        }
        nationalityMap.set(nationalityName, nationality);
      }

      // Unique key to track duplicates
      const uniqueKey = `${item.name}-${category._id}-${nationality._id}`;
      if (existingNamesSet.has(uniqueKey)) {
        console.log(`⚠️ Skipped (duplicate in batch): ${item.name}`);
        continue;
      }

      // Skip if already exists in DB
      //   const exists = await Biography.exists({
      //     name: item.name,
      //     categoryId: category._id,
      //     nationalityId: nationality._id,
      //   });
      //   if (exists) {
      //     console.log(`⚠️ Skipped (already in DB): ${item.name}`);
      //     continue;
      //   }

      const bioDoc = {
        adminId: null, // Can be updated to real adminId if available
        name: item.name,
        description: item.description,
        religion: item.religion || 'Unknown',
        image: item.image || '',
        categoryId: category._id,
        nationalityId: nationality._id,
        generalInformation: item.generalInformation || [],
      };

      batch.push(bioDoc);
      existingNamesSet.add(uniqueKey);

      if (batch.length >= BATCH_SIZE) {
        await Biography.insertMany(batch, { ordered: false });
        console.log(`✅ Inserted ${batch.length} biographies`);
        batch.length = 0;
        existingNamesSet.clear(); // Reset batch uniqueness tracking
      }
    }

    if (batch.length > 0) {
      await Biography.insertMany(batch, { ordered: false });
      console.log(`✅ Inserted remaining ${batch.length} biographies`);
    }

    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit();
  } catch (error) {
    console.error('❌ Error inserting biographies:', error.message);
    process.exit(1);
  }
};

seedBiographies();
