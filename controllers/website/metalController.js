import BaseController from '../BaseController.js';
import CurrencyRate from '../../models/CurrencyRate.js';
import MetalPrice from '../../models/MetalPrice.js';

class MetalController extends BaseController {
  constructor() {
    super();
    this.getMetalPrices = this.getMetalPrices.bind(this);
    this.convertToMetal = this.convertToMetal.bind(this);
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
}

export default new MetalController();
