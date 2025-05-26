import mongoose from 'mongoose';

const currencyRateSchema = new mongoose.Schema(
  {
    baseCurrency: {
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
    country: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Country',
      required: false,
    },
    conversionRates: {
      type: Map,
      of: Number,
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

const CurrencyRate = mongoose.model('CurrencyRate', currencyRateSchema);
export default CurrencyRate;
