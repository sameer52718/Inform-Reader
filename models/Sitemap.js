import mongoose from "mongoose";

const sitemapSchema = new mongoose.Schema(
  {
    fileName: { type: String, unique: true, required: true },
    type: { type: String, required: true },
    country: { type: String, required: true },
    batch: { type: Number, required: true },
    xmlContent: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.model("Sitemap", sitemapSchema);
