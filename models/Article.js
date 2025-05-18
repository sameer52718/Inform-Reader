import mongoose from 'mongoose';

const articleSchema = new mongoose.Schema(
  {
    title: { type: String },
    link: { type: String },
    pubDate: { type: Date },
    country: { type: mongoose.Types.ObjectId, ref: 'Country' },
    category: { type: mongoose.Types.ObjectId, ref: 'Category' },
    content: { type: String },
    source: { type: String, default: 'Google' },
  },
  { timestamps: true },
);

articleSchema.index({ link: 1, country: 1 }, { unique: true });
const Article = mongoose.model('Article', articleSchema);

export default Article;
