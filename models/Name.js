import mongoose from 'mongoose';
import Religion from './Religion.js';

const nameSchema = new mongoose.Schema(
  {
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    religionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Religion' },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    name: { type: String, required: true },
    initialLetter: { type: String, required: true },
    shortMeaning: { type: String, required: true },
    longMeaning: { type: String, required: true },
    gender: {
      type: String,
      enum: ['MALE', 'FEMALE', 'OTHER'],
      default: 'MALE',
    },
    origion: { type: String, required: true },
    shortName: {
      type: String,
      enum: ['YES', 'NO'],
      default: 'YES',
    },
    nameLength: { type: Number, required: true },
    status: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    slug: { type: String, trim: true, unique: true },
    luckyNumber: { type: Number, default: null, index: true },
    luckyColor: { type: String, default: null },
    luckyStone: { type: String, default: null },
    
    // New fields from Gemini API processing
    origin: {
      language: { type: String, default: null },
      region: { type: String, default: null },
      historical_background: { type: String, default: null },
    },
    country_focus: { type: String, default: null },
    seo: {
      title: { type: String, default: null },
      meta_description: { type: String, default: null },
      h1: { type: String, default: null },
      meta_tags: [{ type: String }],
    },
    focus_keywords: {
      hard_keywords: [{ type: String }],
      query_based_keywords: [{ type: String }],
      paa_keywords: [{ type: String }],
    },
    ai_overview_summary: { type: String, default: null },
    introduction: { type: String, default: null },
    quick_facts: {
      name: { type: String, default: null },
      gender: { type: String, default: null },
      language: { type: String, default: null },
      region: { type: String, default: null },
      meaning_short: { type: String, default: null },
      syllable_count: { type: String, default: null },
      pronunciation: { type: String, default: null },
      name_length: { type: String, default: null },
    },
    meaning: {
      primary: { type: String, default: null },
      linguistic_analysis: { type: String, default: null },
      variations: [{ type: String }],
    },
    etymology: { type: String, default: null },
    cultural_context: { type: String, default: null },
    popularity_trends: { type: String, default: null },
    modern_vs_traditional: { type: String, default: null },
    regional_usage: { type: String, default: null },
    ethnic_community_usage: {
      description: { type: String, default: null },
      regions: [{ type: String }],
      disclaimer: { type: String, default: null },
    },
    traditionally_admired_qualities: { type: String, default: null },
    notable_individuals: [
      {
        name: { type: String },
        description: { type: String },
        field: { type: String },
      },
    ],
    internal_linking_signals: [{ type: String }],
    nicknames: [{ type: String }],
    similar_names: [{ type: String }],
    pronunciation: { type: String, default: null },
    search_intent_analysis: {
      primary_intent: { type: String, default: null },
      secondary_intents: [{ type: String }],
    },
    faqs: [
      {
        question: { type: String },
        answer: { type: String },
      },
    ],
    eeat_note: { type: String, default: null },
    
    // Processing status
    isProcessed: { type: Boolean, default: false },
    processedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

nameSchema.index({ categoryId: 1, _id: 1 });
nameSchema.index({ slug: 1 });
nameSchema.index({ isProcessed: 1 });

const Name = mongoose.model('Name', nameSchema);
export default Name;
