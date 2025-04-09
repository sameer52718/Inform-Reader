import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Name from '../models/Name.js';
import Religion from '../models/Religion.js';
import Category from '../models/Category.js';
import Type from '../models/Type.js';

dotenv.config();
const namesData =[];

const seedNames = async () => {
    try {
        await mongoose.connect(process.env.MONGO_DB_URL, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        console.log("🚀 Connected to MongoDB");

        for (const item of nameData) {
            var religion = await Religion.findOne({ name: item.religion }).select('_id');
            var category = await Category.findOne({ name: item.categoryName }).select('_id');

            if (!religion) {
                var religion = await Religion.create({ name: item.religion, status: false });
            }

            if (!category) {

                var type = await Type.findOne({ name: 'Name' }).select('_id');
                if (!type) {
                    var type = await Type.create({ name: 'Name', slug: 'name' });
                }

                var category = await Category.create({ 
                    adminId: null, 
                    typeId: type._id, 
                    name: item.categoryName, 
                    status: false 
                });
            }

            const formattedName = {
                adminId: null, // Optionally set admin if available
                religionId: religion._id,
                categoryId: category._id,
                name: item.name,
                initialLetter: item.name[0].toUpperCase(),
                shortMeaning: item.shortMeaning,
                longMeaning: item.longMeaning,
                gender: item.gender?.toUpperCase() === "BOY" ? "MALE" :
                    item.gender?.toUpperCase() === "GIRL" ? "FEMALE" : "OTHER",
                origion: item.origin,
                shortName: item.shortName,
                nameLength: item.name.length,
            };

            const existing = await Name.findOne({ name: item.name });
            if (!existing) {
                await Name.create(formattedName);
                console.log(`✅ Inserted: ${item.name}`);
            } else {
                console.log(`⚠️ Skipped (already exists): ${item.name}`);
            }
        }

        await mongoose.disconnect();
        console.log("🔌 Disconnected from MongoDB");
        process.exit();
    } catch (error) {
        console.error("❌ Error seeding names:", error);
        process.exit(1);
    }
};

seedNames();
