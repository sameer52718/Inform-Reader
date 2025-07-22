import BaseController from '../BaseController.js';
import Country from '../../models/Country.js';
import Software from '../../models/Software.js';
import Name from '../../models/Name.js';
import Specification from '../../models/Specification.js';
import Biography from '../../models/Biography.js';
import Article from '../../models/Article.js';

class HomeController extends BaseController {
  constructor() {
    super();
    this.get = this.get.bind(this);
  }

  async get(req, res, next) {
    try {
      const getRandomCountries = () =>
        Country.aggregate([
          { $match: { status: true } },
          { $sample: { size: 12 } },
          {
            $project: {
              _id: 1,
              name: 1,
              flag: 1,
              countryCode: 1,
            },
          },
        ]);

      const getRandomSoftware = () =>
        Software.aggregate([
          {
            $match: {
              status: true,
              isDeleted: false,
            },
          },
          { $sample: { size: 12 } },
          {
            $project: {
              _id: 1,
              name: 1,
              logo: 1,
              overview: 1,
              version: 1,
              tag: 1,
            },
          },
        ]);

      const getRandomNames = () =>
        Name.aggregate([
          {
            $match: {
              status: true,
              isDeleted: false,
            },
          },
          { $sample: { size: 10 } },
          {
            $project: {
              _id: 1,
              name: 1,
              gender: 1,
              shortMeaning: 1,
              origion: 1,
            },
          },
        ]);

      const getRandomSpecifications = () =>
        Specification.aggregate([
          // Match active and non-deleted specifications
          {
            $match: {
              status: true,
              isDeleted: false,
            },
          },
          // Randomly select 12 specifications
          { $sample: { size: 12 } },
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
              localField: 'brandId',
              foreignField: '_id',
              as: 'brandInfo',
            },
          },
          // Unwind brandInfo
          {
            $unwind: {
              path: '$brandInfo',
              preserveNullAndEmptyArrays: true,
            },
          },
          // Lookup subcategory information
          {
            $lookup: {
              from: 'subcategories',
              localField: 'subCategoryId',
              foreignField: '_id',
              as: 'subCategoryInfo',
            },
          },
          // Unwind subCategoryInfo
          {
            $unwind: {
              path: '$subCategoryInfo',
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
              categoryId: 1,
              subCategoryId: 1,
              categoryName: '$categoryInfo.name',
              brandName: '$brandInfo.name',
              subCategoryName: '$subCategoryInfo.name',
            },
          },
        ]);

      const getRandomBiographies = () =>
        Biography.aggregate([
          // Match active and non-deleted biographies
          {
            $match: {
              status: true,
              isDeleted: false,
            },
          },
          // Randomly select 12 biographies
          { $sample: { size: 12 } },
          // Lookup category information
          {
            $lookup: {
              from: 'categories',
              localField: 'categoryId',
              foreignField: '_id',
              as: 'categoryInfo',
            },
          },
          // Unwind categoryInfo
          {
            $unwind: {
              path: '$categoryInfo',
              preserveNullAndEmptyArrays: true,
            },
          },
          // Project relevant fields
          {
            $project: {
              _id: 1,
              name: 1,
              image: 1,
              categoryId: 1,
              categoryName: '$categoryInfo.name',
            },
          },
        ]);

      const getRandomArticles = () =>
        Article.aggregate([
          // Randomly select 12 articles
          { $sample: { size: 12 } },
          // Lookup category information
          {
            $lookup: {
              from: 'categories',
              localField: 'category',
              foreignField: '_id',
              as: 'categoryInfo',
            },
          },
          // Unwind categoryInfo
          {
            $unwind: {
              path: '$categoryInfo',
              preserveNullAndEmptyArrays: true,
            },
          },
          // Project relevant fields
          {
            $project: {
              _id: 1,
              title: 1,
              pubDate: 1,
              categoryId: '$category',
              categoryName: '$categoryInfo.name',
              source: 1,
              link: 1,
            },
          },
        ]);

      // Run all async tasks in parallel
      const [postalCodeCountry, bankCodeCountry, randomSoftware, randomNames, randomSpecifications, randomBiographies, randomArticles] = await Promise.all([
        getRandomCountries(),
        getRandomCountries(),
        getRandomSoftware(),
        getRandomNames(),
        getRandomSpecifications(),
        getRandomBiographies(),
        getRandomArticles(),
      ]);

      return res.status(200).json({
        error: false,
        data: {
          postalCodeCountry,
          bankCodeCountry,
          randomSoftware,
          randomNames,
          randomSpecifications,
          randomBiographies,
          randomArticles,
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
