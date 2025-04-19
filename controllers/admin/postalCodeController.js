import BaseController from '../BaseController.js';
import PostalCode from '../../models/PostalCode.js';

class PostalCodeController extends BaseController {
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

      const postalCodes = await PostalCode.find(filters).populate('adminId', 'name').populate('countryId', 'name').skip(skip).limit(limit);

      const totalPostalCode = await PostalCode.countDocuments(filters);
      const totalPages = Math.ceil(totalPostalCode / limit);

      return res.status(200).json({
        error: false,
        data: postalCodes,
        pagination: {
          totalItems: totalPostalCode,
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
      const { countryId, bank, city, branch, code } = req.body;

      if (!countryId || !bank || !city || !branch || !code) {
        return this.handleError(next, 'All fields (countryId, bank, city, branch, code) are required', 400);
      }

      const existingPostaLCode = await PostalCode.findOne({ code });
      if (existingPostaLCode) {
        return this.handleError(next, 'PostalCode with this name already exists', 400);
      }

      const newPostalCode = await PostalCode.create({
        adminId: _id,
        countryId,
        bank,
        city,
        branch,
        code,
      });

      return res.status(201).json({
        error: false,
        message: 'PostalCode created successfully',
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
      const postalCode = await PostalCode.findOne(filters).populate('adminId', 'name').populate('countryId', 'name');

      return res.status(200).json({
        error: false,
        postalCode,
      });
    } catch (error) {
      return this.handleError(next, error.message || 'An unexpected error occurred', 500);
    }
  }

  async update(req, res, next) {
    try {
      const { _id } = req.user;
      const { id } = req.params;
      const { countryId, bank, city, branch, code } = req.body;

      if (!countryId || !bank || !city || !branch || !code) {
        return this.handleError(next, 'All fields (countryId, bank, city, branch, code) are required', 400);
      }

      const existingPostaLCode = await PostalCode.findById(id);
      if (!existingPostaLCode) {
        return this.handleError(next, 'PostalCode not found', 404);
      }

      const duplicatePostalCode = await PostalCode.findOne({ code, _id: { $ne: id } });
      if (duplicatePostalCode) {
        return this.handleError(next, 'PostalCode with this name already exists', 400);
      }

      // Update the BankCode
      existingPostaLCode.countryId = countryId;
      existingPostaLCode.bank = bank;
      existingPostaLCode.city = city;
      existingPostaLCode.branch = branch;
      existingPostaLCode.code = code;

      await existingPostaLCode.save();

      return res.status(200).json({
        error: false,
        message: 'PostalCode updated successfully',
      });
    } catch (error) {
      return this.handleError(next, error.message || 'An unexpected error occurred', 500);
    }
  }

  async status(req, res, next) {
    try {
      const { id } = req.params;

      const filters = { isDeleted: false, _id: id };
      const postalCode = await PostalCode.findOne(filters);
      if (!postalCode) {
        return this.handleError(next, 'PostalCode not found', 404);
      }

      postalCode.status = !postalCode.status;

      await postalCode.save();

      return res.status(200).json({
        error: false,
        message: `PostalCode status updated successfully to ${postalCode.status ? 'Active' : 'De-Active'}`,
      });
    } catch (error) {
      return this.handleError(next, error.message || 'An unexpected error occurred', 500);
    }
  }

  async delete(req, res, next) {
    try {
      const { id } = req.params;

      const postalCode = await PostalCode.findById(id);
      if (!postalCode) {
        return this.handleError(next, 'PostalCode not found', 404);
      }

      postalCode.isDeleted = !postalCode.isDeleted;
      await postalCode.save();

      return res.status(200).json({
        error: false,
        message: `PostalCode has been ${postalCode.isDeleted ? 'deleted' : 'restored'} successfully`,
      });
    } catch (error) {
      return this.handleError(next, error.message || 'An unexpected error occurred', 500);
    }
  }
}

export default new PostalCodeController();
