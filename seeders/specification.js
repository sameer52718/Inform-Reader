import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import Specification from '../models/Specification.js';
import Category from '../models/Category.js';
import SubCategory from '../models/SubCategory.js';
import Brand from '../models/Brand.js';
import Type from '../models/Type.js';

dotenv.config();

const BATCH_SIZE = 500;

// Client-specified categories and subcategories with order
const clientCategories = [
  { name: 'Mobiles & Tablets', order: 1 },
  { name: 'Laptops & Computers', order: 2 },
  { name: 'Gaming', order: 3 },
  { name: 'TVs & Home Entertainment', order: 4 },
  { name: 'Cameras & Drones', order: 5 },
  { name: 'Home & Kitchen Appliances', order: 6 },
  { name: 'Printers & Office Equipment', order: 7 },
];

const clientSubCategories = [
  // Mobiles & Tablets
  { name: 'Mobile Phones', category: 'Mobiles & Tablets', order: 1 },
  { name: 'Tablets', category: 'Mobiles & Tablets', order: 2 },
  { name: 'Wearable Technology', category: 'Mobiles & Tablets', order: 3 },
  { name: 'Mobile Accessories', category: 'Mobiles & Tablets', order: 4 },
  // Laptops & Computers
  { name: 'Laptops', category: 'Laptops & Computers', order: 5 },
  { name: 'Desktop PCs', category: 'Laptops & Computers', order: 6 },
  { name: 'Components & Peripherals', category: 'Laptops & Computers', order: 7 },
  { name: 'Monitors', category: 'Laptops & Computers', order: 8 },
  { name: 'Computer Accessories', category: 'Laptops & Computers', order: 9 },
  // Gaming
  { name: 'Gaming Consoles', category: 'Gaming', order: 10 },
  { name: 'PC Gaming', category: 'Gaming', order: 11 },
  { name: 'Gaming Accessories', category: 'Gaming', order: 12 },
  // TVs & Home Entertainment
  { name: 'LED & Smart TVs', category: 'TVs & Home Entertainment', order: 13 },
  { name: 'Audio & Sound Systems', category: 'TVs & Home Entertainment', order: 14 },
  { name: 'Media Players', category: 'TVs & Home Entertainment', order: 15 },
  { name: 'Projectors', category: 'TVs & Home Entertainment', order: 16 },
  // Cameras & Drones
  { name: 'Digital Cameras', category: 'Cameras & Drones', order: 17 },
  { name: 'Action Cameras', category: 'Cameras & Drones', order: 18 },
  { name: 'Drones', category: 'Cameras & Drones', order: 19 },
  { name: 'Photography Accessories', category: 'Cameras & Drones', order: 20 },
  // Home & Kitchen Appliances
  { name: 'Large Appliances', category: 'Home & Kitchen Appliances', order: 21 },
  { name: 'Small Kitchen Appliances', category: 'Home & Kitchen Appliances', order: 22 },
  { name: 'Home Comfort & Care', category: 'Home & Kitchen Appliances', order: 23 },
  // Printers & Office Equipment
  { name: 'Printers', category: 'Printers & Office Equipment', order: 24 },
  { name: 'Scanners', category: 'Printers & Office Equipment', order: 25 },
  { name: 'Printer Supplies', category: 'Printers & Office Equipment', order: 26 },
  { name: 'Other Office Equipment', category: 'Printers & Office Equipment', order: 27 },
];

// Mapping for JSON categories to clientz categories
const categoryNameMap = {
  'led tv': 'TVs & Home Entertainment',
  drones: 'Cameras & Drones',
  printer: 'Printers & Office Equipment',
  imac: 'Laptops & Computers',
  monitors: 'Laptops & Computers',
  'air conditioners': 'Home & Kitchen Appliances',
  fridge: 'Home & Kitchen Appliances',
  refrigerators: 'Home & Kitchen Appliances',
  'washing machine': 'Home & Kitchen Appliances',
  microwaves: 'Home & Kitchen Appliances',
  'food processors': 'Home & Kitchen Appliances',
  'coffee maker': 'Home & Kitchen Appliances',
  'deep fryers': 'Home & Kitchen Appliances',
  blenders: 'Home & Kitchen Appliances',
  'sandwich makers': 'Home & Kitchen Appliances',
  kettels: 'Home & Kitchen Appliances',
  juicers: 'Home & Kitchen Appliances',
  'water dispenser': 'Home & Kitchen Appliances',
  'external drives': 'Laptops & Computers',
  headphones: 'Mvobiles & Tablets',
  'laptop chargers': 'Laptops & Computers',
  keyboards: 'Laptops & Computers',
  webcams: 'Laptops & Computers',
  mouse: 'Laptops & Computers',
  'laptop bags': 'Laptops & Computers',
  'laptop battries': 'Laptops & Computers',
  laptops: 'Laptops & Computers',
};

// Mapping for JSON subcategories to client subcategories
const subCategoryNameMap = {
  'hp gaming laptop': 'Laptops',
  'apple macbook': 'Laptops',
  'dell laptop': 'Laptops',
  'hp core i3': 'Laptops',
  'hp core i5': 'Laptops',
  'hp core i7': 'Laptops',
  'dell core i5': 'Laptops',
  'dell core i7': 'Laptops',
  lenovo: 'Laptops',
  'dell gaming laptop': 'Laptops',
  acer: 'Laptops',
  'dell core i3': 'Laptops',
  toshiba: 'Laptops',
  'lenovo core i3': 'Laptops',
  'lenovo core i5': 'Laptops',
  'lenovo core i7': 'Laptops',
  apple: 'Laptops',
  'acer gaming laptop': 'Laptops',
  'lenovo gaming laptop': 'Laptops',
  dell: 'Laptops',
  hp: 'Laptops',
  'wiwu laptopbag': 'Computer Accessories',
  'coolbell laptopbag': 'Computer Accessories',
  'aopinyou laptopbag': 'Computer Accessories',
  'poso laptopbag': 'Computer Accessories',
  'dell laptopbag': 'Computer Accessories',
  'hp laptopbag': 'Computer Accessories',
  'lenovo laptopbag': 'Computer Accessories',
  'swisswin laptopbag': 'Computer Accessories',
  'dell laptopbattries': 'Computer Accessories',
  'hp laptopbattries': 'Computer Accessories',
  'acer laptopbattries': 'Computer Accessories',
  'corsair mouse': 'Computer Accessories',
};

// Load JSON data
const rawData = fs.readFileSync('seeders/specifications.json');
const specifications = JSON.parse(rawData);

const normalizeField = (str) =>
  str
    ? str
        .toLowerCase()
        .replace(/\s+/g, '')
        .replace(/[^a-z0-9]/g, '')
    : '';

const transformGeneralData = (generalArray) => {
  const sectionMap = {
    generalspecs: 'generalSpecs',
    general: 'general',
    compatibility: 'compatibility',
    connectors: 'connectors',
    dimensions: 'dimensions',
    memory: 'memory',
    miscellaneous: 'miscellaneous',
    links: 'links',
    display: 'display',
    processor: 'processor',
    storage: 'storage',
    camera: 'camera',
    communication: 'communication',
    features: 'features',
    design: 'design',
    powersupply: 'powerSupply',
    audiofeatures: 'audioFeatures',
  };

  const data = {
    ram: null,
    storageCapacity: null,
    cameraMegapixels: null,
    batteryCapacity: null,
    screenSize: null,
    displayType: null,
    processorType: null,
    operatingSystem: null,
    networkSupport: null,
    condition: 'New',
    availability: 'In Stock',
  };

  if (!generalArray || !Array.isArray(generalArray)) {
    console.warn('⚠️ General array is missing or invalid, returning default data');
    return data;
  }

  for (const section of generalArray) {
    if (!section || !section.section || !section.data) {
      console.warn('⚠️ Invalid section in general array:', section);
      continue;
    }
    const key = normalizeField(section.section);
    const mappedKey = sectionMap[key] || key;

    if (!data[mappedKey]) data[mappedKey] = [];

    for (const [name, value] of section.data) {
      if (name && value) {
        data[mappedKey].push({ name: name.trim(), value: value.trim() });

        // Map to specific filter fields
        if (name.toLowerCase().includes('installed ram')) {
          data.ram = value.trim();
        } else if (name.toLowerCase().includes('storage capacity')) {
          data.storageCapacity = value.trim();
        } else if (name.toLowerCase().includes('screen size')) {
          data.screenSize = value.trim();
        } else if (name.toLowerCase().includes('operating system')) {
          data.operatingSystem = value.trim();
        } else if (name.toLowerCase().includes('processor')) {
          data.processorType = value.trim();
        } else if (name.toLowerCase().includes('display') && value.toLowerCase().includes('amoled')) {
          data.displayType = 'AMOLED';
        } else if (name.toLowerCase().includes('display') && value.toLowerCase().includes('ips')) {
          data.displayType = 'IPS LCD';
        }
      }
    }
  }

  return data;
};

const seedSpecifications = async () => {
  try {
    await mongoose.connect(process.env.MONGO_DB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('🚀 Connected to MongoDB');

    // Step 1: Delete existing data
    await Promise.all([Specification.deleteMany({})]);
    console.log('🗑️ Deleted existing Specifications, Categories, SubCategories, Brands, and Types');

    // Step 2: Create Type
    const type = await Type.create({ name: 'Specification', slug: 'specification', status: true });
    console.log('✅ Created Type: Specification');

    // Step 3: Create Categories (client-defined + new from JSON)
    const categoryMap = new Map();
    let maxCategoryOrder = Math.max(...clientCategories.map((c) => c.order), 0);

    // Create client-defined categories
    for (const cat of clientCategories) {
      const category = await Category.create({
        name: cat.name,
        order: cat.order,
        typeId: type._id,
        adminId: null,
        status: true,
        isDeleted: false,
      });
      categoryMap.set(cat.name.toLowerCase(), category);
      console.log(`✅ Created Category: ${cat.name} with order ${cat.order}`);
    }

    // Collect unique categories from JSON
    const jsonCategories = new Set();
    for (const item of specifications) {
      const categoryName = (item.category || '').trim();
      if (categoryName) jsonCategories.add(categoryName);
    }

    // Create new categories from JSON if not mapped or not in clientCategories
    for (const jsonCat of jsonCategories) {
      const normalizedJsonCat = jsonCat.toLowerCase();
      const mappedCatName = categoryNameMap[normalizedJsonCat] || jsonCat;
      if (!categoryMap.has(mappedCatName.toLowerCase())) {
        maxCategoryOrder += 1;
        const category = await Category.create({
          name: mappedCatName,
          order: maxCategoryOrder,
          typeId: type._id,
          adminId: null,
          status: true,
          isDeleted: false,
        });
        categoryMap.set(mappedCatName.toLowerCase(), category);
        console.log(`✅ Created New Category: ${mappedCatName} with order ${maxCategoryOrder}`);
      }
    }

    // Step 4: Create SubCategories (client-defined + new from JSON)
    const subCategoryMap = new Map();
    let maxSubCategoryOrder = Math.max(...clientSubCategories.map((sc) => sc.order), 0);

    // Create client-defined subcategories
    for (const subCat of clientSubCategories) {
      const category = categoryMap.get(subCat.category.toLowerCase());
      if (!category) {
        console.error(`❌ Category not found for SubCategory: ${subCat.name}`);
        continue;
      }
      const subCategory = await SubCategory.create({
        name: subCat.name,
        order: subCat.order,
        categoryId: category._id,
        typeId: type._id,
        adminId: null,
        status: true,
        isDeleted: false,
      });
      subCategoryMap.set(`${subCat.category.toLowerCase()}:${subCat.name.toLowerCase()}`, subCategory);
      console.log(`✅ Created SubCategory: ${subCat.name} under ${subCat.category} with order ${subCat.order}`);
    }

    // Collect unique subcategories from JSON
    const jsonSubCategories = new Map();
    for (const item of specifications) {
      const categoryName = (item.category || '').trim();
      const subCatName = (item.subcategory || '').trim();
      if (categoryName && subCatName) {
        const key = `${categoryName}:${subCatName}`;
        jsonSubCategories.set(key, { category: categoryName, subcategory: subCatName });
      }
    }

    // Create new subcategories from JSON if not mapped
    for (const [key, { category, subcategory }] of jsonSubCategories) {
      const normalizedCat = category.toLowerCase();
      const normalizedSubCat = subcategory.toLowerCase();
      const mappedCatName = categoryNameMap[normalizedCat] || category;
      const mappedSubCatName = subCategoryNameMap[normalizedSubCat] || subcategory;
      const subCatKey = `${mappedCatName.toLowerCase()}:${mappedSubCatName.toLowerCase()}`;
      if (!subCategoryMap.has(subCatKey)) {
        const parentCategory = categoryMap.get(mappedCatName.toLowerCase());
        if (parentCategory) {
          maxSubCategoryOrder += 1;
          const subCategory = await SubCategory.create({
            name: mappedSubCatName,
            order: maxSubCategoryOrder,
            categoryId: parentCategory._id,
            typeId: type._id,
            adminId: null,
            status: true,
            isDeleted: false,
          });
          subCategoryMap.set(subCatKey, subCategory);
          console.log(`✅ Created New SubCategory: ${mappedSubCatName} under ${mappedCatName} with order ${maxSubCategoryOrder}`);
        } else {
          console.warn(`⚠️ Parent category not found for SubCategory: ${mappedSubCatName} (Category: ${mappedCatName})`);
        }
      }
    }

    // Step 5: Process Specifications
    const brandMap = new Map();
    const batch = [];
    const skippedItems = [];

    for (const item of specifications) {
      // Validate item
      if (!item.name || !item.category) {
        skippedItems.push({
          ...item,
          reason: 'Missing name or category',
        });
        console.warn(`⚠️ Skipped item: ${item.name || 'Unknown'} (Reason: Missing name or category)`);
        continue;
      }

      // Map JSON category to client category or use JSON category
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

      // Handle missing subcategory by using brand
      let subCatName = (item.subcategory || '').trim();
      let mappedSubCatName;
      if (!subCatName) {
        subCatName = (item.brand || '').trim() || `UnknownSubCategory-${normalizeField(item.category)}`;
        mappedSubCatName = subCategoryNameMap[subCatName.toLowerCase()] || subCatName;
      } else {
        mappedSubCatName = subCategoryNameMap[subCatName.toLowerCase()] || subCatName;
      }

      const subCategoryKey = `${mappedCatName.toLowerCase()}:${mappedSubCatName.toLowerCase()}`;
      let subCategory = subCategoryMap.get(subCategoryKey);

      // Create subcategory using brand if it doesn't exist
      if (!subCategory) {
        const parentCategory = categoryMap.get(mappedCatName.toLowerCase());
        if (parentCategory) {
          maxSubCategoryOrder += 1;
          subCategory = await SubCategory.create({
            name: mappedSubCatName,
            order: maxSubCategoryOrder,
            categoryId: parentCategory._id,
            typeId: type._id,
            adminId: null,
            status: true,
            isDeleted: false,
          });
          subCategoryMap.set(subCategoryKey, subCategory);
          console.log(`✅ Created New SubCategory from Brand: ${mappedSubCatName} under ${mappedCatName} with order ${maxSubCategoryOrder}`);
        } else {
          skippedItems.push({
            ...item,
            reason: `Parent category not found for SubCategory: ${mappedSubCatName} (Category: ${mappedCatName})`,
          });
          console.warn(`⚠️ Skipped item: ${item.name} (Reason: Parent category not found for SubCategory: ${mappedSubCatName})`);
          continue;
        }
      }

      // Handle Brand
      let brandName = (item.brand || '').trim();
      if (!brandName) {
        brandName = `UnknownBrand-${normalizeField(item.category || 'general')}`;
      }
      let brand = brandMap.get(brandName);
      if (!brand) {
        brand = await Brand.findOne({ name: brandName }).select('_id');
        if (!brand) {
          brand = await Brand.create({ name: brandName, adminId: null, status: true, isDeleted: false });
        }
        brandMap.set(brandName, brand);
      }

      // Prepare Specification Document
      const specDoc = {
        adminId: null,
        brandId: brand._id,
        categoryId: category._id,
        subCategoryId: subCategory._id,
        name: item.name,
        url: item.url || '',
        price: parseInt(item.price?.replace(/,/g, '') || '0', 10) || 0,
        priceSymbol: 'PKR',
        image: item.image || '',
        data: transformGeneralData(item.general),
        status: true,
        isDeleted: false,
        compare: true,
        wishlist: [],
      };

      batch.push(specDoc);

      if (batch.length >= BATCH_SIZE) {
        await Specification.insertMany(batch, { ordered: false });
        console.log(`✅ Inserted ${batch.length} specifications`);
        batch.length = 0;
      }
    }

    // Insert remaining documents
    if (batch.length > 0) {
      await Specification.insertMany(batch, { ordered: false });
      console.log(`✅ Inserted remaining ${batch.length} specifications`);
    }

    // Step 6: Save skipped items to a JSON file
    if (skippedItems.length > 0) {
      const outputPath = path.join('seeders', 'skippedItems.json');
      fs.writeFileSync(outputPath, JSON.stringify(skippedItems, null, 2));
      console.log(`📝 Saved ${skippedItems.length} skipped items to ${outputPath}`);
      console.log('⚠️ Skipped items:');
      skippedItems.forEach((item) => {
        console.log(`- ${item.name || 'Unknown'} (Reason: ${item.reason}, Category: ${item.category || 'N/A'}, SubCategory: ${item.subcategory || 'N/A'})`);
      });
    } else {
      console.log('✅ No items were skipped');
    }

    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit();
  } catch (error) {
    console.error('❌ Error seeding specifications:', error.message);
    process.exit(1);
  }
};

seedSpecifications();
