import mongoose from 'mongoose';

const subCategorySchema = new mongoose.Schema(
  {
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    typeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Type' },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    name: { type: String, required: true },
    status: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    order: {
      type: Number,
      required: true,
      default: 1,
    },
  },
  { timestamps: true },
);

const SubCategory = mongoose.model('SubCategory', subCategorySchema);

export default SubCategory;
