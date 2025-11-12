import mongoose from 'mongoose';

const postalCodeSchema = new mongoose.Schema(
  {
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    countryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Country', required: true },
    state: { type: String, trim: true },
    area: { type: String, trim: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    adminName2: { type: String, trim: true },
    adminCode1: { type: String, trim: true },
    adminCode2: { type: String, trim: true },
    adminName3: { type: String, trim: true },
    adminCode3: { type: String, trim: true },
    latitude: { type: Number },
    longitude: { type: Number },
    accuracy: { type: Number, enum: [1, 2, 3, 4, 5, 6], default: 6 },
    status: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    slug: { type: String, trim: true },
    stateSlug: { type: String, trim: true },
    areaSlug: { type: String, trim: true },
  },
  { timestamps: true },
);

postalCodeSchema.index({ countryId: 1, state: 1 });
postalCodeSchema.index({ slug: 1, status: 1, isDeleted: 1 });

export default mongoose.model('PostalCode', postalCodeSchema);
