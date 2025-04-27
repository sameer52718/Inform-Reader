import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import Specification from '../models/Specification.js';
import Category from '../models/Category.js';
import SubCategory from '../models/SubCategory.js';
import Brand from '../models/Brand.js';

dotenv.config();

const BATCH_SIZE = 500;
const rawData = fs.readFileSync('seeders/specifications.json');
const specifications = JSON.parse(rawData);

const categoryMap = new Map();
const subCategoryMap = new Map();
const brandMap = new Map();
const batch = [];

const normalizeField = (str) =>
    str.toLowerCase().replace(/\s+/g, '').replace(/[^a-z]/g, '');

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

    const data = {};

    for (const section of generalArray) {
        const key = normalizeField(section.section);
        const mappedKey = sectionMap[key] || key;

        if (!data[mappedKey]) data[mappedKey] = [];

        for (const [name, value] of section.data) {
            if (name && value) {
                data[mappedKey].push({ name: name.trim(), value: value.trim() });
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

        for (const item of specifications) {
            // Handle Category
            let category = categoryMap.get(item.category);
            if (!category) {
                category = await Category.findOne({ name: item.category }).select('_id');
                if (!category) {
                    category = await Category.create({ name: item.category });
                }
                categoryMap.set(item.category, category);
            }

            // Handle SubCategory
            let subCatName = (item.subcategory || '').trim();
            if (!subCatName) {
                subCatName = `Uncategorized-${normalizeField(item.category || 'unknown')}`;
            }

            let subCategory = subCategoryMap.get(subCatName);

            if (!subCategory) {
                subCategory = await SubCategory.findOne({ name: subCatName }).select('_id');
                if (!subCategory) {
                    subCategory = await SubCategory.create({
                        name: subCatName,
                        categoryId: category._id,
                        typeId: new mongoose.Types.ObjectId('6807b8093010d3909bc7cdf3'), // use valid ObjectId
                    });
                }
                subCategoryMap.set(subCatName, subCategory);
            }


            let brandName = (item.brand || '').trim();
            if (!brandName) {
                brandName = `UnknownBrand-${normalizeField(item.category || 'general')}`;
            }

            let brand = brandMap.get(brandName);
            if (!brand) {
                brand = await Brand.findOne({ name: brandName }).select('_id');
                if (!brand) {
                    brand = await Brand.create({ name: brandName });
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
                url: item.url,
                price: parseInt(item.price.replace(/,/g, ''), 10),
                priceSymbal: 'PKR',
                image: item.image,
                data: transformGeneralData(item.general),
                status: true,
                isDeleted: false,
            };

            batch.push(specDoc);

            if (batch.length >= BATCH_SIZE) {


                await Specification.insertMany(batch, { ordered: false });
                console.log(`✅ Inserted ${batch.length} specifications`);
                batch.length = 0;
            }
        }

        // Insert any remaining documents
        if (batch.length > 0) {
            await Specification.insertMany(batch, { ordered: false });
            console.log(`✅ Inserted remaining ${batch.length} specifications`);
        }

        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
        process.exit();
    } catch (error) {
        console.error('❌ Error inserting specifications:', error.message);
        process.exit(1);
    }
};

seedSpecifications();
