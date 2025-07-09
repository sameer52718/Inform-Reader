import mongoose from 'mongoose';

const modelSchema = new mongoose.Schema(
  {
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    makeId: { type: mongoose.Types.ObjectId, required: false, ref: 'Make' },
    name: { type: String, required: true, },
    image: { type: String, required: false, trim: true },
    status: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

const Model = mongoose.model('Model', modelSchema);

export default Model;
