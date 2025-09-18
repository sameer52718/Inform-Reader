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
    slug: { type: String, trim: true, index: true, unique: true },
  },
  { timestamps: true },
);

nameSchema.index({
  categoryId: 1,
  gender: 1,
  initialLetter: 1,
  status: 1,
  isDeleted: 1,
  name: 1,
});

nameSchema.index({ slug: 1 }, { unique: true });

const Name = mongoose.model('Name', nameSchema);

export default Name;
