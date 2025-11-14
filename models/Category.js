import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
  {
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    typeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Type' },
    name: { type: String, required: true },
    status: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    slug: { type: String },
    order: {
      type: Number,
      required: true,
      default: 1,
    },
  },
  { timestamps: true },
);

categorySchema.index({ slug: 1 });

const Category = mongoose.model('Category', categorySchema);

export default Category;
