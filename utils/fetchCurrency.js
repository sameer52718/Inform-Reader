import axios from 'axios';
import CurrencyRate from '../models/CurrencyRate.js';
import Country from '../models/Country.js';
import dotenv from 'dotenv';
import CurrencyRateHistory from '../models/CurrencyRateHistory.js';
dotenv.config();
// Currency metadata mapping
const CURRENCY_METADATA = {
  USD: { fullName: 'United States Dollar', symbol: '$' },
  EUR: { fullName: 'Euro', symbol: '€' },
  GBP: { fullName: 'British Pound Sterling', symbol: '£' },
  JPY: { fullName: 'Japanese Yen', symbol: '¥' },
  AUD: { fullName: 'Australian Dollar', symbol: 'A$' },
  CAD: { fullName: 'Canadian Dollar', symbol: 'C$' },
  CHF: { fullName: 'Swiss Franc', symbol: 'CHF' },
  CNY: { fullName: 'Chinese Yuan', symbol: '¥' },
  SEK: { fullName: 'Swedish Krona', symbol: 'kr' },
  NZD: { fullName: 'New Zealand Dollar', symbol: 'NZ$' },
  INR: { fullName: 'Indian Rupee', symbol: '₹' },
  BRL: { fullName: 'Brazilian Real', symbol: 'R$' },
  ZAR: { fullName: 'South African Rand', symbol: 'R' },
  RUB: { fullName: 'Russian Rubles', symbol: '₽' },
  SGD: { fullName: 'Singapore Dollar', symbol: 'S$' },
  HKD: { fullName: 'Hong Kong Dollar', symbol: 'HK$' },
  NOK: { fullName: 'Norwegian Krone', symbol: 'kr' },
  KRW: { fullName: 'South Korean Won', symbol: '₩' },
  MXN: { fullName: 'Mexican Peso', symbol: '$' },
  TRY: { fullName: 'Turkish Lira', symbol: '₺' },
  IDR: { fullName: 'Indonesian Rupiah', symbol: 'Rp' },
  MYR: { fullName: 'Malaysian Ringgit', symbol: 'RM' },
  PLN: { fullName: 'Polish Zloty', symbol: 'zł' },
  PHP: { fullName: 'Philippine Peso', symbol: '₱' },
  THB: { fullName: 'Thai Baht', symbol: '฿' },
  CZK: { fullName: 'Czech Koruna', symbol: 'Kč' },
  HUF: { fullName: 'Hungarian Forint', symbol: 'Ft' },
  DKK: { fullName: 'Danish Krone', symbol: 'kr' },
  ILS: { fullName: 'Israeli New Shekel', symbol: '₪' },
  SAR: { fullName: 'Saudi Riyal', symbol: '﷼' },
  AED: { fullName: 'United Arab Emirates Dirham', symbol: 'د.إ' },
  VND: { fullName: 'Vietnamese Dong', symbol: '₫' },
  PKR: { fullName: 'Pakistani Rupee', symbol: '₨' },
  EGP: { fullName: 'Egyptian Pound', symbol: '£' },
  BDT: { fullName: 'Bangladeshi Taka', symbol: '৳' },
  KZT: { fullName: 'Kazakhstani Tenge', symbol: '₸' },
  QAR: { fullName: 'Qatari Riyal', symbol: '﷼' },
  CLP: { fullName: 'Chilean Peso', symbol: '$' },
  COP: { fullName: 'Colombian Peso', symbol: '$' },
  PEN: { fullName: 'Peruvian Sol', symbol: 'S/' },
  NGN: { fullName: 'Nigerian Naira', symbol: '₦' },
  LKR: { fullName: 'Sri Lankan Rupee', symbol: '₨' },
  UAH: { fullName: 'Ukrainian Hryvnia', symbol: '₴' },
  MAD: { fullName: 'Moroccan Dirham', symbol: 'د.م.' },
  OMR: { fullName: 'Omani Rial', symbol: '﷼' },
  BHD: { fullName: 'Bahraini Dinar', symbol: 'د.ب' },
  KES: { fullName: 'Kenyan Shilling', symbol: 'KSh' },
  TZS: { fullName: 'Tanzanian Shilling', symbol: 'TSh' },
  UGX: { fullName: 'Ugandan Shilling', symbol: 'USh' },
  GHS: { fullName: 'Ghanaian Cedi', symbol: '₵' },
};

const BASE_CURRENCIES = Object.keys(CURRENCY_METADATA);

const API_KEY = process.env.CURRENCY_EXCHANGE_API_KEY;

export async function fetchAndSaveCurrencyRates() {
  try {
    for (const baseCurrency of BASE_CURRENCIES) {
      const response = await axios.get(`https://v6.exchangerate-api.com/v6/${API_KEY}/latest/${baseCurrency}`);
      const data = response.data;

      if (data.result !== 'success') {
        console.warn(`Failed to fetch for ${baseCurrency}`);
        continue;
      }

      const { conversion_rates: conversionRates } = data;
      const metadata = CURRENCY_METADATA[baseCurrency];

      // Find country associated with the currency (if exists)
      const country = await Country.findOne({
        countryCode: baseCurrency.slice(0, 2),
      });

      await CurrencyRate.updateOne(
        { baseCurrency },
        {
          $set: {
            conversionRates,
            fetchedAt: new Date(),
            fullName: metadata.fullName,
            symbol: metadata.symbol,
            country: country ? country._id : null,
            isActive: true,
          },
        },
        { upsert: true },
      );

      await CurrencyRateHistory.create({
        baseCurrency,
        conversionRates,
        fetchedAt: new Date(),
      });
    }

    console.log('All currency rates updated successfully.');
  } catch (error) {
    console.error('Error fetching or saving currency rates:', error.message);
  }
}
