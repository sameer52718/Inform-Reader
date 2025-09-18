import mongoose from 'mongoose';

const softwareSchema = new mongoose.Schema(
  {
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    subCategoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubCategory', required: true },

    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true },
    overview: { type: String, required: true, trim: true },
    logo: { type: String, required: false, trim: true },
    download: { type: String, required: true, trim: true },

    releaseDate: { type: Date, required: true },
    lastUpdate: { type: Date, default: Date.now },

    version: { type: String, required: true, trim: true },
    operatingSystem: { type: [String], required: true },

    size: { type: Number, required: true, min: 0 },
    tag: { type: [String], default: [] },
    downloadCount: { type: Number, default: 0, min: 0 },

    status: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },

    wishList: { type: [mongoose.Schema.Types.ObjectId], ref: 'User', default: [] },
  },
  { timestamps: true },
);

softwareSchema.index({ slug: 1 }, { unique: true });
softwareSchema.index({ status: 1, isDeleted: 1, categoryId: 1 });
softwareSchema.index({ status: 1, isDeleted: 1, subCategoryId: 1 });
softwareSchema.index({ status: 1, isDeleted: 1, operatingSystem: 1 });
softwareSchema.index({ status: 1, isDeleted: 1, tag: 1 });
softwareSchema.index({ name: 'text' });

const Software = mongoose.model('Software', softwareSchema);

export default Software;
