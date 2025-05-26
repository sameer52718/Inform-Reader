import BaseController from '../BaseController.js';
import CurrencyRate from '../../models/CurrencyRate.js';
import Country from '../../models/Country.js';

class CurrencyConverterController extends BaseController {
  constructor() {
    super();
    this.getCurrencies = this.getCurrencies.bind(this);
    this.convert = this.convert.bind(this);
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
}

export default new CurrencyConverterController();
