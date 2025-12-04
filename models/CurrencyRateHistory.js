import mongoose from 'mongoose';

const currencyRateHistorySchema = new mongoose.Schema(
  {
    baseCurrency: { type: String, required: true, uppercase: true },
    conversionRates: { type: Map, of: Number, required: true },
    fetchedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

const CurrencyRateHistory = mongoose.model('CurrencyRateHistory', currencyRateHistorySchema);

export default CurrencyRateHistory;
