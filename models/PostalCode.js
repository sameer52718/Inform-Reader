import mongoose from 'mongoose';

const postalCodeSchema = new mongoose.Schema(
  {
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    countryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Country' },
    bank: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    branch: { type: String, default: '', trim: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    status: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

const PostalCode = mongoose.model('PostalCode', postalCodeSchema);

export default PostalCode;
