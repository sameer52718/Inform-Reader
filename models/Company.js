import mongoose from 'mongoose';

const companySchema = new mongoose.Schema(
  {
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, required: true, unique: true },
    logo: { type: String, required: false },
    status: { type: Boolean, default: true},
    isDeleted: { type: Boolean, default: false},
  },
  { timestamps: true }
);

const Company = mongoose.model('Company', companySchema);

export default Company;
