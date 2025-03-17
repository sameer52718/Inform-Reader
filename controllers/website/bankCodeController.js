import BaseController from '../BaseController.js';
import BankCode from '../../models/BankCode.js';
import Country from '../../models/Country.js';

class BankCodeController extends BaseController {
  constructor() {
    super();
    this.get = this.get.bind(this);
    this.detail = this.detail.bind(this);
  }

  async get(req, res, next) {
    try {
      const { countryCode, page = 1, limit = 10, search } = req.query;  // Default page to 1 and limit to 10
      const skip = (page - 1) * limit;  // Calculate the skip value based on the current page

      // Validate input fields
      if (!countryCode) {
        return this.handleError(next, 'countryCode is required', 400);
      }

      // Fetch the country by countryCode
      const country = await Country.findOne({ countryCode: countryCode.toLowerCase() });

      if (!country) {
        return this.handleError(next, 'Country not found', 404);
      }

      // Build the query object
      const query = { countryId: country._id };

      if (search) {
          query.bank = { $regex: search, $options: 'i' }; // Case-insensitive search
      }

      // Fetch paginated BankCodes by countryId with skip and limit
      const bankCodes = await BankCode.find(query)
        .skip(skip)
        .limit(parseInt(limit))
        .exec();

      // Count total bank codes to calculate total pages
      const totalBankCodes = await BankCode.countDocuments(query);

      // Calculate total pages based on the total bank codes and limit
      const totalPages = Math.ceil(totalBankCodes / limit);

      // Return paginated BankCodes with pagination metadata
      return res.status(200).json({
        success: true,
        country,
        bankCodes,
        pagination: {
          totalItems: totalBankCodes,
          currentPage: parseInt(page),
          totalPages,
          pageSize: parseInt(limit),
        },
      });
    } catch (error) {
      return this.handleError(next, error.message, 500);
    }
  }

  async detail(req, res, next) {
    try {
        const { swiftCode } = req.params;

        if (!swiftCode) {
            return this.handleError(next, 'swiftCode is required', 400);
        }

        // Fetch the bank details
        const bankCodes = await BankCode.findOne({ swiftCode });

        if (!bankCodes) {
            return res.status(404).json({ success: false, message: 'Bank not found' });
        }

        // Fetch related banks in parallel
        const relatedPromise = BankCode.find({ bank: bankCodes.bank, _id: {$ne: bankCodes._id} }).limit(25);
        const related = await relatedPromise;

        return res.status(200).json({
            success: true,
            bankCodes,
            related, // Include related results
        });
    } catch (error) {
        return this.handleError(next, error.message, 500);
    }
}





}

export default new BankCodeController();
