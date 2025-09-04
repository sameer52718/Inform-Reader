import mongoose from 'mongoose';

const bankCodeSchema = new mongoose.Schema(
  {
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    countryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Country' },
    bank: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    branch: { type: String, default: '', trim: true },
    swiftCode: { type: String, required: true, uppercase: true, trim: true },
    status: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    slug: { type: String, trim: true, index: true, unique: true },
  },
  { timestamps: true },
);

const BankCode = mongoose.model('BankCode', bankCodeSchema);

export default BankCode;
