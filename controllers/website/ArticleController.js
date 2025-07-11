import BaseController from '../BaseController.js';
import Article from '../../models/Article.js';
import Category from '../../models/Category.js';
import Type from '../../models/Type.js';
import Country from '../../models/Country.js';
import geoip from 'geoip-country';

class ArticleController extends BaseController {
  constructor() {
    super();
    this.getByCountry = this.getByCountry.bind(this);
  }

  async getByCountry(req, res, next) {
    try {
      const clientIP = req.headers['x-forwarded-for']?.split(',')[0] || req.ip;
      console.log(clientIP, req.ip, req.headers['x-forwarded-for']?.split(',')[0]);

      const geo = geoip.lookup(clientIP);
      const countryCode = geo?.country?.toUpperCase();

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      let country = null;
      const filters = {};

      if (countryCode) {
        country = await Country.findOne({ countryCode });
        if (country) {
          filters.country = country._id;
        }
      }

      const type = await Type.findOne({ name: 'News' });
      if (!type) {
        return res.status(404).json({
          error: true,
          message: 'Type "News" not found.',
        });
      }

      const categories = await Category.find({ typeId: type._id });
      const categoryIds = categories.map((cat) => cat._id);

      filters.category = { $in: categoryIds };

      const totalArticles = await Article.countDocuments(filters);
      const totalPages = Math.ceil(totalArticles / limit);

      const articles = await Article.find(filters).sort({ pubDate: -1 }).limit(limit).skip(skip).populate('category', 'name');

      return res.status(200).json({
        error: false,
        country: country?.name || 'Unknown',
        categories: articles,
        pagination: {
          totalItems: totalArticles,
          currentPage: page,
          totalPages,
          pageSize: limit,
        },
      });
    } catch (error) {
      return this.handleError(next, error.message || 'An unexpected error occurred', 500);
    }
  }
}

export default new ArticleController();
