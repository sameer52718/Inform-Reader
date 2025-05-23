import BaseController from '../BaseController.js';
import Biography from '../../models/Biography.js';

class BiographyController extends BaseController {
  constructor() {
    super();
    this.get = this.get.bind(this);
    this.filterByCategory = this.filterByCategory.bind(this);
    this.detail = this.detail.bind(this);
  }

  async get(req, res, next) {
    try {
      let { isDeleted, search } = req.query;

      const filters = { isDeleted: false };
      if (isDeleted) filters.isDeleted = true;

      // Step 1: Get 25 random category IDs
      const randomCategories = await Biography.aggregate([{ $match: filters }, { $group: { _id: '$categoryId' } }, { $sample: { size: 25 } }]);
      const categoryIds = randomCategories.map((cat) => cat._id);

      // Step 2: Match biographies in those categories, perform lookup, filter on search
      const searchRegex = search ? new RegExp(search, 'i') : null;

      const biographies = await Biography.aggregate([
        { $match: { ...filters, categoryId: { $in: categoryIds } } },
        {
          $lookup: {
            from: 'categories',
            localField: 'categoryId',
            foreignField: '_id',
            as: 'category',
          },
        },
        { $unwind: '$category' },
        // Filter based on search if provided
        ...(search
          ? [
              {
                $match: {
                  $or: [{ name: { $regex: searchRegex } }, { 'category.name': { $regex: searchRegex } }],
                },
              },
            ]
          : []),
        {
          $group: {
            _id: '$categoryId',
            categoryName: { $first: '$category.name' },
            biographies: {
              $push: { name: '$name', _id: '$_id', image: '$image' },
            },
          },
        },
        {
          $project: {
            _id: 1,
            categoryName: 1,
            biographies: { $slice: ['$biographies', 12] },
          },
        },
      ]);

      return res.status(200).json({
        error: false,
        categories: biographies,
      });
    } catch (error) {
      return this.handleError(next, error.message || 'An unexpected error occurred', 500);
    }
  }

  async filterByCategory(req, res, next) {
    try {
      let { page = 1, limit = 10, isDeleted, search } = req.query;
      const { categoryId } = req.params;

      page = parseInt(page);
      limit = parseInt(limit);
      const skip = (page - 1) * limit;

      // Construct filters
      const filters = {
        categoryId,
        isDeleted: false,
      };
      if (isDeleted) filters.isDeleted = true;
      if (search) {
        filters.name = { $regex: search, $options: 'i' }; // Case-insensitive name filter
      }

      // Query with filters, pagination, and optional search
      const biographies = await Biography.find(filters).populate('categoryId', 'name').select('name image').skip(skip).limit(limit);

      const totalBiographies = await Biography.countDocuments(filters);
      const totalPages = Math.ceil(totalBiographies / limit);

      return res.status(200).json({
        error: false,
        biographies,
        pagination: {
          totalItems: totalBiographies,
          currentPage: page,
          totalPages,
          pageSize: limit,
        },
      });
    } catch (error) {
      return this.handleError(next, error.message || 'An unexpected error occurred', 500);
    }
  }

  async detail(req, res, next) {
    try {
      const { biographyId } = req.params;

      // Fetch the primary biography
      const biography = await Biography.findOne({ _id: biographyId, isDeleted: false }).populate('nationalityId', 'name').populate('categoryId', 'name');

      if (!biography) {
        return res.status(404).json({
          error: true,
          message: 'Biography not found',
        });
      }

      // Fetch related biographies from the same category (excluding current one)
      const related = await Biography.find({
        _id: { $ne: biographyId },
        categoryId: biography.categoryId,
        isDeleted: false,
      })
        .populate('nationalityId', 'name')
        .populate('categoryId', 'name');

      return res.status(200).json({
        error: false,
        biography,
        related,
      });
    } catch (error) {
      return this.handleError(next, error.message || 'An unexpected error occurred', 500);
    }
  }
}

export default new BiographyController();
