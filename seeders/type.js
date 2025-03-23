import mongoose from 'mongoose';
import Type from '../models/Type.js';
import dotenv from 'dotenv';

dotenv.config(); // Load environment variables

const createTypes = async () => {
  const types = [
    { name: "Product", slug: "product", status: true },
    { name: "Sports", slug: "sports", status: false },
    { name: "Baby Names", slug: "baby-names", status: true },
    { name: "Biographies", slug: "biographies", status: true },
    { name: "Coupons", slug: "coupons", status: true },
    { name: "Job Listings", slug: "job-listings", status: true },
    { name: "Postal Codes", slug: "postal-codes", status: true },
    { name: "Bank Codes", slug: "bank-codes", status: true },
    { name: "Movies", slug: "movies", status: true },
    { name: "Flights", slug: "flights", status: true },
    { name: "Crypto", slug: "crypto", status: false },
    { name: "Education", slug: "education", status: false },
    { name: "Real Estate", slug: "real-estate", status: false },
    { name: "Software", slug: "software", status: true },
    { name: "Busses", slug: "busses", status: true },
    { name: "Weather", slug: "weather", status: true },
  ];

  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_DB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    for (const type of types) {
      const existingType = await Type.findOne({ slug: type.slug });
      if (!existingType) {
        await Type.create(type);
        console.log(`Created type: ${type.name}`);
      } else {
        console.log(`Type '${type.name}' already exists.`);
      }
    }
  } catch (error) {
    console.error("Error in creating types:", error.message);
  } finally {
    await mongoose.disconnect();
  }
};

// Run the function
createTypes();
