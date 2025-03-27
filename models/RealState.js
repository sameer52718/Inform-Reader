import mongoose from 'mongoose';

// Sub-schema for location details
const locationSchema = new mongoose.Schema(
  {
    lat: { type: Number, required: false }, // Latitude
    lng: { type: Number, required: false }, // Longitude
  },
  { _id: false }
);

// Main Job Schema
const realStateSchema = new mongoose.Schema(
  {
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    subCategoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubCategory', required: true },
    countryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Country', required: true },

    name: { type: String, required: true, unique: true },
    shortDescription: { type: String, required: true, maxlength: 200 },
    description: { type: String, required: false },

    type: { type: String, enum: ['BUY', 'RENT'], required: true },

    contactNumber: { type: String, required: false, },
    website: { type: String, required: false },

    location: { type: locationSchema, required: false },
    area: { type: String, required: false },
    bedroom: { type: Number, required: false, default: 0 },
    bathroom: { type: Number, required: false, default: 0 },

    image: { type: String, required: false },
    images: { type: [String], required: false, validate: [(val) => val.length <= 10, 'Maximum 10 images allowed'] },

    featured: { type: Boolean, default: false },
    status: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false }
  },
  { timestamps: true }
);

const RealState = mongoose.model('RealState', realStateSchema);

export default RealState;
