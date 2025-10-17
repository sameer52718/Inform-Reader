import BaseController from '../BaseController.js';
import CurrencyRate from '../../models/CurrencyRate.js';
import MetalPrice from '../../models/MetalPrice.js';

class MetalController extends BaseController {
  constructor() {
    super();
    this.getMetalPrices = this.getMetalPrices.bind(this);
    this.convertToMetal = this.convertToMetal.bind(this);
    this.getMetalPricesByCurrency = this.getMetalPricesByCurrency.bind(this);
    this.getMetalCurrencyPair = this.getMetalCurrencyPair.bind(this);
    this.getMetalByName = this.getMetalByName.bind(this);
    this.compareMetals = this.compareMetals.bind(this);
  }

  async getMetalPrices(req, res, next) {
    try {
      const { currency = 'USD', search } = req.query;

      const query = { isActive: true };
      if (search) {
        query.$or = [{ metalCode: { $regex: search, $options: 'i' } }, { fullName: { $regex: search, $options: 'i' } }];
      }

      const metalPrices = await MetalPrice.find(query).populate('baseCurrency', 'baseCurrency symbol').exec();

      const currencyDoc = await CurrencyRate.findOne({ baseCurrency: currency.toUpperCase(), isActive: true });
      if (!currencyDoc && currency.toUpperCase() !== 'USD') {
        return this.handleError(next, `Currency ${currency} not found`, 400);
      }

      const prices = metalPrices.map((metal) => ({
        metalCode: metal.metalCode,
        fullName: metal.fullName,
        symbol: metal.symbol,
        unit: metal.unit,
        price: (currency.toUpperCase() === 'USD' ? metal.priceUSD : metal.conversionPrices.get(currency.toUpperCase()) || 0).toFixed(4),
        currency: currency.toUpperCase(),
        fetchedAt: metal.fetchedAt,
      }));

      return res.status(200).json({
        success: true,
        metalPrices: prices,
      });
    } catch (error) {
      return this.handleError(next, error.message, 500);
    }
  }

  async convertToMetal(req, res, next) {
    try {
      const { amount, currency, metalCode } = req.query;

      if (!amount || isNaN(amount) || amount <= 0) {
        return this.handleError(next, 'Valid amount is required', 400);
      }

      if (!currency || !metalCode) {
        return this.handleError(next, 'Both currency and metalCode are required', 400);
      }

      const currencyDoc = await CurrencyRate.findOne({ baseCurrency: currency.toUpperCase(), isActive: true }).populate('country', 'name flag countryCode');
      const metalDoc = await MetalPrice.findOne({ metalCode: metalCode.toUpperCase(), isActive: true }).populate('baseCurrency', 'baseCurrency symbol');

      if (!currencyDoc || !metalDoc) {
        return this.handleError(next, 'Invalid currency or metal selected', 400);
      }

      const priceInCurrency = currency.toUpperCase() === 'USD' ? metalDoc.priceUSD : metalDoc.conversionPrices.get(currency.toUpperCase());
      console.log(priceInCurrency);

      if (priceInCurrency === undefined) {
        return this.handleError(next, `Price for ${metalCode} in ${currency} not available`, 400);
      }

      const quantity = priceInCurrency === 0 ? 0 : (amount / priceInCurrency).toFixed(6);
      console.log(quantity, 'quantity');

      const metadata = {
        currency: {
          code: currencyDoc.baseCurrency,
          fullName: currencyDoc.fullName,
          symbol: currencyDoc.symbol,
          country: currencyDoc.country
            ? {
                name: currencyDoc.country.name,
                flag: currencyDoc.country.flag,
                countryCode: currencyDoc.country.countryCode,
              }
            : null,
        },
        metal: {
          code: metalDoc.metalCode,
          fullName: metalDoc.fullName,
          symbol: metalDoc.symbol,
          unit: metalDoc.unit,
          price: priceInCurrency.toFixed(4),
        },
      };

      return res.status(200).json({
        success: true,
        result: quantity,
        metadata,
        fetchedAt: metalDoc.fetchedAt,
      });
    } catch (error) {
      return this.handleError(next, error.message, 500);
    }
  }

  async getMetalPricesByCurrency(req, res, next) {
    try {
      const { currency } = req.params;

      if (!currency) {
        return this.handleError(next, 'Currency parameter is required', 400);
      }

      const currencyCode = currency.toUpperCase();

      // Fetch base currency info
      const currencyDoc = await CurrencyRate.findOne({
        baseCurrency: currencyCode,
        isActive: true,
      }).populate('country', 'name flag countryCode');

      if (!currencyDoc && currencyCode !== 'USD') {
        return this.handleError(next, `Currency ${currencyCode} not found`, 404);
      }

      // Fetch metal prices
      const metalPrices = await MetalPrice.find({ isActive: true }).populate('baseCurrency', 'baseCurrency symbol');

      // Prepare converted prices
      const convertedPrices = metalPrices.map((metal) => {
        const price = currencyCode === 'USD' ? metal.priceUSD : metal.conversionPrices.get(currencyCode) || 0;

        return {
          metalCode: metal.metalCode,
          fullName: metal.fullName,
          symbol: metal.symbol,
          unit: metal.unit,
          price: price.toFixed(4),
          currency: currencyCode,
          fetchedAt: metal.fetchedAt,
        };
      });

      // Sort metals by price (highest first)
      convertedPrices.sort((a, b) => b.price - a.price);

      // 🧠 Generate Related Suggestions
      const relatedCurrencies = await CurrencyRate.aggregate([
        { $match: { isActive: true, baseCurrency: { $ne: currencyCode } } },
        { $sample: { size: 5 } },
        {
          $project: {
            _id: 0,
            baseCurrency: 1,
            fullName: 1,
            symbol: 1,
          },
        },
      ]);

      const suggestions = relatedCurrencies.map((c) => ({
        code: c.baseCurrency,
        name: c.fullName,
        symbol: c.symbol,
        url: `/metals/price/${c.baseCurrency.toLowerCase()}`,
      }));

      // SEO Metadata
      const seo = {
        title: `Today's Metal Prices in ${currencyCode}`,
        description: `Get the latest ${currencyCode} metal prices — including Gold, Silver, Platinum, and more. Updated live with accurate conversion rates.`,
      };

      // Response
      return res.status(200).json({
        success: true,
        currency: {
          code: currencyDoc?.baseCurrency || 'USD',
          fullName: currencyDoc?.fullName || 'US Dollar',
          symbol: currencyDoc?.symbol || '$',
          country: currencyDoc?.country || null,
        },
        data: convertedPrices,
        related: suggestions,
        seo,
      });
    } catch (error) {
      return this.handleError(next, error.message, 500);
    }
  }

  async getMetalByCode(req, res, next) {
    try {
      const { metal } = req.params;

      if (!metal) {
        return this.handleError(next, 'Metal code is required in the URL (e.g., /metals/gold)', 400);
      }

      // Find the metal document (case-insensitive)
      const metalDoc = await MetalPrice.findOne({
        metalCode: { $regex: `^${metal}$`, $options: 'i' },
        isActive: true,
      }).populate('baseCurrency', 'baseCurrency symbol');

      if (!metalDoc) {
        return this.handleError(next, `Metal '${metal}' not found`, 404);
      }

      // Get all active currencies
      const allCurrencies = await CurrencyRate.find({ isActive: true }).select('baseCurrency symbol fullName country').populate('country', 'name flag countryCode').lean();

      // Prepare price list for all currencies
      const metalPrices = allCurrencies.map((currency) => {
        const price = currency.baseCurrency === 'USD' ? metalDoc.priceUSD : metalDoc.conversionPrices.get(currency.baseCurrency) || 0;

        return {
          currencyCode: currency.baseCurrency,
          fullName: currency.fullName,
          symbol: currency.symbol,
          price: price.toFixed(4),
          country: currency.country
            ? {
                name: currency.country.name,
                flag: currency.country.flag,
                countryCode: currency.country.countryCode,
              }
            : null,
        };
      });

      // Create related suggestions (other metals)
      const relatedMetals = await MetalPrice.find({
        isActive: true,
        metalCode: { $ne: metalDoc.metalCode },
      })
        .select('metalCode fullName symbol')
        .limit(5)
        .lean();

      const relatedSuggestions = relatedMetals.map((m) => ({
        code: m.metalCode,
        name: m.fullName,
        symbol: m.symbol,
        url: `/metals/${m.metalCode.toLowerCase()}`,
      }));

      // Build response
      const data = {
        metal: {
          code: metalDoc.metalCode,
          fullName: metalDoc.fullName,
          symbol: metalDoc.symbol,
          unit: metalDoc.unit,
        },
        prices: metalPrices,
        updatedAt: metalDoc.fetchedAt,
      };

      const seo = {
        title: `Live ${metalDoc.fullName} Prices in All Currencies - ${new Date().getFullYear()}`,
        description: `Get the latest ${metalDoc.fullName} (symbol: ${metalDoc.symbol}) prices in USD, PKR, INR, EUR, and more. Updated market rates with live conversion.`,
      };

      return res.status(200).json({
        success: true,
        data,
        related: relatedSuggestions,
        seo,
      });
    } catch (error) {
      return this.handleError(next, error.message, 500);
    }
  }

  async getMetalByName(req, res, next) {
    try {
      const { metal } = req.params;

      if (!metal) {
        return this.handleError(next, 'Metal name is required in the URL (e.g., /metals/gold)', 400);
      }

      // Find by fullName (case-insensitive)
      const metalDoc = await MetalPrice.findOne({
        fullName: { $regex: `^${metal}$`, $options: 'i' },
        isActive: true,
      }).populate('baseCurrency', 'baseCurrency symbol');

      if (!metalDoc) {
        return this.handleError(next, `Metal '${metal}' not found`, 404);
      }

      // Fetch all active currencies
      const allCurrencies = await CurrencyRate.find({ isActive: true }).select('baseCurrency symbol fullName country').populate('country', 'name flag countryCode').lean();

      // Prepare price list
      const metalPrices = allCurrencies.map((currency) => {
        const price = currency.baseCurrency === 'USD' ? metalDoc.priceUSD : metalDoc.conversionPrices.get(currency.baseCurrency) || 0;

        return {
          currencyCode: currency.baseCurrency,
          fullName: currency.fullName,
          symbol: currency.symbol,
          price: price.toFixed(4),
          country: currency.country
            ? {
                name: currency.country.name,
                flag: currency.country.flag,
                countryCode: currency.country.countryCode,
              }
            : null,
        };
      });

      // Related suggestions (other metals)
      const relatedMetals = await MetalPrice.find({
        isActive: true,
        fullName: { $ne: metalDoc.fullName },
      })
        .select('metalCode fullName symbol')
        .limit(5)
        .lean();

      const relatedSuggestions = relatedMetals.map((m) => ({
        name: m.fullName,
        symbol: m.symbol,
        url: `/metals/${m.fullName.toLowerCase().replace(/\s+/g, '-')}`,
      }));

      // Response data
      const data = {
        metal: {
          name: metalDoc.fullName,
          code: metalDoc.metalCode,
          symbol: metalDoc.symbol,
          unit: metalDoc.unit,
        },
        prices: metalPrices,
        updatedAt: metalDoc.fetchedAt,
      };

      const seo = {
        title: `Live ${metalDoc.fullName} Prices in All Currencies - ${new Date().getFullYear()}`,
        description: `Get the latest ${metalDoc.fullName} (${metalDoc.symbol}) prices in USD, PKR, INR, EUR, and more. Updated live market rates with real-time conversions.`,
      };

      return res.status(200).json({
        success: true,
        data,
        related: relatedSuggestions,
        seo,
      });
    } catch (error) {
      return this.handleError(next, error.message, 500);
    }
  }

  async getMetalCurrencyPair(req, res, next) {
    try {
      const { pair } = req.params; // e.g. "gold-in-usd"
      const [metalName, currencyCode] = pair.split('-in-');

      if (!metalName || !currencyCode) {
        return this.handleError(next, "Invalid metal-currency pair format. Use 'metal-in-currency'.", 400);
      }

      const metalDoc = await MetalPrice.findOne({
        fullName: { $regex: `^${metalName}$`, $options: 'i' },
        isActive: true,
      })
        .populate('baseCurrency', 'baseCurrency symbol')
        .exec();

      const currencyDoc = await CurrencyRate.findOne({
        baseCurrency: currencyCode.toUpperCase(),
        isActive: true,
      })
        .populate('country', 'name flag countryCode')
        .exec();

      if (!metalDoc) return this.handleError(next, `Metal '${metalName}' not found`, 404);
      if (!currencyDoc) return this.handleError(next, `Currency '${currencyCode}' not found`, 404);

      const price = currencyCode.toUpperCase() === 'USD' ? metalDoc.priceUSD : metalDoc.conversionPrices.get(currencyCode.toUpperCase()) || null;

      if (!price) {
        return this.handleError(next, `Price for ${metalDoc.fullName} in ${currencyCode.toUpperCase()} not available`, 400);
      }

      // Related metals for suggestion
      const relatedMetals = await MetalPrice.aggregate([
        { $match: { _id: { $ne: metalDoc._id }, isActive: true } },
        { $sample: { size: 5 } },
        {
          $project: {
            name: '$fullName',
            symbol: 1,
            url: {
              $concat: ['/metals/', { $toLower: '$fullName' }, '/', currencyCode.toLowerCase()],
            },
          },
        },
      ]);

      return res.status(200).json({
        success: true,
        data: {
          metal: {
            name: metalDoc.fullName,
            symbol: metalDoc.symbol,
            unit: metalDoc.unit,
            price: price.toFixed(4),
          },
          currency: {
            code: currencyDoc.baseCurrency,
            name: currencyDoc.fullName,
            symbol: currencyDoc.symbol,
            country: currencyDoc.country
              ? {
                  name: currencyDoc.country.name,
                  flag: currencyDoc.country.flag,
                  countryCode: currencyDoc.country.countryCode,
                }
              : null,
          },
          fetchedAt: metalDoc.fetchedAt,
        },
        related: relatedMetals,
        seo: {
          title: `${metalDoc.fullName} Price in ${currencyDoc.baseCurrency} (${currencyDoc.symbol})`,
          description: `Live ${metalDoc.fullName} price in ${currencyDoc.fullName}. 1 ${metalDoc.unit} = ${price.toFixed(2)} ${currencyDoc.symbol}.`,
        },
      });
    } catch (error) {
      return this.handleError(next, error.message, 500);
    }
  }

  async compareMetals(req, res, next) {
    try {
      const { metal } = req.params; // Example: gold-vs-silver
      const [metal1Name, metal2Name] = metal.split('-vs-');
      console.log(metal);

      if (!metal1Name || !metal2Name) {
        return this.handleError(next, 'Both metal names are required', 400);
      }

      // Find both metal documents by name (case-insensitive)
      const [metal1, metal2] = await Promise.all([
        MetalPrice.findOne({ fullName: { $regex: `^${metal1Name}$`, $options: 'i' }, isActive: true }).populate('baseCurrency', 'baseCurrency symbol'),
        MetalPrice.findOne({ fullName: { $regex: `^${metal2Name}$`, $options: 'i' }, isActive: true }).populate('baseCurrency', 'baseCurrency symbol'),
      ]);

      if (!metal1 || !metal2) {
        return this.handleError(next, 'One or both metals not found', 404);
      }

      // Compare their USD prices
      const ratio = metal1.priceUSD && metal2.priceUSD ? (metal1.priceUSD / metal2.priceUSD).toFixed(6) : null;

      const data = {
        base: {
          fullName: metal1.fullName,
          code: metal1.metalCode,
          symbol: metal1.symbol,
          unit: metal1.unit,
          priceUSD: metal1.priceUSD.toFixed(4),
          fetchedAt: metal1.fetchedAt,
        },
        quote: {
          fullName: metal2.fullName,
          code: metal2.metalCode,
          symbol: metal2.symbol,
          unit: metal2.unit,
          priceUSD: metal2.priceUSD.toFixed(4),
          fetchedAt: metal2.fetchedAt,
        },
        ratio: ratio ? `1 ${metal1.symbol} = ${ratio} ${metal2.symbol}` : 'Comparison data unavailable',
      };

      // Related metals for suggestions
      const related = await MetalPrice.aggregate([
        { $match: { isActive: true, name: { $nin: [metal1.name, metal2.name] } } },
        { $sample: { size: 5 } },
        { $project: { name: 1, metalCode: 1, symbol: 1 } },
      ]);

      const seo = {
        title: `${metal1.name} vs ${metal2.name} – Metal Comparison`,
        description: `Compare ${metal1.name} and ${metal2.name} live metal prices per unit. See real-time price ratio and performance overview.`,
      };

      return res.status(200).json({
        success: true,
        data,
        related,
        seo,
      });
    } catch (error) {
      return this.handleError(next, error.message, 500);
    }
  }
}

export default new MetalController();
