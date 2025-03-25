import mongoose from 'mongoose';

const religionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    status: { type: Boolean, default: true }
  },
  { timestamps: true }
);

const Religion = mongoose.model('Religion', religionSchema);
export default Religion;
