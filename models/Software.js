import mongoose from 'mongoose';
import slugify from 'slugify'; // Make sure to install the slugify library

const softwareSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: false, lowercase: true, trim: true },
    overview: { type: String, required: true, trim: true },
    logo: { type: String, required: true },
    download: { type: String, required: true },
    releaseDate: { type: Date, required: true },
    lastUpdate: { type: Date, required: true, default: Date.now },
    version: { type: String, required: true, trim: true },
    operatingSystem: { type: String, required: true },
    size: { type: Number, required: true, min: 0 },
    tag: { type: String, required: false },
    wishList: { type: Array, default: [] },
  },
  { timestamps: true },
);


const Software = mongoose.model('Software', softwareSchema);

export default Software;
