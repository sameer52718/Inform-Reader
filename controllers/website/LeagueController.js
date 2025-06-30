import BaseController from '../BaseController.js';
import League from '../../models/League.js';

class LeagueController extends BaseController {
  constructor() {
    super();
    this.get = this.get.bind(this);
    this.detail = this.detail.bind(this);
    this.getCountries = this.getCountries.bind(this);
  }

  async get(req, res, next) {
    try {
      // Extract query parameters
      const { status, country, gender, name, isCup, page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

      // Build filters object
      const filters = {};

      // Filter by status (boolean)
      if (status !== undefined) {
        filters.status = status === 'true';
      }

      // Filter by country
      if (country) {
        filters.country = { $regex: country, $options: 'i' };
      }

      // Filter by gender
      if (gender) {
        filters.gender = gender;
      }

      // Filter by name (case-insensitive partial match)
      if (name) {
        filters.name = { $regex: name, $options: 'i' };
      }

      // Filter by isCup (boolean)
      if (isCup !== undefined) {
        filters.isCup = isCup === 'true';
      }

      // Pagination
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      // Sorting
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
      console.log(filters);
      // Query the database
      const totalLeagues = await League.countDocuments(filters);
      const totalPages = Math.ceil(totalLeagues / limitNum);

      const leagues = await League.find(filters).sort(sort).skip(skip).limit(limitNum);

      // Return response
      return res.status(200).json({
        error: false,
        leagues,
        pagination: {
          totalItems: totalLeagues,
          currentPage: pageNum,
          totalPages,
          pageSize: limitNum,
        },
      });
    } catch (error) {
      return this.handleError(next, error.message || 'An unexpected error occurred', 500);
    }
  }

  async detail(req, res, next) {
    try {
      let { idLeague } = req.params;

      const filters = { idLeague };
      console.log(filters);
      const league = await League.findOne(filters);

      if (!league) {
        return this.handleError(next, 'League not found', 404);
      }

      return res.status(200).json({
        error: false,
        league,
      });
    } catch (error) {
      return this.handleError(next, error.message || 'An unexpected error occurred', 500);
    }
  }

  async getCountries(req, res, next) {
    try {
      const countries = await League.distinct('country');

      return res.status(200).json({
        error: false,
        countries,
      });
    } catch (error) {
      return this.handleError(next, error.message || 'An unexpected error occurred', 500);
    }
  }
}

export default new LeagueController();
