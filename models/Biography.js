import mongoose from 'mongoose';

// Schema for key-value pairs used in nested arrays
const infoSchema = new mongoose.Schema({
  name: { type: String, required: false, trim: true },
  value: { type: mongoose.Schema.Types.Mixed, required: false }, // Mixed to handle strings or arrays
});

// Main Biography Schema
const biographySchema = new mongoose.Schema(
  {
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    nationalityId: { type: String, required: false },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: false },
    subCategoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubCategory', required: false },
    name: { type: String, required: true },
    description: { type: String, required: false },
    religion: { type: String, required: false },
    image: { type: String, required: false },
    personalInformation: [infoSchema],
    professionalInformation: [infoSchema],
    netWorthAndAssets: [infoSchema],
    physicalAttributes: [infoSchema],
    status: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

const Biography = mongoose.model('Biography', biographySchema);

export default Biography;
