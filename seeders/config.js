import mongoose from 'mongoose';
import Config from '../models/Config.js'; // Ensure this path is correct
import dotenv from 'dotenv';

dotenv.config();

const seedConfig = async () => {
  try {
    await mongoose.connect(process.env.MONGO_DB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Database connected');

    const body = {
      logo: 'https://api.informreaders.com/uploads/logo.png', // Use a relative or hosted path to the image
      themeColor: 'red', // Example color
    };

    await Config.findOneAndUpdate({}, body, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    });

    console.log('✅ Config seeded successfully');
  } catch (error) {
    console.error('❌ Error seeding Config:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
};

// Run the seeder
seedConfig();
