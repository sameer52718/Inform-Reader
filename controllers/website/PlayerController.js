import BaseController from '../BaseController.js';
import Player from '../../models/Player.js';

class PlayerController extends BaseController {
  constructor() {
    super();
    this.get = this.get.bind(this);
    this.detail = this.detail.bind(this);
    this.getCountries = this.getCountries.bind(this);
  }

  async get(req, res, next) {
    try {
      // Extract query parameters
      const { status, team, nationality, position, gender, name, page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

      // Build filters object
      const filters = {};

      // Filter by status
      if (status) {
        filters.status = status;
      }

      // Filter by team (ObjectId)
      if (team) {
        filters.team = team;
      }

      // Filter by nationality
      if (nationality) {
        filters.nationality = { $regex: nationality, $options: 'i' };
      }

      // Filter by position
      if (position) {
        filters.position = { $regex: position, $options: 'i' };
      }

      // Filter by gender
      if (gender) {
        filters.gender = gender;
      }

      // Filter by name (case-insensitive partial match)
      if (name) {
        filters.name = { $regex: name, $options: 'i' };
      }

      // Pagination
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      // Sorting
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

      // Query the database
      const totalPlayers = await Player.countDocuments(filters);
      const totalPages = Math.ceil(totalPlayers / limitNum);

      const players = await Player.find(filters).populate('team', 'name shortName badge').sort(sort).skip(skip).limit(limitNum);

      // Return response
      return res.status(200).json({
        error: false,
        players,
        pagination: {
          totalItems: totalPlayers,
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
      let { idPlayer } = req.params;

      const filters = { idPlayer };

      const player = await Player.findOne(filters).populate('team', 'name shortName badge logo');

      if (!player) {
        return this.handleError(next, 'Player not found', 404);
      }

      return res.status(200).json({
        error: false,
        player,
      });
    } catch (error) {
      return this.handleError(next, error.message || 'An unexpected error occurred', 500);
    }
  }

  async getCountries(req, res, next) {
    try {
      const countries = await Player.distinct('nationality', { isDeleted: false });

      return res.status(200).json({
        error: false,
        countries,
      });
    } catch (error) {
      return this.handleError(next, error.message || 'An unexpected error occurred', 500);
    }
  }
}

export default new PlayerController();
