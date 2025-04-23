import mongoose from 'mongoose';

const nationalitySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    countryCode: { type: String, required: true, uppercase: true, trim: true },
    status: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Nationality = mongoose.model('Nationality', nationalitySchema);

export default Nationality;
