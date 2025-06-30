import BaseController from '../BaseController.js';
import Team from '../../models/Team.js';

class TeamController extends BaseController {
  constructor() {
    super();
    this.get = this.get.bind(this);
    this.detail = this.detail.bind(this);
    this.getCountries = this.getCountries.bind(this);
  }

  async get(req, res, next) {
    try {
      // Extract query parameters
      const { status, country, gender, name, league, page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

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

      // Filter by league (ObjectId)
      if (league) {
        filters['leagues.league'] = league;
      }

      // Pagination
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      // Sorting
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

      // Query the database
      const totalTeams = await Team.countDocuments(filters);
      const totalPages = Math.ceil(totalTeams / limitNum);

      const teams = await Team.find(filters).populate('leagues.league', 'name badge').sort(sort).skip(skip).limit(limitNum);

      // Return response
      return res.status(200).json({
        error: false,
        teams,
        pagination: {
          totalItems: totalTeams,
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
      let { idTeam } = req.params;

      const filters = { idTeam };

      const team = await Team.findOne(filters).populate('leagues.league', 'name badge logo');

      if (!team) {
        return this.handleError(next, 'Team not found', 404);
      }

      return res.status(200).json({
        error: false,
        team,
      });
    } catch (error) {
      return this.handleError(next, error.message || 'An unexpected error occurred', 500);
    }
  }

  async getCountries(req, res, next) {
    try {
      const countries = await Team.distinct('country', { isDeleted: false });

      return res.status(200).json({
        error: false,
        countries,
      });
    } catch (error) {
      return this.handleError(next, error.message || 'An unexpected error occurred', 500);
    }
  }
}

export default new TeamController();
