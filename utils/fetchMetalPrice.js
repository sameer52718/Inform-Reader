import axios from 'axios';
import MetalPrice from '../models/MetalPrice.js';
import MetalPriceHistory from '../models/MetalPriceHistory.js';
import CurrencyRate from '../models/CurrencyRate.js';
import dotenv from 'dotenv';
dotenv.config();

const METAL_METADATA = {
  XAU: { fullName: 'Gold', symbol: 'Au', unit: 'ounce' },
  XAG: { fullName: 'Silver', symbol: 'Ag', unit: 'ounce' },
  XCU: { fullName: 'Copper', symbol: 'Cu', unit: 'ounce' },
  XPT: { fullName: 'Platinum', symbol: 'Pt', unit: 'ounce' },
  ALU: { fullName: 'Aluminum', symbol: 'Al', unit: 'ounce' },
  NI: { fullName: 'Nickel', symbol: 'Ni', unit: 'ounce' },
  ZNC: { fullName: 'Zinc', symbol: 'Zn', unit: 'ounce' },
  IRON: { fullName: 'Iron Ore', symbol: 'Fe', unit: 'ounce' },
  XPD: { fullName: 'Palladium', symbol: 'Pd', unit: 'ounce' },
  LITHIUM: { fullName: 'Lithium', symbol: 'Li', unit: 'ounce' },
};

const METALS = Object.keys(METAL_METADATA);
const API_KEY = process.env.METALS_API_KEY;

export async function fetchAndSaveMetalPrices() {
  try {
    // 1. USD conversion rates
    const usdCurrency = await CurrencyRate.findOne({ baseCurrency: 'USD' });
    if (!usdCurrency || !usdCurrency.conversionRates) {
      throw new Error('USD conversion rates not found');
    }

    // 2. Fetch metal prices from Metals API
    const response = await axios.get(`https://metals-api.com/api/latest?access_key=${API_KEY}&base=USD&symbols=${METALS.join(',')}`);

    const data = response.data;

    if (!data.success) {
      console.warn(`Failed to fetch metal prices: ${data.error?.info || 'Unknown error'}`);
      return;
    }

    for (const metalCode of METALS) {
      const metadata = METAL_METADATA[metalCode];

      // Metal price from API (typically price is inverse)
      const rate = data.rates[metalCode];

      if (!rate || rate === 0) {
        console.warn(`No rate found for ${metalCode}`);
        continue;
      }

      // Convert API rate -> metal price in USD
      const priceUSD = Number(rate);

      // Convert price in all known currencies
      const conversionPrices = new Map();
      for (const [currency, rate] of usdCurrency.conversionRates.entries()) {
        conversionPrices.set(currency, Number(priceUSD * rate));
      }

      // 3. Update latest metal price
      await MetalPrice.updateOne(
        { metalCode },
        {
          $set: {
            fullName: metadata.fullName,
            symbol: metadata.symbol,
            unit: metadata.unit,
            priceUSD,
            conversionPrices,
            baseCurrency: usdCurrency._id,
            fetchedAt: new Date(data.date),
            isActive: true,
          },
        },
        { upsert: true },
      );

      // 4. Insert history
      await MetalPriceHistory.create({
        metalCode,
        priceUSD,
        conversionPrices,
        fetchedAt: new Date(data.date),
      });
    }

    console.log('All metal prices updated successfully.');
  } catch (error) {
    console.error('Error fetching or saving metal prices:', error.message);
  }
}
