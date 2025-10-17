import BaseController from '../BaseController.js';
import CurrencyRate from '../../models/CurrencyRate.js';
import Country from '../../models/Country.js';

class CurrencyConverterController extends BaseController {
  constructor() {
    super();
    this.getCurrencies = this.getCurrencies.bind(this);
    this.convert = this.convert.bind(this);
    this.getForexPage = this.getForexPage.bind(this);
    this.getCountryForex = this.getCountryForex.bind(this);
  }

  async getCurrencies(req, res, next) {
    try {
      const { search, limit = 50 } = req.query;

      const query = { isActive: true };
      if (search) {
        query.$or = [{ baseCurrency: { $regex: search, $options: 'i' } }, { fullName: { $regex: search, $options: 'i' } }];
      }

      const currencies = await CurrencyRate.find(query).populate('country', 'name flag countryCode').limit(parseInt(limit)).select('baseCurrency fullName symbol country').exec();

      return res.status(200).json({
        success: true,
        currencies,
      });
    } catch (error) {
      return this.handleError(next, error.message, 500);
    }
  }

  async convert(req, res, next) {
    try {
      const { amount, fromCurrency, toCurrency } = req.query;

      if (!amount || isNaN(amount) || amount <= 0) {
        return this.handleError(next, 'Valid amount is required', 400);
      }

      if (!fromCurrency || !toCurrency) {
        return this.handleError(next, 'Both fromCurrency and toCurrency are required', 400);
      }

      const fromRateDoc = await CurrencyRate.findOne({ baseCurrency: fromCurrency.toUpperCase(), isActive: true }).populate('country', 'name flag countryCode');
      const toRateDoc = await CurrencyRate.findOne({ baseCurrency: toCurrency.toUpperCase(), isActive: true }).populate('country', 'name flag countryCode');

      if (!fromRateDoc || !toRateDoc) {
        return this.handleError(next, 'Invalid currency selected', 400);
      }

      const toRate = fromRateDoc.conversionRates.get(toCurrency.toUpperCase());
      if (!toRate) {
        return this.handleError(next, `Conversion rate from ${fromCurrency} to ${toCurrency} not available`, 400);
      }

      const convertedAmount = (amount * toRate) / 1; // Base currency rate is 1
      const metadata = {
        from: {
          code: fromRateDoc.baseCurrency,
          fullName: fromRateDoc.fullName,
          symbol: fromRateDoc.symbol,
          country: fromRateDoc.country
            ? {
                name: fromRateDoc.country.name,
                flag: fromRateDoc.country.flag,
                countryCode: fromRateDoc.country.countryCode,
              }
            : null,
        },
        to: {
          code: toRateDoc.baseCurrency,
          fullName: toRateDoc.fullName,
          symbol: toRateDoc.symbol,
          country: toRateDoc.country
            ? {
                name: toRateDoc.country.name,
                flag: toRateDoc.country.flag,
                countryCode: toRateDoc.country.countryCode,
              }
            : null,
        },
        fetchedAt: fromRateDoc.fetchedAt,
      };

      return res.status(200).json({
        success: true,
        result: convertedAmount.toFixed(2),
        metadata,
      });
    } catch (error) {
      return this.handleError(next, error.message, 500);
    }
  }

  async getForexPage(req, res, next) {
    try {
      const { pair } = req.params;

      if (!pair || !pair.includes('-to-')) {
        return this.handleError(next, 'Invalid currency pair format', 400);
      }

      const [fromCurrency, toCurrency] = pair.split('-to-');

      // Fetch both currency documents
      const fromRateDoc = await CurrencyRate.findOne({
        baseCurrency: fromCurrency.toUpperCase(),
        isActive: true,
      }).populate('country', 'name flag countryCode');

      const toRateDoc = await CurrencyRate.findOne({
        baseCurrency: toCurrency.toUpperCase(),
        isActive: true,
      }).populate('country', 'name flag countryCode');

      if (!fromRateDoc || !toRateDoc) {
        return this.handleError(next, 'Invalid currency codes', 400);
      }

      const toRate = fromRateDoc.conversionRates.get(toCurrency.toUpperCase());
      if (!toRate) {
        return this.handleError(next, `Conversion rate from ${fromCurrency} to ${toCurrency} not available`, 400);
      }

      const rate = parseFloat(toRate.toFixed(4));

      // 🔹 Get all active currencies for suggestions
      const allCurrencies = await CurrencyRate.find({ isActive: true }).select('baseCurrency fullName symbol').populate('country', 'name flag countryCode');

      // 🔹 Filter out current from/to currencies
      const filtered = allCurrencies.filter((c) => c.baseCurrency !== fromCurrency.toUpperCase() && c.baseCurrency !== toCurrency.toUpperCase());

      // 🔹 Build related pairs (like USD-to-INR, USD-to-EUR, etc.)
      // choose first 5 or random 5
      const shuffled = filtered.sort(() => 0.5 - Math.random());
      const relatedPairs = shuffled.slice(0, 5).map((cur) => ({
        pair: `${fromCurrency.toLowerCase()}-to-${cur.baseCurrency.toLowerCase()}`,
        from: fromCurrency.toUpperCase(),
        to: cur.baseCurrency,
        flag: cur.country?.flag || null,
        fullName: cur.fullName,
      }));

      const data = {
        from: {
          code: fromRateDoc.baseCurrency,
          fullName: fromRateDoc.fullName,
          symbol: fromRateDoc.symbol,
          country: fromRateDoc.country || null,
        },
        to: {
          code: toRateDoc.baseCurrency,
          fullName: toRateDoc.fullName,
          symbol: toRateDoc.symbol,
          country: toRateDoc.country || null,
        },
        rate,
        resultFor1Unit: `1 ${fromRateDoc.baseCurrency} = ${rate} ${toRateDoc.baseCurrency}`,
        updatedAt: fromRateDoc.fetchedAt,
        relatedPairs, // 👈 Added new section
      };

      const seo = {
        title: `${fromRateDoc.baseCurrency} to ${toRateDoc.baseCurrency} - Convert ${fromRateDoc.fullName} to ${toRateDoc.fullName}`,
        description: `1 ${fromRateDoc.baseCurrency} equals ${rate} ${toRateDoc.baseCurrency} today. Get live ${fromRateDoc.baseCurrency} to ${toRateDoc.baseCurrency} exchange rate and conversion table.`,
      };

      return res.status(200).json({
        success: true,
        data,
        seo,
      });
    } catch (error) {
      return this.handleError(next, error.message, 500);
    }
  }

  async getCountryForex(req, res, next) {
    try {
      const { country } = req.params; // e.g. "pakistan"

      if (!country) {
        return this.handleError(next, 'Country name is required', 400);
      }

      // 🔹 Step 1: Find country
      const countryDoc = await Country.findOne({
        name: { $regex: `^${country.replaceAll('-', ' ')}$`, $options: 'i' },
      }).select('name flag countryCode region');

      if (!countryDoc) {
        return this.handleError(next, 'Country not found', 404);
      }

      // 🔹 Step 2: Find base currency for this country
      const currencyDoc = await CurrencyRate.findOne({
        country: countryDoc._id,
        isActive: true,
      })
        .populate('country', 'name flag countryCode region')
        .select('baseCurrency fullName symbol conversionRates fetchedAt');

      if (!currencyDoc) {
        return this.handleError(next, 'Currency for this country not found', 404);
      }

      // 🔹 Step 3: Build top conversion list
      const conversions = [];
      const allRates = Array.from(currencyDoc.conversionRates.entries());
      const topRates = allRates.slice(0, 6);

      for (const [toCurrency, rate] of topRates) {
        conversions.push({
          pair: `${currencyDoc.baseCurrency.toLowerCase()}-to-${toCurrency.toLowerCase()}`,
          from: currencyDoc.baseCurrency,
          to: toCurrency,
          rate: rate.toFixed(4),
        });
      }

      // 🔹 Step 4: Find related countries (same region)
      const relatedCountries = await Country.aggregate([
        // 1️⃣ Match countries in the same region, excluding current one
        {
          $match: {
            region: countryDoc.region,
            _id: { $ne: countryDoc._id },
          },
        },

        // 2️⃣ Randomize (optional but useful to mix results)
        { $sample: { size: 10 } },

        // 3️⃣ Project only required fields
        {
          $project: {
            _id: 1,
            name: 1,
            flag: 1,
            countryCode: 1,
            region: 1,
          },
        },
      ]);

      // For each related country, fetch its base currency
      const relatedWithCurrency = [];
      for (const rel of relatedCountries) {
        const relCurrency = await CurrencyRate.findOne({
          country: rel._id,
          isActive: true,
        }).select('baseCurrency fullName');
        if (relCurrency) {
          relatedWithCurrency.push({
            country: rel.name,
            flag: rel.flag,
            code: rel.countryCode,
            currency: relCurrency.baseCurrency,
            currencyName: relCurrency.fullName,
            link: `/forex/${rel.name.toLowerCase().replaceAll(' ', '-')}`,
          });
        }
      }

      // 🔹 Step 5: Combine all data
      const data = {
        country: {
          name: countryDoc.name,
          flag: countryDoc.flag,
          code: countryDoc.countryCode,
          region: countryDoc.region || null,
        },
        currency: {
          code: currencyDoc.baseCurrency,
          name: currencyDoc.fullName,
          symbol: currencyDoc.symbol,
        },
        conversions,
        related: relatedWithCurrency,
        updatedAt: currencyDoc.fetchedAt,
      };

      // 🔹 Step 6: SEO metadata
      const seo = {
        title: `${countryDoc.name} Forex Rates - ${currencyDoc.fullName} (${currencyDoc.baseCurrency})`,
        description: `Check live ${currencyDoc.fullName} (${currencyDoc.baseCurrency}) rates and top forex conversions in ${countryDoc.name}. Compare with other countries in ${
          countryDoc.region || 'the region'
        }.`,
      };

      return res.status(200).json({
        success: true,
        data,
        seo,
      });
    } catch (error) {
      return this.handleError(next, error.message, 500);
    }
  }
}

export default new CurrencyConverterController();
