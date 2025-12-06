import BaseController from '../BaseController.js';
import Country from '../../models/Country.js';
import Software from '../../models/Software.js';
import Name from '../../models/Name.js';
import Specification from '../../models/Specification.js';
import Biography from '../../models/Biography.js';
import Vehicle from '../../models/Vehicle.js';
import Bike from '../../models/Bike.js';
import PostalCode from '../../models/PostalCode.js';
import BankCode from '../../models/BankCode.js';

class HomeController extends BaseController {
  constructor() {
    super();
    this.get = this.get.bind(this);
  }

  async get(req, res, next) {
    try {
      const { host } = req.query;

      let subdomainCountryCode = 'pk';
      try {
        const hostname = new URL(`https://${host}`).hostname;
        const parts = hostname.split('.');
        if (parts.length > 2) {
          subdomainCountryCode = parts[0].toUpperCase();
        }
      } catch {}

      const country = await Country.findOne({
        countryCode: subdomainCountryCode.toLowerCase(),
      });

      if (!country) {
        return res.status(404).json({ message: 'Country not found' });
      }

      /* --------------------------------------------------------------------
         RANDOM STATES (POSTAL CODES)
      -------------------------------------------------------------------- */
      const getRandomStates = () => {
        const match = {
          countryId: country._id,
          isDeleted: false,
          state: { $ne: '' },
          status: true,
        };

        return PostalCode.aggregate([
          { $match: match },
          {
            $group: {
              _id: '$state',
              totalAreas: { $sum: 1 },
              stateSlug: { $first: '$stateSlug' },
              areas: { $addToSet: '$area' },
            },
          },
          { $sample: { size: 12 } },
          {
            $project: {
              _id: 1,
              totalAreas: 1,
              stateSlug: 1,
              areas: { $slice: ['$areas', 5] },
            },
          },
        ]);
      };

      /* --------------------------------------------------------------------
         RANDOM BANKS (BANK CODES)
      -------------------------------------------------------------------- */
      const getRandomBanks = () => {
        const match = {
          countryId: country._id,
          isDeleted: false,
          status: true,
        };

        return BankCode.aggregate([
          { $match: match },
          {
            $group: {
              _id: '$bank',
              totalBranches: { $sum: 1 },
              bankSlug: { $first: '$bankSlug' },
              cities: { $addToSet: '$city' },
              swiftCodes: { $addToSet: '$swiftCode' },
              branches: { $addToSet: '$branch' },
            },
          },
          { $sample: { size: 12 } },
        ]);
      };

      /* --------------------------------------------------------------------
         OTHER RANDOM DATA (unchanged)
      -------------------------------------------------------------------- */

      const getRandomSoftware = () =>
        Software.aggregate([
          { $match: { status: true, isDeleted: false } },
          { $sample: { size: 12 } },
          {
            $lookup: {
              from: 'subcategories',
              localField: 'subCategoryId',
              foreignField: '_id',
              as: 'subCategory',
            },
          },
          { $unwind: { path: '$subCategory', preserveNullAndEmptyArrays: true } },
          {
            $project: {
              _id: 1,
              name: 1,
              logo: 1,
              overview: 1,
              version: 1,
              tag: 1,
              slug: 1,
              subCategory: { _id: 1, name: 1, slug: 1 },
            },
          },
        ]);

      const getRandomNames = () =>
        Name.aggregate([
          { $match: { status: true, isDeleted: false } },
          { $sample: { size: 10 } },
          {
            $project: {
              _id: 1,
              name: 1,
              gender: 1,
              shortMeaning: 1,
              origion: 1,
              slug: 1,
            },
          },
        ]);

      const getRandomSpecifications = () =>
        Specification.aggregate([
          { $match: { status: true, isDeleted: false } },
          { $sample: { size: 12 } },
          {
            $lookup: {
              from: 'categories',
              localField: 'categoryId',
              foreignField: '_id',
              as: 'categoryInfo',
            },
          },
          { $unwind: { path: '$categoryInfo', preserveNullAndEmptyArrays: true } },
          {
            $lookup: {
              from: 'brands',
              localField: 'brandId',
              foreignField: '_id',
              as: 'brandInfo',
            },
          },
          { $unwind: { path: '$brandInfo', preserveNullAndEmptyArrays: true } },
          {
            $lookup: {
              from: 'subcategories',
              localField: 'subCategoryId',
              foreignField: '_id',
              as: 'subCategoryInfo',
            },
          },
          { $unwind: { path: '$subCategoryInfo', preserveNullAndEmptyArrays: true } },
          {
            $project: {
              _id: 1,
              name: 1,
              image: 1,
              price: 1,
              priceSymbol: 1,
              brandId: 1,
              slug: 1,
              categoryId: 1,
              subCategoryId: 1,
              categoryName: '$categoryInfo.name',
              categorySlug: '$categoryInfo.slug',
              brandName: '$brandInfo.name',
              brandSlug: '$brandInfo.slug',
              subCategoryName: '$subCategoryInfo.name',
            },
          },
        ]);

      const getRandomBiographies = () =>
        Biography.aggregate([
          { $match: { status: true, isDeleted: false } },
          { $sample: { size: 12 } },
          {
            $lookup: {
              from: 'categories',
              localField: 'categoryId',
              foreignField: '_id',
              as: 'categoryInfo',
            },
          },
          { $unwind: { path: '$categoryInfo', preserveNullAndEmptyArrays: true } },
          {
            $project: {
              _id: 1,
              name: 1,
              image: 1,
              slug: 1,
              categoryId: 1,
              categoryName: '$categoryInfo.name',
              categorySlug: '$categoryInfo.slug',
            },
          },
        ]);

      const getRandomVehicles = () =>
        Vehicle.aggregate([
          { $match: { status: true, isDeleted: false } },
          { $sample: { size: 12 } },
          {
            $lookup: {
              from: 'categories',
              localField: 'categoryId',
              foreignField: '_id',
              as: 'categoryInfo',
            },
          },
          { $unwind: { path: '$categoryInfo', preserveNullAndEmptyArrays: true } },
          {
            $lookup: {
              from: 'makes',
              localField: 'makeId',
              foreignField: '_id',
              as: 'makeInfo',
            },
          },
          { $unwind: { path: '$makeInfo', preserveNullAndEmptyArrays: true } },
          {
            $lookup: {
              from: 'models',
              localField: 'modelId',
              foreignField: '_id',
              as: 'modelInfo',
            },
          },
          { $unwind: { path: '$modelInfo', preserveNullAndEmptyArrays: true } },
          {
            $project: {
              _id: 1,
              name: 1,
              year: 1,
              vehicleType: 1,
              image: 1,
              slug: 1,
              category: { _id: '$categoryId', name: '$categoryInfo.name' },
              make: { _id: '$makeId', name: '$makeInfo.name' },
              model: { _id: '$modelId', name: '$modelInfo.name' },
            },
          },
        ]);

      const getRandomBikes = () =>
        Bike.aggregate([
          { $match: { status: true, isDeleted: false } },
          { $sample: { size: 12 } },
          {
            $lookup: {
              from: 'categories',
              localField: 'categoryId',
              foreignField: '_id',
              as: 'categoryInfo',
            },
          },
          { $unwind: { path: '$categoryInfo', preserveNullAndEmptyArrays: true } },
          {
            $lookup: {
              from: 'makes',
              localField: 'makeId',
              foreignField: '_id',
              as: 'makeInfo',
            },
          },
          { $unwind: { path: '$makeInfo', preserveNullAndEmptyArrays: true } },
          {
            $project: {
              _id: 1,
              name: 1,
              year: 1,
              vehicleType: 1,
              image: 1,
              slug: 1,
              category: { _id: '$categoryId', name: '$categoryInfo.name' },
              make: { _id: '$makeId', name: '$makeInfo.name', slug: '$makeInfo.slug' },
            },
          },
        ]);

      /* --------------------------------------------------------------------
         RUN PARALLEL REQUESTS
      -------------------------------------------------------------------- */

      const [postalCodeState, randomBanks, randomSoftware, randomNames, randomSpecifications, randomBiographies, randomVehicles, randomBikes] = await Promise.all([
        getRandomStates(),
        getRandomBanks(),
        getRandomSoftware(),
        getRandomNames(),
        getRandomSpecifications(),
        getRandomBiographies(),
        getRandomVehicles(),
        getRandomBikes(),
      ]);

      return res.status(200).json({
        error: false,
        data: {
          postalCodeState,
          randomBanks,
          randomSoftware,
          randomNames,
          randomSpecifications,
          randomBiographies,
          randomVehicles,
          randomBikes,
        },
      });
    } catch (error) {
      return next({
        status: 500,
        message: error.message || 'An unexpected error occurred',
      });
    }
  }
}

export default new HomeController();
