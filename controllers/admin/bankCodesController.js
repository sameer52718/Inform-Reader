import BaseController from '../BaseController.js';
import BankCode from '../../models/BankCode.js';

class BankCodeController extends BaseController {
  constructor() {
    super();
    this.get = this.get.bind(this);
    this.insert = this.insert.bind(this);
    this.info = this.info.bind(this);
    this.update = this.update.bind(this);
    this.status = this.status.bind(this);
    this.delete = this.delete.bind(this);
  }

  async get(req, res, next) {
    try {
      let { page = 1, limit = 10, isDeleted } = req.query;

      page = parseInt(page);
      limit = parseInt(limit);
      const skip = (page - 1) * limit;

      const filters = { isDeleted: false };

      if (isDeleted) {
        filters.isDeleted = true;
      }

      const bankCodes = await BankCode.find(filters).populate('adminId', 'name').populate('countryId', 'name').skip(skip).limit(limit);

      const totalBankCodes = await BankCode.countDocuments(filters);
      const totalPages = Math.ceil(totalBankCodes / limit);

      return res.status(200).json({
        error: false,
        data: bankCodes,
        pagination: {
          totalItems: totalBankCodes,
          currentPage: page,
          totalPages,
          pageSize: limit,
        },
      });
    } catch (error) {
      return this.handleError(next, error.message || 'An unexpected error occurred', 500);
    }
  }

  async insert(req, res, next) {
    try {
      const { _id } = req.user;
      const { countryId, bank, city, branch, swiftCode } = req.body;

      if (!countryId || !bank || !city || !branch || !swiftCode) {
        return this.handleError(next, 'All fields (countryId, bank, city, branch, swiftCode) are required', 400);
      }

      const existingBankCode = await BankCode.findOne({ swiftCode });
      if (existingBankCode) {
        return this.handleError(next, 'BankCode with this name already exists', 400);
      }

      const newBankCode = await BankCode.create({
        adminId: _id,
        countryId,
        bank,
        city,
        branch,
        swiftCode,
      });

      return res.status(201).json({
        error: false,
        message: 'BankCode created successfully',
      });
    } catch (error) {
      // Centralized error handling
      return this.handleError(next, error.message || 'An unexpected error occurred', 500);
    }
  }

  async info(req, res, next) {
    try {
      let { id } = req.params;

      const filters = { isDeleted: false, _id: id };
      const bankCode = await BankCode.findOne(filters).populate('adminId', 'name').populate('countryId', 'name');

      return res.status(200).json({
        error: false,
        bankCode,
      });
    } catch (error) {
      return this.handleError(next, error.message || 'An unexpected error occurred', 500);
    }
  }

  async update(req, res, next) {
    try {
      const { _id } = req.user;
      const { id } = req.params;
      const { countryId, bank, city, branch, swiftCode } = req.body;

      if (!countryId || !bank || !city || !branch || !swiftCode) {
        return this.handleError(next, 'All fields (countryId, bank, city, branch, swiftCode) are required', 400);
      }

      const existingBankCode = await BankCode.findById(id);
      if (!existingBankCode) {
        return this.handleError(next, 'BankCode not found', 404);
      }

      const duplicateBankCode = await BankCode.findOne({ swiftCode, _id: { $ne: id } });
      if (duplicateBankCode) {
        return this.handleError(next, 'BankCode with this name already exists', 400);
      }

      // Update the BankCode
      existingBankCode.countryId = countryId;
      existingBankCode.bank = bank;
      existingBankCode.city = city;
      existingBankCode.branch = branch;
      existingBankCode.swiftCode = swiftCode;

      await existingBankCode.save();

      return res.status(200).json({
        error: false,
        message: 'BankCode updated successfully',
      });
    } catch (error) {
      return this.handleError(next, error.message || 'An unexpected error occurred', 500);
    }
  }

  async status(req, res, next) {
    try {
      const { id } = req.params;

      const filters = { isDeleted: false, _id: id };
      const bankCode = await BankCode.findOne(filters);
      if (!bankCode) {
        return this.handleError(next, 'BankCode not found', 404);
      }

      bankCode.status = !bankCode.status;

      await bankCode.save();

      return res.status(200).json({
        error: false,
        message: `BankCode status updated successfully to ${bankCode.status ? 'Active' : 'De-Active'}`,
      });
    } catch (error) {
      return this.handleError(next, error.message || 'An unexpected error occurred', 500);
    }
  }

  async delete(req, res, next) {
    try {
      const { id } = req.params;

      const bankCode = await BankCode.findById(id);
      if (!bankCode) {
        return this.handleError(next, 'BankCode not found', 404);
      }

      bankCode.isDeleted = !bankCode.isDeleted;
      await bankCode.save();

      return res.status(200).json({
        error: false,
        message: `BankCode has been ${bankCode.isDeleted ? 'deleted' : 'restored'} successfully`,
      });
    } catch (error) {
      return this.handleError(next, error.message || 'An unexpected error occurred', 500);
    }
  }
}

export default new BankCodeController();
