import mongoose from 'mongoose';

const trafficSchema = new mongoose.Schema(
  {
    ip: { type: String },
    endpoint: { type: String, required: true },
    method: { type: String },             // GET, POST, PUT, DELETE
    statusCode: { type: Number },         // Response status code
    userAgent: { type: String },          // Browser / Device info
    referrer: { type: String },           // From where user came
    country: { type: String },            // Geo info (if add later via GeoIP)
    city: { type: String },
    headers: { type: Object },            // Raw headers (optional)
    query: { type: Object },              // Query params
    body: { type: Object },               // Request body (be careful, only if not sensitive)
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

trafficSchema.index({ ip: 1, endpoint: 1, date: 1 });

const Traffic = mongoose.model('Traffic', trafficSchema);

export default Traffic;
