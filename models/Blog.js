import mongoose from 'mongoose';

const blogSchema = new mongoose.Schema(
  {
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: false },
    subCategoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubCategory', required: false },

    name: { type: String, required: true, trim: true },

    blog: { type: String, required: true },
    image: { type: String, required: false, trim: true },
    shortDescription: { type: String, required: true, trim: true },
    writterName: { type: String, required: true },
    tag: { type: [String], default: [] },

    status: { type: Boolean, default: true},
    isDeleted: { type: Boolean, default: false},

    wishList: { type: [mongoose.Schema.Types.ObjectId], ref: 'User', default: [] },


  },
  { timestamps: true }
);

const Blog = mongoose.model('Blog', blogSchema);

export default Blog;
