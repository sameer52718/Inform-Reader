import mongoose from 'mongoose';

const postalCodeSchema = new mongoose.Schema(
  {
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    countryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Country', required: true },
    state: { type: String, trim: true }, // Optional - e.g., district, town
    area: { type: String, trim: true }, // e.g., locality or neighborhood
    code: { type: String, required: true, uppercase: true, trim: true },
    status: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    slug: { type: String, trim: true, index: true },
  },
  { timestamps: true },
);

postalCodeSchema.index({ countryId: 1, state: 1 });
postalCodeSchema.index({ slug: 1, status: 1, isDeleted: 1 });

export default mongoose.model('PostalCode', postalCodeSchema);
