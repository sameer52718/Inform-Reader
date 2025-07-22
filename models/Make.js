import mongoose from 'mongoose';

const makeSchema = new mongoose.Schema(
  {
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, required: true, },
    image: { type: String, required: false, trim: true },
    status: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    type: { type: String, default: "CAR", enum: ["CAR", "BIKE"] }
  },
  { timestamps: true },
);

const Make = mongoose.model('Make', makeSchema);

export default Make;
