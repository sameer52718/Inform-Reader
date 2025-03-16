import BaseController from '../BaseController.js';
import BankCode from '../../models/BankCode.js';
import Country from '../../models/Country.js';

class SpecificationController extends BaseController {
    constructor() {
        super();
        this.get = this.get.bind(this);
    }

    async get(req, res, next) {
        try {
            const { countryCode, page = 1, limit = 10 } = req.query;  // Default page to 1 and limit to 10
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



}

export default new BankCodeController();
