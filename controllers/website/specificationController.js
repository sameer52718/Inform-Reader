import BaseController from '../BaseController.js';
import Specification from '../../models/Specification.js';
import Category from '../../models/Category.js';
import mongoose from 'mongoose';

class SpecificationController extends BaseController {
  constructor() {
    super();
    this.get = this.get.bind(this);
    this.getAll = this.getAll.bind(this);
    this.detail = this.detail.bind(this);
    this.wishlist = this.wishlist.bind(this);
  }

  // GET: Grouped specifications by category
  async get(req, res, next) {
    try {
      const categories = await Specification.aggregate([
        // Group specifications by categoryId
        {
          $group: {
            _id: '$categoryId',
            specifications: { $push: '$$ROOT' },
          },
        },
        // Limit specifications per category and project relevant fields
        {
          $project: {
            _id: 0,
            categoryId: '$_id',
            specifications: { $slice: ['$specifications', 25] },
          },
        },
        // Randomly sample 25 categories
        { $sample: { size: 25 } },
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
        // Lookup brand information
        {
          $lookup: {
            from: 'brands',
            localField: 'specifications.brandId',
            foreignField: '_id',
            as: 'brandInfo',
          },
        },
        // Lookup subcategory information
        {
          $lookup: {
            from: 'subcategories',
            localField: 'specifications.subCategoryId',
            foreignField: '_id',
            as: 'subCategoryInfo',
          },
        },
        // Final projection with mapped specifications
        {
          $project: {
            categoryId: 1,
            categoryName: '$categoryInfo.name',
            specifications: {
              $map: {
                input: '$specifications',
                as: 'spec',
                in: {
                  _id: '$$spec._id',
                  name: '$$spec.name',
                  image: '$$spec.image',
                  price: '$$spec.price',
                  priceSymbol: '$$spec.priceSymbal', // Fixed typo in field name
                  brandId: '$$spec.brandId',
                  categoryId: '$$spec.categoryId',
                  subCategoryId: '$$spec.subCategoryId',
                  // Match brandInfo with brandId
                  brandName: {
                    $arrayElemAt: [
                      '$brandInfo.name',
                      {
                        $indexOfArray: ['$brandInfo._id', '$$spec.brandId'],
                      },
                    ],
                  },
                  // Match subCategoryInfo with subCategoryId
                  subCategoryName: {
                    $arrayElemAt: [
                      '$subCategoryInfo.name',
                      {
                        $indexOfArray: ['$subCategoryInfo._id', '$$spec.subCategoryId'],
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      ]);

      if (!categories || categories.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No specifications found',
        });
      }

      return res.status(200).json({
        success: true, // Changed 'error: false' to 'success: true' for consistency
        data: categories,
      });
    } catch (error) {
      // Improved error handling with more details
      return next({
        status: 500,
        message: error.message || 'Internal server error',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      });
    }
  }

  async getAll(req, res, next) {
    try {
      // Extract and validate query parameters
      const { category } = req.params;
      const { page = 1, limit = 10, sortBy = 'latest' } = req.query;
      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);
      const skip = (pageNum - 1) * limitNum;

      // Validate category parameter
      if (!category) {
        return next({
          status: 400,
          message: 'Category name is required',
        });
      }

      // Find category by name (case-insensitive for better UX)
      const categoryDoc = await Category.findOne({
        name: { $regex: new RegExp(`^${category}$`, 'i') },
      });

      if (!categoryDoc) {
        return next({
          status: 404,
          message: `Category '${category}' not found`,
        });
      }

      // Build query with categoryId
      const query = {
        categoryId: new mongoose.Types.ObjectId(categoryDoc._id),
      };

      // Define aggregation pipeline
      const aggregationPipeline = [
        { $match: query },
        // Lookup category info (optional, as we already have categoryDoc)
        {
          $lookup: {
            from: 'categories',
            localField: 'categoryId',
            foreignField: '_id',
            as: 'category',
          },
        },
        {
          $unwind: {
            path: '$category',
            preserveNullAndEmptyArrays: true,
          },
        },
        // Lookup brand and subcategory info for completeness
        {
          $lookup: {
            from: 'brands',
            localField: 'brandId',
            foreignField: '_id',
            as: 'brand',
          },
        },
        {
          $unwind: {
            path: '$brand',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: 'subcategories',
            localField: 'subCategoryId',
            foreignField: '_id',
            as: 'subCategory',
          },
        },
        {
          $unwind: {
            path: '$subCategory',
            preserveNullAndEmptyArrays: true,
          },
        },
        // Project relevant fields
        {
          $project: {
            _id: 1,
            name: 1,
            image: 1,
            price: 1,
            priceSymbol: 1, // Fixed typo from priceSymbal
            brandId: 1,
            brandName: '$brand.name',
            categoryId: 1,
            categoryName: '$category.name',
            subCategoryId: 1,
            subCategoryName: '$subCategory.name',
            wishlist: 1,
          },
        },
        { $skip: skip },
        { $limit: limitNum },
      ];

      // Handle sorting
      switch (sortBy.toLowerCase()) {
        case 'hightolowprice':
          aggregationPipeline.splice(1, 0, { $sort: { price: -1 } });
          break;
        case 'lowtohighprice':
          aggregationPipeline.splice(1, 0, { $sort: { price: 1 } });
          break;
        case 'name':
          aggregationPipeline.splice(1, 0, { $sort: { name: 1 } });
          break;
        case 'latest':
          aggregationPipeline.splice(1, 0, { $sort: { createdAt: -1 } });
          break;
        default:
          aggregationPipeline.splice(1, 0, { $sort: { createdAt: -1 } }); // Default to latest instead of random sample
      }

      // Execute aggregation and count total documents in parallel
      const [specifications, totalSpecifications] = await Promise.all([Specification.aggregate(aggregationPipeline), Specification.countDocuments(query)]);

      // Calculate pagination details
      const totalPages = Math.ceil(totalSpecifications / limitNum);

      // Return response
      return res.status(200).json({
        success: true,
        data: specifications,
        pagination: {
          totalItems: totalSpecifications,
          currentPage: pageNum,
          totalPages,
          pageSize: limitNum,
        },
      });
    } catch (error) {
      return next({
        status: 500,
        message: error.message || 'Internal server error',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      });
    }
  }

  // GET DETAIL: By id and categoryId
  async detail(req, res, next) {
    try {
      const { category, id } = req.params;

      // Validate category parameter
      if (!category) {
        return next({
          status: 400,
          message: 'Category name is required',
        });
      }

      // Find category by name (case-insensitive for better UX)
      const categoryDoc = await Category.findOne({
        name: { $regex: new RegExp(`^${category}$`, 'i') },
      });

      if (!categoryDoc) {
        return next({
          status: 404,
          message: `Category '${category}' not found`,
        });
      }

      // Build query with categoryId
      const query = {
        categoryId: new mongoose.Types.ObjectId(categoryDoc._id),
        _id: id,
      };

      const specification = await Specification.findOne(query).populate('categoryId', 'name').populate('brandId', 'name').populate('subCategoryId', 'name');

      if (!specification) {
        return this.handleError(next, 'Specification not found', 404);
      }

      res.status(200).json({
        error: false,
        specification,
      });
    } catch (error) {
      return this.handleError(next, error.message, 500);
    }
  }

  async wishlist(req, res, next) {
    try {
      const { _id: userId } = req.user;
      const { id } = req.body;

      // Validate vehicle existence
      const vehicle = await Specification.findById(id).select('wishlist');
      if (!vehicle) {
        return this.handleError(next, 'Vehicle not found', 404);
      }

      // Check if user is already in wishlist
      const isInWishlist = vehicle.wishlist.includes(userId);

      // Update wishlist: add or remove user
      const updateOperation = isInWishlist
        ? { $pull: { wishlist: userId } } // Remove user from wishlist
        : { $addToSet: { wishlist: userId } }; // Add user to wishlist

      await Specification.findByIdAndUpdate(id, updateOperation, { new: true }).select('wishlist');

      return res.status(200).json({
        success: true,
        message: isInWishlist ? 'Vehicle removed from wishlist' : 'Vehicle added to wishlist',
      });
    } catch (error) {
      return this.handleError(next, error.message || 'Failed to update wishlist', 500);
    }
  }
}

export default new SpecificationController();
