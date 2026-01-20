import mongoose from "mongoose";

const sitemapSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
      unique: true, // same URL ek se zyada na ho
      trim: true
    },
    lastModified: {
      type: Date,
      default: Date.now
    },
    changeFreq: {
      type: String,
      enum: ["always", "hourly", "daily", "weekly", "monthly", "yearly", "never"],
      default: "weekly"
    },
    priority: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.5
    },
    type: {
      type: String,
      enum: ["page", "product", "blog", "category", "other"],
      default: "page"
    },
    country: {
      type: String,
      required: false
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model("Sitemap", sitemapSchema);
