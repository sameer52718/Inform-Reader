import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import Biography from '../models/Biography.js';
import Nationality from '../models/Nationality.js';
import Category from '../models/Category.js';
import SubCategory from '../models/SubCategory.js';
import Type from '../models/Type.js';

dotenv.config();

const BATCH_SIZE = 50;

// Client-defined categories and subcategories with order
const clientCategories = [
  { name: 'Celebrities & Entertainment Industry', order: 1 },
  { name: 'Business Tycoons & Entrepreneurs', order: 2 },
  { name: 'Sports Personalities', order: 3 },
  { name: 'Political Figures & Historical Leaders', order: 4 },
  { name: 'Scientists & Innovators', order: 5 },
  { name: 'Artists & Writers', order: 6 },
  { name: 'Social Activists & Humanitarians', order: 7 },
  { name: 'Royalty & Influential Families', order: 8 },
  { name: 'Media Personalities & Journalists', order: 9 },
  { name: 'Religious & Spiritual Leaders', order: 10 },
  { name: 'Social Media Influencers', order: 11 },
];

const clientSubCategories = [
  // Celebrities & Entertainment Industry
  { name: 'Actors/Actresses', category: 'Celebrities & Entertainment Industry', order: 1 },
  { name: 'Singers/Musicians', category: 'Celebrities & Entertainment Industry', order: 2 },
  { name: 'TV Personalities/Reality Show Stars', category: 'Celebrities & Entertainment Industry', order: 3 },
  { name: 'Social Media Influencers/YouTubers/TikTokers', category: 'Celebrities & Entertainment Industry', order: 4 },
  // Business Tycoons & Entrepreneurs
  { name: 'Corporate CEOs', category: 'Business Tycoons & Entrepreneurs', order: 5 },
  { name: 'Startup Founders', category: 'Business Tycoons & Entrepreneurs', order: 6 },
  { name: 'Tech Entrepreneurs', category: 'Business Tycoons & Entrepreneurs', order: 7 },
  { name: 'Investors/Philanthropists', category: 'Business Tycoons & Entrepreneurs', order: 8 },
  // Sports Personalities
  { name: 'Cricketers', category: 'Sports Personalities', order: 9 },
  { name: 'Footballers', category: 'Sports Personalities', order: 10 },
  { name: 'Tennis Players', category: 'Sports Personalities', order: 11 },
  { name: 'Basketball Players/Athletes', category: 'Sports Personalities', order: 12 },
  // Political Figures & Historical Leaders
  { name: 'Presidents/Prime Ministers', category: 'Political Figures & Historical Leaders', order: 13 },
  { name: 'Political Activists', category: 'Political Figures & Historical Leaders', order: 14 },
  { name: 'Historical Leaders', category: 'Political Figures & Historical Leaders', order: 15 },
  { name: 'Monarchs/Rulers', category: 'Political Figures & Historical Leaders', order: 16 },
  // Scientists & Innovators
  { name: 'Scientists', category: 'Scientists & Innovators', order: 17 },
  { name: 'Inventors', category: 'Scientists & Innovators', order: 18 },
  { name: 'Tech Pioneers', category: 'Scientists & Innovators', order: 19 },
  { name: 'Researchers/Academics', category: 'Scientists & Innovators', order: 20 },
  // Artists & Writers
  { name: 'Painters/Sculptors', category: 'Artists & Writers', order: 21 },
  { name: 'Authors/Novelists', category: 'Artists & Writers', order: 22 },
  { name: 'Poets', category: 'Artists & Writers', order: 23 },
  { name: 'Playwrights/Filmmakers', category: 'Artists & Writers', order: 24 },
  // Social Activists & Humanitarians
  { name: 'Civil Rights Activists', category: 'Social Activists & Humanitarians', order: 25 },
  { name: 'Environmentalists', category: 'Social Activists & Humanitarians', order: 26 },
  { name: 'Human Rights Advocates', category: 'Social Activists & Humanitarians', order: 27 },
  { name: 'Charity Workers', category: 'Social Activists & Humanitarians', order: 28 },
  // Royalty & Influential Families
  { name: 'Kings/Queens', category: 'Royalty & Influential Families', order: 29 },
  { name: 'Princes/Princesses', category: 'Royalty & Influential Families', order: 30 },
  { name: 'Noble Families', category: 'Royalty & Influential Families', order: 31 },
  { name: 'Business Dynasties', category: 'Royalty & Influential Families', order: 32 },
  // Media Personalities & Journalists
  { name: 'News Anchors', category: 'Media Personalities & Journalists', order: 33 },
  { name: 'Talk Show Hosts', category: 'Media Personalities & Journalists', order: 34 },
  { name: 'Columnists', category: 'Media Personalities & Journalists', order: 35 },
  { name: 'Reporters', category: 'Media Personalities & Journalists', order: 36 },
  // Religious & Spiritual Leaders
  { name: 'Religious Founders', category: 'Religious & Spiritual Leaders', order: 37 },
  { name: 'Spiritual Gurus', category: 'Religious & Spiritual Leaders', order: 38 },
  { name: 'Philosophers', category: 'Religious & Spiritual Leaders', order: 39 },
  { name: 'Religious Scholars', category: 'Religious & Spiritual Leaders', order: 40 },
  // Social Media Influencers
  { name: 'Facebook', category: 'Social Media Influencers', order: 41 },
  { name: 'Youtube', category: 'Social Media Influencers', order: 42 },
  { name: 'Tiktok', category: 'Social Media Influencers', order: 43 },
  { name: 'Other Social Media Platforms', category: 'Social Media Influencers', order: 44 },
];

// Mapping for JSON categories to client categories and subcategories
const categoryNameMap = {
  actor: 'Celebrities & Entertainment Industry',
  actress: 'Celebrities & Entertainment Industry',
  singer: 'Celebrities & Entertainment Industry',
  rapper: 'Celebrities & Entertainment Industry',
  guitarist: 'Celebrities & Entertainment Industry',
  musician: 'Celebrities & Entertainment Industry',
  models: 'Celebrities & Entertainment Industry',
  comedian: 'Celebrities & Entertainment Industry',
  dj: 'Celebrities & Entertainment Industry',
  dancer: 'Celebrities & Entertainment Industry',
  'tv personality': 'Celebrities & Entertainment Industry',
  magician: 'Celebrities & Entertainment Industry',
  influencer: 'Social Media Influencers',
  youtuber: 'Social Media Influencers',
  tiktoker: 'Social Media Influencers',
  'social media star': 'Social Media Influencers',
  ceo: 'Business Tycoons & Entrepreneurs',
  'startup founder': 'Business Tycoons & Entrepreneurs',
  entrepreneur: 'Business Tycoons & Entrepreneurs',
  investor: 'Business Tycoons & Entrepreneurs',
  philanthropist: 'Business Tycoons & Entrepreneurs',
  cricketer: 'Sports Personalities',
  footballer: 'Sports Personalities',
  'tennis player': 'Sports Personalities',
  'basketball player': 'Sports Personalities',
  athlete: 'Sports Personalities',
  president: 'Political Figures & Historical Leaders',
  'prime minister': 'Political Figures & Historical Leaders',
  'political activist': 'Political Figures & Historical Leaders',
  'historical leader': 'Political Figures & Historical Leaders',
  Politician: 'Political Figures & Historical Leaders',
  monarch: 'Royalty & Influential Families',
  ruler: 'Royalty & Influential Families',
  scientist: 'Scientists & Innovators',
  inventor: 'Scientists & Innovators',
  'tech pioneer': 'Scientists & Innovators',
  researcher: 'Scientists & Innovators',
  academic: 'Scientists & Innovators',
  painter: 'Artists & Writers',
  sculptor: 'Artists & Writers',
  author: 'Artists & Writers',
  novelist: 'Artists & Writers',
  poet: 'Artists & Writers',
  playwright: 'Artists & Writers',
  filmmaker: 'Artists & Writers',
  chef: 'Artists & Writers',
  'civil rights activist': 'Social Activists & Humanitarians',
  environmentalist: 'Social Activists & Humanitarians',
  'human rights advocate': 'Social Activists & Humanitarians',
  'charity worker': 'Social Activists & Humanitarians',
  king: 'Royalty & Influential Families',
  queen: 'Royalty & Influential Families',
  prince: 'Royalty & Influential Families',
  princess: 'Royalty & Influential Families',
  'noble family': 'Royalty & Influential Families',
  'business dynasty': 'Royalty & Influential Families',
  'news anchor': 'Media Personalities & Journalists',
  'talk show host': 'Media Personalities & Journalists',
  columnist: 'Media Personalities & Journalists',
  reporter: 'Media Personalities & Journalists',
  journalist: 'Media Personalities & Journalists',
  'religious founder': 'Religious & Spiritual Leaders',
  'spiritual guru': 'Religious & Spiritual Leaders',
  philosopher: 'Religious & Spiritual Leaders',
  'religious scholar': 'Religious & Spiritual Leaders',
};

const subCategoryNameMap = {
  actor: 'Actors/Actresses',
  actress: 'Actors/Actresses',
  singer: 'Singers/Musicians',
  musician: 'Singers/Musicians',
  singer: 'Singers/Musicians',
  rapper: 'Singers/Musicians',
  guitarist: 'Singers/Musicians',
  musician: 'Singers/Musicians',
  models: 'Actors/Actresses',
  comedian: 'Actors/Actresses',
  dj: 'Singers/Musicians',
  dancer: 'Singers/Musicians',
  magician: 'Singers/Musicians',
  'tv personality': 'TV Personalities/Reality Show Stars',
  'reality show star': 'TV Personalities/Reality Show Stars',
  influencer: 'Social Media Influencers/YouTubers/TikTokers',
  youtuber: 'Social Media Influencers/YouTubers/TikTokers',
  tiktoker: 'Social Media Influencers/YouTubers/TikTokers',
  ceo: 'Corporate CEOs',
  'startup founder': 'Startup Founders',
  entrepreneur: 'Tech Entrepreneurs',
  investor: 'Investors/Philanthropists',
  philanthropist: 'Investors/Philanthropists',
  cricketer: 'Cricketers',
  footballer: 'Footballers',
  'tennis player': 'Tennis Players',
  'basketball player': 'Basketball Players/Athletes',
  athlete: 'Basketball Players/Athletes',
  fitness: 'Basketball Players/Athletes',
  president: 'Presidents/Prime Ministers',
  'prime minister': 'Presidents/Prime Ministers',
  'political activist': 'Political Activists',
  'historical leader': 'Historical Leaders',
  monarch: 'Monarchs/Rulers',
  ruler: 'Monarchs/Rulers',
  scientist: 'Scientists',
  inventor: 'Inventors',
  'tech pioneer': 'Tech Pioneers',
  researcher: 'Researchers/Academics',
  academic: 'Researchers/Academics',
  painter: 'Painters/Sculptors',
  sculptor: 'Painters/Sculptors',
  author: 'Authors/Novelists',
  novelist: 'Authors/Novelists',
  poet: 'Poets',
  playwright: 'Playwrights/Filmmakers',
  filmmaker: 'Playwrights/Filmmakers',
  'civil rights activist': 'Civil Rights Activists',
  environmentalist: 'Environmentalists',
  'human rights advocate': 'Human Rights Advocates',
  'charity worker': 'Charity Workers',
  king: 'Kings/Queens',
  queen: 'Kings/Queens',
  prince: 'Princes/Princesses',
  princess: 'Princes/Princesses',
  'noble family': 'Noble Families',
  'business dynasty': 'Business Dynasties',
  'news anchor': 'News Anchors',
  'talk show host': 'Talk Show Hosts',
  columnist: 'Columnists',
  reporter: 'Reporters',
  'religious founder': 'Religious Founders',
  'spiritual guru': 'Spiritual Gurus',
  philosopher: 'Philosophers',
  'religious scholar': 'Religious Scholars',
  facebook: 'Facebook',
  youtube: 'Youtube',
  tiktok: 'Tiktok',
  'other social media': 'Other Social Media Platforms',
};

const normalizeField = (str) =>
  str
    ? str
        .toLowerCase()
        .replace(/\s+/g, '')
        .replace(/[^a-z0-9]/g, '')
    : '';

const seedBiographies = async () => {
  try {
    await mongoose.connect(process.env.MONGO_DB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('🚀 Connected to MongoDB');

    // Step 2: Load JSON data
    const rawData = fs.readFileSync('seeders/biographies.json');
    const biographies = JSON.parse(rawData);

    // Step 3: Create Type
    let type = await Type.findOne({ name: 'Biography' }).select('_id');
    if (!type) {
      type = await Type.create({ name: 'Biography', slug: 'biography', status: true });
      console.log('✅ Created Type: Biography');
    }
    const typeId = type._id;

    // Step 4: Create or fetch Categories
    const categoryMap = new Map();
    let maxCategoryOrder = Math.max(...clientCategories.map((c) => c.order), 0);

    // Fetch or create client-defined categories
    for (const cat of clientCategories) {
      let category = await Category.findOne({ name: cat.name, typeId: typeId }).select('_id name');
      if (!category) {
        category = await Category.create({
          name: cat.name,
          order: cat.order,
          typeId: typeId,
          adminId: null,
          status: true,
          isDeleted: false,
        });
        console.log(`✅ Created Category: ${cat.name} with order ${cat.order}`);
      } else {
        console.log(`✅ Found Category: ${cat.name} with order ${cat.order}`);
      }
      categoryMap.set(cat.name.toLowerCase(), category);
    }

    // Collect unique categories from JSON
    const jsonCategories = new Set();
    for (const item of biographies) {
      const categoryName = (item.category || '').trim();
      if (categoryName) jsonCategories.add(categoryName);
    }

    // Fetch or create new categories from JSON if not mapped
    for (const jsonCat of jsonCategories) {
      const normalizedJsonCat = jsonCat.toLowerCase();
      const mappedCatName = categoryNameMap[normalizedJsonCat] || jsonCat;
      if (!categoryMap.has(mappedCatName.toLowerCase())) {
        let category = await Category.findOne({ name: mappedCatName, typeId: typeId }).select('_id name');
        if (!category) {
          maxCategoryOrder += 1;
          category = await Category.create({
            name: mappedCatName,
            order: maxCategoryOrder,
            typeId: typeId,
            adminId: null,
            status: true,
            isDeleted: false,
          });
          console.log(`✅ Created New Category: ${mappedCatName} with order ${maxCategoryOrder}`);
        } else {
          console.log(`✅ Found New Category: ${mappedCatName} with order ${category.order}`);
        }
        categoryMap.set(mappedCatName.toLowerCase(), category);
      }
    }

    // Step 5: Create or fetch SubCategories
    const subCategoryMap = new Map();
    let maxSubCategoryOrder = Math.max(...clientSubCategories.map((sc) => sc.order), 0);

    // Fetch or create client-defined subcategories
    for (const subCat of clientSubCategories) {
      const category = categoryMap.get(subCat.category.toLowerCase());
      if (!category) {
        console.error(`❌ Category not found for SubCategory: ${subCat.name}`);
        continue;
      }
      let subCategory = await SubCategory.findOne({
        name: subCat.name,
        categoryId: category._id,
        typeId: typeId,
      }).select('_id name');
      if (!subCategory) {
        subCategory = await SubCategory.create({
          name: subCat.name,
          order: subCat.order,
          categoryId: category._id,
          typeId: typeId,
          adminId: null,
          status: true,
          isDeleted: false,
        });
        console.log(`✅ Created SubCategory: ${subCat.name} under ${subCat.category} with order ${subCat.order}`);
      } else {
        console.log(`✅ Found SubCategory: ${subCat.name} under ${subCat.category} with order ${subCat.order}`);
      }
      subCategoryMap.set(`${subCat.category.toLowerCase()}:${subCat.name.toLowerCase()}`, subCategory);
    }

    // Step 6: Process Biographies
    const nationalityMap = new Map();
    const batch = [];
    const skippedItems = [];
    const existingNamesSet = new Set();

    for (const item of biographies) {
      // Validate item
      if (!item.name || !item.category) {
        skippedItems.push({
          ...item,
          reason: 'Missing name or category',
        });
        console.warn(`⚠️ Skipped item: ${item.name || 'Unknown'} (Reason: Missing name or category)`);
        continue;
      }

      // Map category to client-defined category and subcategory
      let categoryName = item.category.trim().toLowerCase();
      const mappedCatName = categoryNameMap[categoryName] || item.category.trim();
      const category = categoryMap.get(mappedCatName.toLowerCase());
      if (!category) {
        skippedItems.push({
          ...item,
          reason: `Category not found: ${mappedCatName}`,
        });
        console.warn(`⚠️ Skipped item: ${item.name} (Reason: Category not found: ${mappedCatName})`);
        continue;
      }

      // Map JSON category to subcategory
      const mappedSubCatName = subCategoryNameMap[categoryName.toLowerCase()] || 'General';
      const subCategoryKey = `${mappedCatName.toLowerCase()}:${mappedSubCatName.toLowerCase()}`;
      let subCategory = subCategoryMap.get(subCategoryKey);

      // Create subcategory if it doesn't exist
      if (!subCategory) {
        const parentCategory = categoryMap.get(mappedCatName.toLowerCase());
        if (parentCategory) {
          maxSubCategoryOrder += 1;
          subCategory = await SubCategory.create({
            name: mappedSubCatName,
            order: maxSubCategoryOrder,
            categoryId: parentCategory._id,
            typeId: typeId,
            adminId: null,
            status: true,
            isDeleted: false,
          });
          subCategoryMap.set(subCategoryKey, subCategory);
          console.log(`✅ Created New SubCategory: ${mappedSubCatName} under ${mappedCatName} with order ${maxSubCategoryOrder}`);
        } else {
          skippedItems.push({
            ...item,
            reason: `Parent category not found for SubCategory: ${mappedSubCatName} (Category: ${mappedCatName})`,
          });
          console.warn(`⚠️ Skipped item: ${item.name} (Reason: Parent category not found for SubCategory: ${mappedSubCatName})`);
          continue;
        }
      }

      // Get or create nationality
      const nationalityName = (item.nationality || 'Unknown').trim();
      let nationality = nationalityMap.get(nationalityName);
      if (!nationality) {
        nationality = await Nationality.findOne({ name: nationalityName }).select('_id');
        if (!nationality) {
          nationality = await Nationality.create({ name: nationalityName, countryCode: 'Not Set' });
        }
        nationalityMap.set(nationalityName, nationality);
      }

      // Check for duplicates
      const uniqueKey = `${item.name}-${category._id}-${subCategory._id}-${nationality._id}`;
      if (existingNamesSet.has(uniqueKey)) {
        skippedItems.push({
          ...item,
          reason: 'Duplicate in batch',
        });
        console.warn(`⚠️ Skipped item: ${item.name} (Reason: Duplicate in batch)`);
        continue;
      }

      // Skip if already exists in DB
      const exists = await Biography.exists({
        name: item.name,
        categoryId: category._id,
        subCategoryId: subCategory._id,
        nationalityId: nationality._id,
      });
      if (exists) {
        skippedItems.push({
          ...item,
          reason: 'Already exists in database',
        });
        console.warn(`⚠️ Skipped item: ${item.name} (Reason: Already exists in database)`);
        continue;
      }

      // Prepare Biography document
      const bioDoc = {
        adminId: null,
        nationalityId: nationality._id,
        categoryId: category._id,
        subCategoryId: subCategory._id,
        name: item.name,
        description: item.description || '',
        religion: item.religion || 'Unknown',
        image: item.image || '',
        personalInformation: item.personalInformation || [],
        professionalInformation: item.professionalInformation || [],
        netWorthAndAssets: item.netWorthAndAssets || [],
        physicalAttributes: item.physicalAttributes || [],
        status: true,
        isDeleted: false,
      };

      batch.push(bioDoc);
      existingNamesSet.add(uniqueKey);

      if (batch.length >= BATCH_SIZE) {
        await Biography.insertMany(batch, { ordered: false });
        console.log(`✅ Inserted ${batch.length} biographies`);
        batch.length = 0;
        existingNamesSet.clear();
      }
    }

    // Insert remaining documents
    if (batch.length > 0) {
      await Biography.insertMany(batch, { ordered: false });
      console.log(`✅ Inserted remaining ${batch.length} biographies`);
    }

    // Step 7: Save skipped items to a JSON file
    if (skippedItems.length > 0) {
      const outputPath = path.join('seeders', 'skippedBiographies.json');
      fs.writeFileSync(outputPath, JSON.stringify(skippedItems, null, 2));
      console.log(`📝 Saved ${skippedItems.length} skipped items to ${outputPath}`);
      console.log('⚠️ Skipped items:');
      skippedItems.forEach((item) => {
        console.log(`- ${item.name || 'Unknown'} (Reason: ${item.reason}, Category: ${item.category || 'N/A'})`);
      });
    } else {
      console.log('✅ No items were skipped');
    }

    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit();
  } catch (error) {
    console.error('❌ Error seeding biographies:', error.message);
    process.exit(1);
  }
};

seedBiographies();
