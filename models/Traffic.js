import mongoose from 'mongoose';

const trafficSchema = new mongoose.Schema(
  {
    ip: { type: String, required: false },
    endpoint: { type: String, required: true },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

trafficSchema.index({ ip: 1, endpoint: 1, date: 1 });

const Traffic = mongoose.model('Traffic', trafficSchema);

export default Traffic;
