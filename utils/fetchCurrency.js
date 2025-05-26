import axios from 'axios'
import CurrencyRate from '../models/currencyRate.js'

const BASE_CURRENCIES = [
    'USD',
    'EUR',
    'GBP',
    'JPY',
    'AUD',
    'CAD',
    'CHF',
    'CNY',
    'SEK',
    'NZD',
    'INR',
    'BRL',
    'ZAR',
    'RUB',
    'SGD',
    'HKD',
    'NOK',
    'KRW',
    'MXN',
    'TRY',
    'IDR',
    'MYR',
    'PLN',
    'PHP',
    'THB',
    'CZK',
    'HUF',
    'DKK',
    'ILS',
    'SAR',
    'AED',
    'VND',
    'PKR',
    'EGP',
    'BDT',
    'KZT',
    'QAR',
    'CLP',
    'COP',
    'PEN',
    'NGN',
    'LKR',
    'UAH',
    'MAD',
    'OMR',
    'BHD',
    'KES',
    'TZS',
    'UGX',
    'GHS',
]

const API_KEY = 'e8b5f1f314b96895bad639c4'

export async function fetchAndSaveCurrencyRates() {
    try {
        const allBulkOperations = []

        for (const baseCurrency of BASE_CURRENCIES) {
            const response = await axios.get(`https://v6.exchangerate-api.com/v6/${API_KEY}/latest/${baseCurrency}`)
            const data = response.data

            if (data.result !== 'success') {
                console.warn(`API response unsuccessful for base currency: ${baseCurrency}`)
                continue
            }

            const { conversion_rates: conversionRates } = data

            const bulkOperations = Object.entries(conversionRates).map(([targetCurrency, rate]) => ({
                updateOne: {
                    filter: { baseCurrency, targetCurrency },
                    update: { $set: { rate, fetchedAt: new Date() } },
                    upsert: true,
                },
            }))

            allBulkOperations.push(...bulkOperations)
        }

        if (allBulkOperations.length > 0) {
            await CurrencyRate.bulkWrite(allBulkOperations)
            console.log('Currency rates updated successfully for all base currencies.')
        } else {
            console.warn('No currency rates to update.')
        }
    } catch (error) {
        console.error('Error fetching or saving currency rates:', error.message)
    }
}
