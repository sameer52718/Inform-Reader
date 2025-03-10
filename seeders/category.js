import mongoose from 'mongoose';
import Category from '../models/Category.js';
import dotenv from 'dotenv';

dotenv.config(); // Load environment variablesrs

const createCategories = async () => {
  const categories = [
    { name: "Product", slug: "product" , status: true },
    { name: "Sports", slug: "sports" , status: false },
    { name: "Baby Names", slug: "baby-names" , status: true },
    { name: "Biographies", slug: "biographies" , status: true },
    { name: "Coupons", slug: "coupons" , status: true },
    { name: "Job Listings", slug: "job-listings" , status: true },
    { name: "Postal Codes", slug: "postal-codes" , status: true },
    { name: "Bank Codes", slug: "bank-codes" , status: true },
    { name: "Movies", slug: "movies" , status: true },
    { name: "Flights", slug: "flights" , status: true },
    { name: "Crypto", slug: "crypto" , status: false },
    { name: "Education", slug: "education" , status: false },
    { name: "Real Estate", slug: "real-estate" , status: false },
    { name: "Software", slug: "software" , status: true },
    { name: "Busses", slug: "busses" , status: true },
    { name: "Weather", slug: "weather" , status: true }
  ];

  try {

    await mongoose.connect(process.env.MONGO_DB_URL, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });

    for (const category of categories) {
      const existingCategory = await Category.findOne({ name: category.name });
      if (!existingCategory) {
        await Category.create(category);
        console.log(`Created category: ${category.name}`);
      } else {
        console.log(`Category '${category.name}' already exists.`);
      }
    }
  } catch (error) {
    console.log("Error in creating categories: ", error.message);
  }
};

const seedCategories = async () => {
  await createCategories();
};

seedCategories();
