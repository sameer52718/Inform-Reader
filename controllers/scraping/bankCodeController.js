import BaseController from '../BaseController.js';
import BankCode from '../../models/BankCode.js';
import Country from '../../models/Country.js';

class BankCodeController extends BaseController {
  constructor() {
    super();
    this.insert = this.insert.bind(this);
  }

  async insert(req, res, next) {
    try {
      const data = req.body; // Expecting an array of BankCode objects

      // Validate that the request body is an array and not empty
      if (!Array.isArray(data) || data.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid request: Expected an array of BankCode data.',
        });
      }

      const countries = await Country.find({});

      const countryMap = new Map();

      countries.map((item) => countryMap.set(item.name, item._id));

      // Process each BankCode entry
      const bankCodesToInsert = data.map((bankData) => {
        return {
          countryId: countryMap.get(bankData.country) || null,
          bank: bankData.bank,
          city: bankData.city,
          branch: bankData.branch || '',
          swiftCode: bankData.swiftCode.toUpperCase(),
        };
      });

      // Insert multiple BankCode entries at once
      await BankCode.insertMany(bankCodesToInsert);

      res.status(201).json({
        success: true,
        message: 'BankCode entries added successfully',
      });
    } catch (error) {
      return this.handleError(next, error.message);
    }
  }
}

export default new BankCodeController();
