import BaseController from '../BaseController.js';
import BankCode from '../../models/BankCode.js';
import Country from '../../models/Country.js';

class BankCodeController extends BaseController {
  constructor() {
    super();
    this.get = this.get.bind(this);
  }

  async get(req, res, next) {
    try {
      const { countryCode } = req.query;
  
      // Validate input fields
      if (!countryCode) {
        return this.handleError(next, 'countryCode is required', 400);
      }
  
      // Fetch the country by countryCode
      const country = await Country.findOne({ countryCode: countryCode.toLowerCase() });
  
      if (!country) {
        return this.handleError(next, 'Country not found', 404);
      }
  
      // Fetch BankCodes by countryId
      const bankCodes = await BankCode.find({ countryId: country._id });
  
      // Return the BankCodes
      res.status(200).json({
        success: true,
        country,
        bankCodes,
      });
    } catch (error) {
      return this.handleError(next, error.message, 500);
    }
  }
  
}

export default new BankCodeController();
