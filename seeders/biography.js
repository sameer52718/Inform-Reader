import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import Biography from '../models/Biography.js';
import Nationality from '../models/Nationality.js';
import Category from '../models/Category.js';

dotenv.config();

const rawData = fs.readFileSync('seeders/biographies.json');
const biographies = JSON.parse(rawData);

const BATCH_SIZE = 500;
const categoryMap = new Map();
const nationalityMap = new Map();
const batch = [];

const normalizeField = (str) =>
    str.toLowerCase().replace(/\s+/g, '').replace(/[^a-z]/g, '');

const getCategory = async (name) => {
    if (categoryMap.has(name)) return categoryMap.get(name);
    let category = await Category.findOne({ name }).select('_id');
    if (!category) {
        category = await Category.create({ name });
    }
    categoryMap.set(name, category);
    return category;
};

const getNationality = async (name) => {
    if (nationalityMap.has(name)) return nationalityMap.get(name);
    let nationality = await Nationality.findOne({ name }).select('_id');
    if (!nationality) {
        nationality = await Nationality.create({ name, countryCode: 'Not Set' });
    }
    nationalityMap.set(name, nationality);
    return nationality;
};

const seedBiographies = async () => {
    try {
        await mongoose.connect(process.env.MONGO_DB_URL, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        console.log('🚀 Connected to MongoDB');

        for (const item of biographies) {
            const category = await getCategory(item.category || 'General');
            const nationality = await getNationality(item.nationality || 'Unknown');

            const bioDoc = {
                name: item.name,
                description: item.description,
                religion: item.religion || 'Unknown',
                image: item.image,
                categoryId: category._id,
                nationalityId: nationality._id,
                generalInformation: item.generalInformation || [],
            };

            batch.push(bioDoc);

            if (batch.length >= BATCH_SIZE) {
                await Biography.insertMany(batch, { ordered: false });
                console.log(`✅ Inserted ${batch.length} biographies`);
                batch.length = 0;
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
