import mongoose from 'mongoose';

const metalPriceHistorySchema = new mongoose.Schema(
  {
    metalCode: { type: String, required: true, uppercase: true },
    priceUSD: { type: Number, required: true },
    conversionPrices: { type: Map, of: Number, required: true },
    fetchedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

const MetalPriceHistory = mongoose.model('MetalPriceHistory', metalPriceHistorySchema);

export default MetalPriceHistory;
