import mongoose from 'mongoose';

const softwareSchema = new mongoose.Schema(
  {
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: false },
    subCategoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubCategory', required: false },

    name: { type: String, required: true, trim: true },

    overview: { type: String, required: true, trim: true },
    logo: { type: String, required: false, trim: true },
    download: { type: String, required: true, trim: true },

    releaseDate: { type: Date, required: true },
    lastUpdate: { type: Date, default: Date.now },

    version: { type: String, required: true, trim: true },
    operatingSystem: { type: [String], required: false },

    size: { type: Number, required: true, min: 0 },
    tag: { type: [String], default: [] },

    status: { type: Boolean, default: true},
    isDeleted: { type: Boolean, default: false},

    wishList: { type: [mongoose.Schema.Types.ObjectId], ref: 'User', default: [] },


  },
  { timestamps: true }
);

const Software = mongoose.model('Software', softwareSchema);

export default Software;
