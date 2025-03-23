import mongoose from 'mongoose';

const typeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    slug: { type: String, required: true, unique: true },
    status: { type: Boolean, default: false},
  },
  { timestamps: true }
);

const Type = mongoose.model('Type', typeSchema);

export default Type;
