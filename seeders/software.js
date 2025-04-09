import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Software from '../models/Software.js';
import Category from '../models/Category.js';
import Type from '../models/Type.js';

dotenv.config();

const softwareData = [];


const seedSoftware = async () => {
  try {
    await mongoose.connect(process.env.MONGO_DB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("🚀 Connected to MongoDB");

    for (const item of softwareData) {
      // Get or create category using operating system name
      let category = await Category.findOne({ name: item.operatingSystem }).select('_id');

      if (!category) {
        let type = await Type.findOne({ name: 'Software' }).select('_id');
        if (!type) {
          type = await Type.create({ name: 'Software', slug: 'software' });
        }

        category = await Category.create({
          adminId: null,
          typeId: type._id,
          name: item.operatingSystem,
          status: true
        });

        console.log(`🆕 Created new category: ${item.operatingSystem}`);
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
        operatingSystem: Array.isArray(item.operatingSystem)
          ? item.operatingSystem
          : [item.operatingSystem],

        size: Math.floor(Math.random() * 500) + 100, // Size in MB
        tag: Array.isArray(item.tag) ? item.tag : [item.tag],

        status: true,
        isDeleted: false,
        wishList: [],
      };

      const exists = await Software.findOne({ name: item.name, version: item.version });
      if (exists) {
        console.log(`⚠️ Skipped (already exists): ${item.name} v${item.version}`);
        continue;
      }

      await Software.create(formatted);
      console.log(`✅ Inserted: ${item.name}`);
    }

    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
    process.exit();
  } catch (error) {
    console.error("❌ Error inserting software data:", error);
    process.exit(1);
  }
};

seedSoftware();
