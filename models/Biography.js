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
    slug: { type: String, required: false, unique: true, lowercase: true, trim: true },
  },
  { timestamps: true },
);

biographySchema.index({ isDeleted: 1, categoryId: 1 });
biographySchema.index({ isDeleted: 1, subCategoryId: 1 });
biographySchema.index({ isDeleted: 1, nationalityId: 1 });
biographySchema.index({ name: 'text' });
biographySchema.index({
  'professionalInformation.name': 1,
  'professionalInformation.value': 1,
});
biographySchema.index({
  'personalInformation.name': 1,
  'personalInformation.value': 1,
});

const Biography = mongoose.model('Biography', biographySchema);

export default Biography;
