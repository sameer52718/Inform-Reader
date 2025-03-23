import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
  {
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    typeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Type' },
    name: { type: String, required: true, unique: true },
    status: { type: Boolean, default: false},
    isDeleted: { type: Boolean, default: false},
  },
  { timestamps: true }
);

const Category = mongoose.model('Category', categorySchema);

export default Category;
