import mongoose from 'mongoose';

const seasonSchema = new mongoose.Schema(
  {
    league: { type: mongoose.Schema.Types.ObjectId, ref: 'League', required: true },
    season: { type: String, required: true, trim: true }, // e.g., "2024-2025"
    status: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Season = mongoose.model('Season', seasonSchema);

export default Season;