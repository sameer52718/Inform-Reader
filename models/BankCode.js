import mongoose from 'mongoose';

const bankCodeSchema = new mongoose.Schema(
  {
    countryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Country' },
    bank: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    branch: { type: String, default: '', trim: true },
    swiftCode: { type: String, required: true, uppercase: true, trim: true },
  },
  { timestamps: true },
);

const BankCode = mongoose.model('BankCode', bankCodeSchema);

export default BankCode;
