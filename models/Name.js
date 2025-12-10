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
  },
  { timestamps: true },
);

nameSchema.index({ categoryId: 1, _id: 1 });

const Name = mongoose.model('Name', nameSchema);
export default Name;
