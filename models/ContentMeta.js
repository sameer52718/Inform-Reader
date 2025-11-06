import mongoose from 'mongoose';

const contentMetaSchema = new mongoose.Schema(
  {
    refModel: {
      type: String,
      required: true,
      index: true,
    },
    refId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    language: {
      type: String,
      default: 'en',
      index: true,
    },
    countryCode: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },

    description: {
      type: String,
      trim: true,
    },

    keyFeatures: [
      {
        type: String,
        trim: true,
      },
    ],

    faqs: [
      {
        question: { type: String, trim: true },
        answer: { type: String, trim: true },
      },
    ],

    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    source: {
      type: String,
      default: 'ai',
    },
  },
  { timestamps: true },
);

export default mongoose.model('ContentMeta', contentMetaSchema);
