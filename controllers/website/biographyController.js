import BaseController from '../BaseController.js';
import Biography from '../../models/Biography.js';
import Category from '../../models/Category.js';
import Nationality from '../../models/Nationality.js';

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

      // Apply search filter if provided
      const searchRegex = search ? new RegExp(search, 'i') : null;
      if (searchRegex) {
        filters.$or = [{ name: { $regex: searchRegex } }];
      }

      const biographies = await Biography.aggregate([
        // Match biographies based on filters
        { $match: filters },
        // Group biographies by categoryId
        {
          $group: {
            _id: '$categoryId',
            biographies: { $push: '$$ROOT' },
          },
        },
        // Limit biographies per category to 12
        {
          $project: {
            _id: 0,
            categoryId: '$_id',
            biographies: { $slice: ['$biographies', 12] },
          },
        },
        // Lookup category information
        {
          $lookup: {
            from: 'categories',
            localField: 'categoryId',
            foreignField: '_id',
            as: 'categoryInfo',
          },
        },
        // Unwind categoryInfo to simplify structure
        {
          $unwind: {
            path: '$categoryInfo',
            preserveNullAndEmptyArrays: true,
          },
        },
        // Sort by category order to maintain client-provided sequence
        {
          $sort: {
            'categoryInfo.order': 1,
          },
        },
        // Lookup subcategory information
        {
          $lookup: {
            from: 'subcategories',
            localField: 'biographies.subCategoryId',
            foreignField: '_id',
            as: 'subCategoryInfo',
          },
        },
        // Final projection with mapped biographies
        {
          $project: {
            categoryId: 1,
            categoryName: '$categoryInfo.name',
            categorySlug: '$categoryInfo.slug',
            biographies: {
              $map: {
                input: '$biographies',
                as: 'bio',
                in: {
                  _id: '$$bio._id',
                  name: '$$bio.name',
                  image: '$$bio.image',
                  categorySlug: '$categoryInfo.slug',
                  categoryId: '$$bio.categoryId',
                  subCategoryId: '$$bio.subCategoryId',
                  slug: '$$bio.slug',
                  // Match subCategoryInfo with subCategoryId
                  subCategoryName: {
                    $arrayElemAt: [
                      '$subCategoryInfo.name',
                      {
                        $indexOfArray: ['$subCategoryInfo._id', '$$bio.subCategoryId'],
                      },
                    ],
                  },
                },
              },
            },
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
      let { page = 1, limit = 10, search, subCategoryId, country, industry, gender } = req.query;
      const { categorySlug } = req.params;

      page = parseInt(page);
      limit = parseInt(limit);
      const skip = (page - 1) * limit;

      // Construct filters
      const filters = {
        isDeleted: false,
      };

      const category = await Category.findOne({ slug: categorySlug });
      if (!category) {
        return this.handleError(next, 'Category Not Found', 404);
      }

      filters.categoryId = category._id;

      if (search) {
        filters.name = { $regex: search, $options: 'i' }; // Case-insensitive name filter
      }
      if (subCategoryId) {
        filters.subCategoryId = subCategoryId; // Filter by subCategoryId
      }
      //
      if (country) {
        const nationality = await Nationality.findOne({ name: { $regex: `^${country}$`, $options: 'i' } }).select('_id');
        if (nationality) {
          filters.nationalityId = nationality._id;
        } else {
          filters.nationalityId = null; // No matches if country not found
        }
      }
      if (industry) {
        filters['professionalInformation'] = {
          $elemMatch: {
            $or: [
              { name: 'occupation', value: { $regex: industry, $options: 'i' } },
              { name: 'industry', value: { $regex: industry, $options: 'i' } },
            ],
          },
        };
      }
      if (gender) {
        filters['personalInformation'] = {
          $elemMatch: {
            name: 'gender',
            value: { $regex: `^${gender}$`, $options: 'i' },
          },
        };
      }

      // Query with filters, pagination, and populate related fields
      const biographies = await Biography.find(filters)
        .populate('categoryId', 'name slug')
        .populate('subCategoryId', 'name')
        .populate('nationalityId', 'name')
        .select('name image slug')
        .skip(skip)
        .limit(limit);

      const totalBiographies = await Biography.countDocuments(filters);
      const totalPages = Math.ceil(totalBiographies / limit);

      return res.status(200).json({
        error: false,
        biographies: biographies.map((bio) => ({
          _id: bio._id,
          name: bio.name,
          image: bio.image,
          slug: bio.slug,
          categorySlug: bio.categoryId?.slug,
          categoryName: bio.categoryId?.name,
          subCategoryName: bio.subCategoryId?.name,
          nationality: bio.nationalityId?.name,
        })),
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
      const { biographyId: slug } = req.params;

      // Fetch the primary biography
      const biography = await Biography.findOne({ slug: slug, isDeleted: false }).populate('nationalityId', 'name').populate('categoryId', 'name');

      if (!biography) {
        return res.status(404).json({
          error: true,
          message: 'Biography not found',
        });
      }

      // Fetch related biographies from the same category (excluding current one)
      const related = await Biography.find({
        _id: { $ne: biography._id },
        categoryId: biography.categoryId,
        isDeleted: false,
      })
        .populate('nationalityId', 'name')
        .populate('categoryId', 'name')
        .limit(12);

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
