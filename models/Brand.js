import mongoose from 'mongoose';

const brandSchema = new mongoose.Schema(
  {
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, required: true, unique: true },
    status: { type: Boolean, default: true},
    isDeleted: { type: Boolean, default: false},
  },
  { timestamps: true }
);

const Brand = mongoose.model('Brand', brandSchema);

export default Brand;
