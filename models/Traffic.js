import mongoose from 'mongoose';

const trafficSchema = new mongoose.Schema(
  {
    ip: { type: String, required: true },
    endpoint: { type: String, required: true },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const Traffic = mongoose.model('Traffic', trafficSchema);

export default Traffic;
