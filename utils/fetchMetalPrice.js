import axios from 'axios';
import MetalPrice from '../models/MetalPrice.js';
import CurrencyRate from '../models/CurrencyRate.js';

// Metal metadata mapping
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
    // Fetch USD currency rates
    const usdCurrency = await CurrencyRate.findOne({ baseCurrency: 'USD' });
    if (!usdCurrency || !usdCurrency.conversionRates) {
      throw new Error('USD currency or conversion rates not found in CurrencyRate collection');
    }

    // Fetch metal prices from Metals-API
    const response = await axios.get(`https://metals-api.com/api/latest?access_key=${API_KEY}&base=USD&symbols=${METALS.join(',')}`);
    const data = response.data;

    if (!data.success) {
      console.warn(`Failed to fetch metal prices: ${data.error?.info || 'Unknown error'}`);
      return;
    }

    for (const metalCode of METALS) {
      const rate = data.rates[`USD${metalCode}`] || data.rates[metalCode];

      console.log(`${metalCode}, ${rate} , rate`);

      if (!rate) {
        console.warn(`No rate found for ${metalCode}`);
        continue;
      }

      // Convert rate (1/value) to price in USD
      const priceUSD = rate !== 0 ? rate.toFixed(6) : 0;
      const metadata = METAL_METADATA[metalCode];
      console.log(`${metalCode}, ${priceUSD}, priceusd`);

      // Calculate prices in all supported currencies
      const conversionPrices = new Map();
      for (const [currency, rate] of usdCurrency.conversionRates.entries()) {
        conversionPrices.set(currency, (priceUSD * rate).toFixed(4));
      }

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
    }

    console.log('All metal prices updated successfully.');
  } catch (error) {
    console.error('Error fetching or saving metal prices:', error.message);
  }
}
