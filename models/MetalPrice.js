import mongoose from 'mongoose';

const metalPriceSchema = new mongoose.Schema(
  {
    metalCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    symbol: {
      type: String,
      required: true,
      trim: true,
    },
    unit: {
      type: String,
      required: true,
      enum: ['ounce', 'ton', 'gram', 'kilogram', 'metric'],
    },
    priceUSD: {
      type: Number,
      required: true,
      min: 0,
    },
    conversionPrices: {
      type: Map,
      of: Number,
      required: true,
      default: {},
    },
    baseCurrency: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CurrencyRate',
      required: true,
    },
    fetchedAt: {
      type: Date,
      default: Date.now,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

const MetalPrice = mongoose.model('MetalPrice', metalPriceSchema);
export default MetalPrice;
