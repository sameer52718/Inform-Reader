import mongoose from 'mongoose';

const countrySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    countryCode: { type: String, required: true, unique: true, lowercase: true, trim: true },
    status: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Country = mongoose.model('Country', countrySchema);

export default Country;
