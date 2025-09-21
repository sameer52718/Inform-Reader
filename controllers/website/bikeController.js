import Category from '../../models/Category.js';
import Vehicle from '../../models/Bike.js';
import BaseController from '../BaseController.js';

class VehicleController extends BaseController {
  constructor() {
    super();
    this.get = this.get.bind(this);
    this.detail = this.detail.bind(this);
  }

  // Helper function to parse year range into MongoDB query conditions
  parseYearRange(yearValue) {
    const currentYear = new Date().getFullYear(); // Get current year (e.g., 2025)
    const filter = {};

    if (!yearValue) return filter; // No year filter if value is empty

    switch (yearValue) {
      case '2023+':
        filter.year = { $gte: 2023 }; // 2023 and newer
        break;
      case '2020-2022':
        filter.year = { $gte: 2020, $lte: 2022 }; // Between 2020 and 2022
        break;
      case '2015-2019':
        filter.year = { $gte: 2015, $lte: 2019 }; // Between 2015 and 2019
        break;
      case '2010-2014':
        filter.year = { $gte: 2010, $lte: 2014 }; // Between 2010 and 2014
        break;
      case '2010-':
        filter.year = { $lte: 2009 }; // 2009 and older
        break;
      default:
        // If an invalid year value is provided, return empty filter or handle error
        break;
    }

    return filter;
  }

  async get(req, res, next) {
    try {
      const { page = 1, limit = 10, search, makeId, category, vehicleType, year } = req.query;

      const parsedLimit = parseInt(limit);
      const parsedPage = parseInt(page);

      // Base filters for active and not-deleted vehicles
      const filter = {
        status: true,
        isDeleted: false,
      };

      // Apply optional filters
      if (makeId) filter.makeId = makeId;
      if (vehicleType) filter.vehicleType = vehicleType.toUpperCase(); // Ensure case consistency

      // Apply name search if provided (case-insensitive)
      if (search) {
        filter.name = { $regex: search, $options: 'i' };
      }

      // Apply year filter if provided
      if (year) {
        const yearFilter = this.parseYearRange(year);
        if (Object.keys(yearFilter).length > 0) {
          Object.assign(filter, yearFilter); // Merge year conditions into filter
        } else {
          // Optionally handle invalid year values
          return this.handleError(next, 'Invalid year range provided', 400);
        }
      }

      // Query the database with pagination
      const vehicleList = await Vehicle.find(filter)
        .select('name year vehicleType image slug')
        .skip((parsedPage - 1) * parsedLimit)
        .limit(parsedLimit);

      const totalCount = await Vehicle.countDocuments(filter);

      // Respond with paginated result
      return res.status(200).json({
        data: vehicleList,
        pagination: {
          totalItems: totalCount,
          totalPages: Math.ceil(totalCount / parsedLimit),
          currentPage: parsedPage,
          pageSize: parsedLimit,
        },
        filters: {
          year, // Echo back the applied year filter for debugging or UI purposes
        },
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Error retrieving vehicle list' });
    }
  }

  async detail(req, res) {
    try {
      const { id: slug } = req.params;

      // Get the main vehicle by ID
      const vehicle = await Vehicle.findOne({
        slug: slug,
        status: true,
        isDeleted: false,
      })
        .populate('makeId', 'name')
        .populate('categoryId', 'name')
        .select('-__v -isDeleted');

      if (!vehicle) {
        return res.status(404).json({ message: 'Vehicle not found' });
      }

      // Fetch related vehicles from the same category
      const relatedVehicles = await Vehicle.find({
        _id: { $ne: vehicle._id }, // Exclude the current vehicle
        status: true,
        isDeleted: false,
        categoryId: vehicle.categoryId._id,
      })
        .limit(20)
        .select('name year vehicleType image slug')
        .lean();

      return res.status(200).json({
        data: vehicle,
        related: relatedVehicles,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Error retrieving vehicle details' });
    }
  }
}

export default new VehicleController();
