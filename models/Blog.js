import mongoose from 'mongoose';
import slugify from 'slugify';

const blogSchema = new mongoose.Schema(
  {
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: false },
    subCategoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubCategory', required: false },

    name: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, trim: true },

    blog: { type: String, required: true },
    image: { type: String, required: false, trim: true },
    shortDescription: { type: String, required: true, trim: true },
    tag: { type: [String], default: [] },

    status: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },

    wishList: { type: [mongoose.Schema.Types.ObjectId], ref: 'User', default: [] },
  },
  { timestamps: true },
);

blogSchema.index({ isDeleted: 1, categoryId: 1, status: 1 });
blogSchema.index({ isDeleted: 1, subCategoryId: 1 });
blogSchema.index({ isDeleted: 1, adminId: 1 });
blogSchema.index({ createdAt: -1 });
blogSchema.index({ tag: 1 });
blogSchema.index({ name: 'text' });

// Pre-save hook to generate unique slug
blogSchema.pre('save', async function (next) {
  if (!this.isModified('name')) {
    return next();
  }

  // Generate base slug from name
  let baseSlug = slugify(this.name, {
    lower: true,
    strict: true,
    remove: /[*+~.()'"!:@]/g,
  });

  // Check for existing slugs and append counter if necessary
  let slug = baseSlug;
  let counter = 1;

  while (await this.constructor.findOne({ slug, _id: { $ne: this._id } })) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  this.slug = slug;
  next();
});

const Blog = mongoose.model('Blog', blogSchema);

export default Blog;
