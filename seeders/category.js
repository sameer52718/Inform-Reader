import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Category from '../models/Category.js';
import SubCategory from '../models/SubCategory.js';
import Type from '../models/Type.js';

dotenv.config();

const categoriesData = [
  {
    category: 'Lifestyle',
    subcategories: ['Personal Development', 'Fashion', 'Beauty', 'Home and Living', 'Parenting', 'Relationships', 'Wellness', 'Fitness', 'Travel', 'Food and Drink'],
  },
  {
    category: 'Technology',
    subcategories: ['Gadgets', 'Software', 'Gaming', 'Artificial Intelligence', 'Cybersecurity', 'Programming', 'Tech News', 'Startups'],
  },
  {
    category: 'Education',
    subcategories: ['Online Learning', 'Academic Tips', 'Career Development', 'Language Learning', 'Science Education', 'History', 'Math'],
  },
  {
    category: 'Health',
    subcategories: ['Nutrition', 'Mental Health', 'Medical News', 'Fitness and Exercise', 'Alternative Medicine', 'Chronic Illness'],
  },
  {
    category: 'Entertainment',
    subcategories: ['Movies', 'Music', 'Television', 'Books', 'Celebrity News', 'Events'],
  },
  {
    category: 'Business and Finance',
    subcategories: ['Entrepreneurship', 'Personal Finance', 'Cryptocurrency', 'Marketing', 'E-commerce', 'Corporate News'],
  },
  {
    category: 'Creative Arts',
    subcategories: ['Photography', 'Writing', 'Art and Design', 'Crafts', 'Music Production'],
  },
  {
    category: 'Travel and Adventure',
    subcategories: ['Destination Guides', 'Adventure Travel', 'Cultural Travel', 'Budget Travel', 'Luxury Travel'],
  },
  {
    category: 'Science and Environment',
    subcategories: ['Environmental Issues', 'Space Exploration', 'Biology', 'Physics', 'Technology and Science'],
  },
  {
    category: 'Sports',
    subcategories: ['Football', 'Cricket', 'Basketball', 'Fitness Sports', 'Extreme Sports', 'Sports Gear'],
  },
  {
    category: 'Society and Culture',
    subcategories: ['Current Events', 'Politics', 'Culture', 'Social Justice', 'Religion and Spirituality'],
  },
  {
    category: 'Hobbies and Interests',
    subcategories: ['Gardening', 'Gaming', 'Collecting', 'Pets', 'Outdoor Activities'],
  },
  {
    category: 'Food and Culinary Arts',
    subcategories: ['Recipes', 'Baking', 'Vegan and Vegetarian', 'Food Reviews', 'Culinary Travel'],
  },
];

const seedCategoriesAndSubcategories = async () => {
  try {
    await mongoose.connect(process.env.MONGO_DB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('🚀 Connected to MongoDB');

    // Get or create the "Blog" type
    let blogType = await Type.findOne({ name: 'Blog' });
    if (!blogType) {
      blogType = await Type.create({ name: 'Blog', slug: 'blog' });
      console.log(`📄 Created type: Blog`);
    }

    for (const { category, subcategories } of categoriesData) {
      // Check if category exists
      let categoryDoc = await Category.findOne({ name: category, typeId: blogType._id });
      if (!categoryDoc) {
        categoryDoc = await Category.create({
          name: category,
          typeId: blogType._id,
          adminId: null,
          status: true,
        });
        console.log(`✅ Created category: ${category}`);
      } else {
        console.log(`ℹ️ Category exists: ${category}`);
      }

      for (const sub of subcategories) {
        const subExists = await SubCategory.findOne({
          name: sub,
          typeId: blogType._id,
          categoryId: categoryDoc._id,
        });

        if (!subExists) {
          await SubCategory.create({
            name: sub,
            typeId: blogType._id,
            categoryId: categoryDoc._id,
            adminId: null,
            status: true,
          });
          console.log(`  🔹 Created subcategory: ${sub}`);
        } else {
          console.log(`  ⚠️ Subcategory exists: ${sub}`);
        }
      }
    }

    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit();
  } catch (error) {
    console.error('❌ Error seeding categories:', error.message);
    process.exit(1);
  }
};

seedCategoriesAndSubcategories();
