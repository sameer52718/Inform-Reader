import BaseController from '../BaseController.js';
import Specification from '../../models/Specification.js';
import Category from '../../models/Category.js';
import mongoose from 'mongoose';
import Brand from '../../models/Brand.js';

class SpecificationController extends BaseController {
  constructor() {
    super();
    this.get = this.get.bind(this);
    this.getAll = this.getAll.bind(this);
    this.detail = this.detail.bind(this);
    this.wishlist = this.wishlist.bind(this);
  }

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
        // Sort by category order to maintain fixed sequence
        {
          $sort: {
            'categoryInfo.order': 1,
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
                  priceSymbol: '$$spec.priceSymbol', // Fixed typo: priceSymbal -> priceSymbol
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
        success: true,
        data: categories,
      });
    } catch (error) {
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
      const { category: categoryId } = req.params;
      const {
        page = 1,
        limit = 10,
        sortBy = 'latest',
        brand,
        priceRange,
        availability,
        condition,
        ram,
        storage,
        camera,
        battery,
        screenSize,
        displayType,
        processor,
        os,
        network,
        features,
        laptopType,
        storageType,
        graphicsCard,
        displayResolution,
        connectivity,
        cameraType,
        megapixels,
        sensorType,
        lensMount,
        videoResolution,
        cameraFeatures,
        accessoryType,
        compatibility,
        color,
        accessoryFeatures,
        resolution,
        smartTv,
        tvFeatures,
        consoleType,
        consoleStorage,
        consoleFeatures,
        printerType,
        printerConnectivity,
        printSpeed,
        printerFeatures,
        networkProductType,
        networkSpeed,
        band,
        networkFeatures,
        applianceType,
        capacity,
        applianceFeatures,
      } = req.query;

      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);
      const skip = (pageNum - 1) * limitNum;

      // Validate categoryId parameter
      if (!mongoose.Types.ObjectId.isValid(categoryId)) {
        return next({
          status: 400,
          message: 'Valid Category ID is required',
        });
      }

      // Find category by ID
      const categoryDoc = await Category.findById(categoryId);
      if (!categoryDoc) {
        return next({
          status: 404,
          message: `Category with ID '${categoryId}' not found`,
        });
      }

      // Build query
      const query = {
        categoryId: new mongoose.Types.ObjectId(categoryId),
      };

      // Apply general filters
      if (brand) {
        const brandNames = brand.split(',').map((b) => b.trim());
        const brands = await Brand.find({ name: { $in: brandNames } }).select('_id');
        query.brandId = { $in: brands.map((b) => b._id) };
      }
      if (priceRange) {
        const ranges = priceRange.split(',').map((r) => r.trim());
        query.$or = ranges.map((range) => {
          if (range === '0-10000') return { price: { $lte: 10000 } };
          if (range === '10000-20000') return { price: { $gte: 10000, $lte: 20000 } };
          if (range === '20000-50000') return { price: { $gte: 20000, $lte: 50000 } };
          if (range === '50000-100000') return { price: { $gte: 50000, $lte: 100000 } };
          if (range === '100000-') return { price: { $gte: 100000 } };
          return {};
        });
      }

      if (availability) {
        query['data.availability'] = { $in: availability.split(',').map((a) => a.trim()) };
      }
      if (condition) {
        query['data.condition'] = { $in: condition.split(',').map((c) => c.trim()) };
      }

      // Apply category-specific filters based on category name
      const categoryName = categoryDoc.name;
      if (categoryName === 'Mobiles & Tablets') {
        if (ram) query['data.ram'] = { $in: ram.split(',').map((r) => r.trim()) };
        if (storage) query['data.storageCapacity'] = { $in: storage.split(',').map((s) => s.trim()) };
        if (camera) query['data.cameraMegapixels'] = { $in: camera.split(',').map((c) => c.trim()) };
        if (battery) {
          query['data.batteryCapacity'] = {
            $or: battery.split(',').map((b) => {
              if (b === '0-4000') return { $lte: 4000 };
              if (b === '4000-5000') return { $gte: 4000, $lte: 5000 };
              if (b === '5000-6000') return { $gte: 5000, $lte: 6000 };
              if (b === '6000-') return { $gte: 6000 };
              return {};
            }),
          };
        }
        if (screenSize) {
          const screenSizeConditions = screenSize.split(',').map((s) => {
            if (s === '0-13') return { 'data.screenSize': { $lte: 13 } };
            if (s === '13-14') return { 'data.screenSize': { $gte: 13, $lte: 14 } };
            if (s === '15-16') return { 'data.screenSize': { $gte: 15, $lte: 16 } };
            if (s === '16-') return { 'data.screenSize': { $gte: 16 } };
            return {};
          });

          query.$or = screenSizeConditions;
        }
        if (displayType) query['data.displayType'] = { $in: displayType.split(',').map((d) => d.trim()) };
        if (processor) query['data.processorType'] = { $in: processor.split(',').map((p) => new RegExp(p.trim(), 'i')) };
        if (os) query['data.operatingSystem'] = { $in: os.split(',').map((o) => o.trim()) };
        if (network) query['data.networkSupport'] = { $in: network.split(',').map((n) => n.trim()) };
        if (features) query['data.features'] = { $in: features.split(',').map((f) => f.trim()) };
      } else if (categoryName === 'Laptops & Computers') {
        if (processor) query['data.processorType'] = { $in: processor.split(',').map((p) => new RegExp(p.trim(), 'i')) };
        if (ram) query['data.ram'] = { $in: ram.split(',').map((r) => r.trim()) };
        if (storageType) query['data.storageType'] = { $in: storageType.split(',').map((s) => s.trim()) };
        if (storage) query['data.storageCapacity'] = { $in: storage.split(',').map((s) => s.trim()) };
        if (screenSize) {
          const screenSizeConditions = screenSize.split(',').map((s) => {
            if (s === '0-13') return { 'data.screenSize': { $lte: 13 } };
            if (s === '13-14') return { 'data.screenSize': { $gte: 13, $lte: 14 } };
            if (s === '15-16') return { 'data.screenSize': { $gte: 15, $lte: 16 } };
            if (s === '16-') return { 'data.screenSize': { $gte: 16 } };
            return {};
          });

          query.$or = screenSizeConditions;
        }
        if (graphicsCard) query['data.graphicsCard'] = { $in: graphicsCard.split(',').map((g) => new RegExp(g.trim(), 'i')) };
        if (os) query['data.operatingSystem'] = { $in: os.split(',').map((o) => o.trim()) };
        if (laptopType) query['data.laptopType'] = { $in: laptopType.split(',').map((l) => l.trim()) };
        if (displayResolution) query['data.displayResolution'] = { $in: displayResolution.split(',').map((d) => d.trim()) };
      } else if (categoryName === 'Cameras & Drones') {
        if (cameraType) query['data.cameraType'] = { $in: cameraType.split(',').map((c) => c.trim()) };
        if (megapixels) {
          query['data.cameraMegapixels'] = {
            $or: megapixels.split(',').map((m) => {
              if (m === '0-16') return { $lte: 16 };
              if (m === '16-24') return { $gte: 16, $lte: 24 };
              if (m === '24-36') return { $gte: 24, $lte: 36 };
              if (m === '36-') return { $gte: 36 };
              return {};
            }),
          };
        }
        if (sensorType) query['data.sensorType'] = { $in: sensorType.split(',').map((s) => s.trim()) };
        if (lensMount) query['data.lensMount'] = { $in: lensMount.split(',').map((l) => l.trim()) };
        if (videoResolution) query['data.videoResolution'] = { $in: videoResolution.split(',').map((v) => v.trim()) };
        if (cameraFeatures) query['data.cameraFeatures'] = { $in: cameraFeatures.split(',').map((f) => f.trim()) };
      } else if (categoryName === 'TVs & Home Entertainment') {
        if (screenSize) {
          const screenSizeConditions = screenSize.split(',').map((s) => {
            if (s === '0-13') return { 'data.screenSize': { $lte: 13 } };
            if (s === '13-14') return { 'data.screenSize': { $gte: 13, $lte: 14 } };
            if (s === '15-16') return { 'data.screenSize': { $gte: 15, $lte: 16 } };
            if (s === '16-') return { 'data.screenSize': { $gte: 16 } };
            return {};
          });

          query.$or = screenSizeConditions;
        }
        if (resolution) query['data.resolution'] = { $in: resolution.split(',').map((r) => r.trim()) };
        if (displayType) query['data.displayType'] = { $in: displayType.split(',').map((d) => d.trim()) };
        if (smartTv) query['data.smartTv'] = { $in: smartTv.split(',').map((s) => s.trim()) };
        if (tvFeatures) query['data.tvFeatures'] = { $in: tvFeatures.split(',').map((f) => f.trim()) };
      } else if (categoryName === 'Gaming') {
        if (consoleType) query['data.consoleType'] = { $in: consoleType.split(',').map((c) => c.trim()) };
        if (consoleStorage) query['data.consoleStorage'] = { $in: consoleStorage.split(',').map((s) => s.trim()) };
        if (consoleFeatures) query['data.consoleFeatures'] = { $in: consoleFeatures.split(',').map((f) => f.trim()) };
      } else if (categoryName === 'Printers & Office Equipment') {
        if (printerType) query['data.printerType'] = { $in: printerType.split(',').map((p) => p.trim()) };
        if (printerConnectivity) query['data.printerConnectivity'] = { $in: printerConnectivity.split(',').map((c) => c.trim()) };
        if (printSpeed) query['data.printSpeed'] = { $in: printSpeed.split(',').map((p) => p.trim()) };
        if (printerFeatures) query['data.printerFeatures'] = { $in: printerFeatures.split(',').map((f) => f.trim()) };
      } else if (categoryName === 'Home & Kitchen Appliances') {
        if (applianceType) query['data.applianceType'] = { $in: applianceType.split(',').map((a) => a.trim()) };
        if (capacity) query['data.capacity'] = { $in: capacity.split(',').map((c) => c.trim()) };
        if (applianceFeatures) query['data.applianceFeatures'] = { $in: applianceFeatures.split(',').map((f) => f.trim()) };
      }

      // Define aggregation pipeline
      const aggregationPipeline = [
        { $match: query },
        // Lookup category info
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
        // Lookup brand info
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
        // Lookup subcategory info
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
            priceSymbol: 1,
            brandId: 1,
            brandName: '$brand.name',
            categoryId: 1,
            categoryName: '$category.name',
            subCategoryId: 1,
            subCategoryName: '$subCategory.name',
            wishlist: 1,
            data: 1, // Include data for client-side rendering of specifications
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
        case 'name-z-a':
          aggregationPipeline.splice(1, 0, { $sort: { name: -1 } });
          break;
        case 'popularity':
          aggregationPipeline.splice(1, 0, { $sort: { 'wishlist.length': -1 } });
          break;
        case 'latest':
        default:
          aggregationPipeline.splice(1, 0, { $sort: { createdAt: -1 } });
          break;
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

      // Build query with categoryId
      const query = {
        categoryId: category,
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
