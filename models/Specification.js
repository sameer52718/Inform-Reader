import mongoose from 'mongoose';

// Schema for General Specifications
const generalSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true, trim: true }, // Mixed to handle numbers/strings
});

// Schema for Data
const dataSchema = new mongoose.Schema(
  {
    generalSpecs: [generalSchema],
    general: [generalSchema],
    compatibility: [generalSchema],
    connectors: [generalSchema],
    dimensions: [generalSchema],
    memory: [generalSchema],
    miscellaneous: [generalSchema],
    links: [generalSchema],
    display: [generalSchema],
    processor: [generalSchema],
    storage: [generalSchema],
    camera: [generalSchema],
    communication: [generalSchema],
    features: [generalSchema],
    design: [generalSchema],
    powerSupply: [generalSchema],
    audioFeatures: [generalSchema],
    // Additional fields for common filters
    ram: { type: String, enum: ['2GB', '3GB', '4GB', '6GB', '8GB', '12GB', '16GB', '32GB', '64GB', null] },
    storageCapacity: { type: String, enum: ['16GB', '32GB', '64GB', '128GB', '256GB', '512GB', '1TB', '2TB', null] },
    cameraMegapixels: { type: String, enum: ['12MP', '48MP', '50MP', '108MP', '200MP', null] },
    batteryCapacity: { type: String, enum: ['Under 4000mAh', '4000-5000mAh', '5000-6000mAh', 'Above 6000mAh', null] },
    screenSize: { type: String, enum: ['Under 5 inches', '5-6 inches', '6-7 inches', 'Above 7 inches', null] },
    displayType: { type: String, enum: ['AMOLED', 'IPS LCD', 'TFT', 'Super AMOLED', null] },
    processorType: {
      type: String,
      enum: ['Snapdragon', 'MediaTek', 'Exynos', 'Apple A-Series', 'Intel Core i3', 'i5', 'i7', 'i9', 'AMD Ryzen 3', '5', '7', '9', 'Apple M1', 'M2', null],
    },
    operatingSystem: { type: String, enum: ['Android', 'iOS', 'Windows', 'macOS', 'Linux', null] },
    networkSupport: { type: String, enum: ['4G', '5G', 'No 5G', null] },
    condition: { type: String, enum: ['New', 'Refurbished', 'Used'] },
    availability: { type: String, enum: ['In Stock', 'Out of Stock', 'Pre-Order'] },
  },
  { _id: false },
);

// Schema for Specification
const specificationSchema = new mongoose.Schema(
  {
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    brandId: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', required: false },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    subCategoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubCategory', required: true },
    name: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    price: { type: Number, required: true },
    priceSymbol: { type: String, default: 'PKR' },
    image: { type: String, required: false, trim: true },
    slug: { type: String, unique: true },
    data: dataSchema,
    status: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    wishlist: { type: [mongoose.Schema.Types.ObjectId], ref: 'User', default: [] },
    // Add fields for comparison and sharing
    compare: { type: Boolean, default: false }, // Flag for comparison eligibility
  },
  { timestamps: true },
);

const Specification = mongoose.model('Specification', specificationSchema);

export default Specification;
