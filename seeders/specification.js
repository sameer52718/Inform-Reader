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

// Client-specified categories
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
  headphones: 'Mobiles & Tablets',
  'laptop chargers': 'Laptops & Computers',
  keyboards: 'Laptops & Computers',
  webcams: 'Laptops & Computers',
  mouse: 'Laptops & Computers',
  'laptop bags': 'Laptops & Computers',
  'laptop battries': 'Laptops & Computers',
  laptops: 'Laptops & Computers',
};

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

  if (!generalArray || !Array.isArray(generalArray)) return data;

  for (const section of generalArray) {
    if (!section || !section.section || !section.data) continue;
    const key = normalizeField(section.section);
    const mappedKey = sectionMap[key] || key;
    if (!data[mappedKey]) data[mappedKey] = [];

    for (const [name, value] of section.data) {
      if (name && value) data[mappedKey].push({ name: name.trim(), value: value.trim() });
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

    await Specification.deleteMany({});
    console.log('🗑️ Deleted old specifications');

    const type = await Type.findOne({ name: 'Specification', slug: 'specification', status: true });
    console.log('✅ Type created');

    const categoryMap = new Map();
    for (const cat of clientCategories) {
      const category = await Category.create({
        name: cat.name,
        order: cat.order,
        typeId: type._id,
        status: true,
        isDeleted: false,
      });
      categoryMap.set(cat.name.toLowerCase(), category);
    }

    const subCategoryMap = new Map();
    for (const sub of clientSubCategories) {
      const category = categoryMap.get(sub.category.toLowerCase());
      const subCat = await SubCategory.create({
        name: sub.name,
        categoryId: category._id,
        order: sub.order,
        typeId: type._id,
        status: true,
      });
      subCategoryMap.set(`${sub.category.toLowerCase()}:${sub.name.toLowerCase()}`, subCat);
    }

    const brandMap = new Map();
    const batch = [];

    for (const item of specifications) {
      const mappedCatName = categoryNameMap[item.category?.toLowerCase()] || item.category;
      const category = categoryMap.get(mappedCatName?.toLowerCase());
      if (!category) continue;

      let subCatName = item.subcategory || item.brand || 'General';
      subCatName = subCategoryNameMap[subCatName.toLowerCase()] || subCatName;
      const subCatKey = `${mappedCatName.toLowerCase()}:${subCatName.toLowerCase()}`;
      let subCategory = subCategoryMap.get(subCatKey);

      if (!subCategory) {
        subCategory = await SubCategory.create({
          name: subCatName,
          order: subCategoryMap.size + 1,
          categoryId: category._id,
          typeId: type._id,
          status: true,
        });
        subCategoryMap.set(subCatKey, subCategory);
      }

      // 🔥 BRAND LOGIC UPDATED HERE
      let brandName = (item.brand || '').trim();
      if (!brandName) brandName = subCatName || `UnknownBrand-${normalizeField(item.category)}`;

      let brand = brandMap.get(brandName);
      if (!brand) {
        brand = await Brand.findOne({ name: brandName });
        if (!brand) {
          brand = await Brand.create({
            name: brandName,
            adminId: null,
            status: true,
            isDeleted: false,
            category: [category._id], // attach category on creation
          });
        } else {
          if (!brand.category.some((catId) => catId.equals(category._id))) {
            brand.category.push(category._id);
            await brand.save();
          }
        }
        brandMap.set(brandName, brand);
      } else {
        if (!brand.category.some((catId) => catId.equals(category._id))) {
          brand.category.push(category._id);
          await brand.save();
        }
      }
      // 🔥 END BRAND LOGIC

      batch.push({
        adminId: null,
        brandId: brand._id,
        categoryId: category._id,
        subCategoryId: subCategory._id,
        name: item.name,
        url: item.url || '',
        price: parseInt(item.price?.replace(/,/g, '') || '0', 10),
        priceSymbol: 'PKR',
        image: item.image || '',
        data: transformGeneralData(item.general),
        status: true,
        isDeleted: false,
      });

      if (batch.length >= BATCH_SIZE) {
        await Specification.insertMany(batch);
        batch.length = 0;
      }
    }

    if (batch.length > 0) await Specification.insertMany(batch);

    console.log('✅ All specifications seeded successfully!');
    await mongoose.disconnect();
    process.exit();
  } catch (err) {
    console.error('❌ Error seeding:', err);
    process.exit(1);
  }
};

seedSpecifications();
