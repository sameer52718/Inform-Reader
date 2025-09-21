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
    this.getByCategory = this.getByCategory.bind(this);
    this.getInfo = this.getInfo.bind(this);
  }

  async getByCountry(req, res, next) {
    const { articleType } = req.query;
    try {
      const origin = req.headers.origin || req.get('origin') || '';
      let subdomainCountryCode = null;

      if (origin) {
        try {
          const hostname = new URL(origin).hostname; // e.g., pk.informreaders.com
          const parts = hostname.split('.');
          if (parts.length > 2) {
            subdomainCountryCode = parts[0].toUpperCase(); // "pk", "in", "us"
          }
        } catch (parseErr) {
          // If origin is not a valid URL, ignore
        }
      }

      let country = null;
      const filters = {};

      if (subdomainCountryCode) {
        country = await Country.findOne({ countryCode: subdomainCountryCode.toLowerCase() });
      }

      // Fallback to IP-based lookup if subdomain country not found
      if (!country) {
        const clientIP = req.headers['x-forwarded-for']?.split(',')[0] || req.ip;
        const geo = geoip.lookup(clientIP);
        const ipCountryCode = geo?.country?.toUpperCase();

        if (ipCountryCode) {
          country = await Country.findOne({ countryCode: ipCountryCode.toLowerCase() });
        }
      }

      if (country) {
        filters.country = country._id;
      }
      console.log('Aricle Filters', filters);

      // ===== Type and Category Filters =====
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
      if (articleType) {
        filters.type = articleType.toLowerCase();
      }
      // ===== Fetch Articles =====
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      const totalArticles = await Article.countDocuments(filters);
      const totalPages = Math.ceil(totalArticles / limit);

      const articles = await Article.find(filters).sort({ pubDate: -1 }).limit(limit).skip(skip).populate('category', 'name');

      return res.status(200).json({
        error: false,
        country: country?.name || 'Unknown',
        articles,
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

  async getByCategory(req, res, next) {
    try {
      const { categoryId, categoryName } = req.query;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      let category = null;
      const filters = {};

      if (categoryId) {
        category = await Category.findById(categoryId);
      } else if (categoryName) {
        category = await Category.findOne({ name: categoryName });
      }

      if (!category) {
        return res.status(404).json({
          error: true,
          message: 'Category not found.',
        });
      }

      filters.category = category._id;

      const totalArticles = await Article.countDocuments(filters);
      const totalPages = Math.ceil(totalArticles / limit);

      const articles = await Article.find(filters).sort({ pubDate: -1 }).limit(limit).skip(skip).populate('category', 'name');

      return res.status(200).json({
        error: false,
        category: category.name,
        articles,
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

  async getInfo(req, res, next) {
    try {
      const { id } = req.params;

      if (!id) {
        return this.handleError(next, 'Article ID is required.', 404);
      }

      const article = await Article.findById(id).populate('category', 'name');

      if (!article) {
        return this.handleError(next, 'Article not found.', 404);
      }

      return res.status(200).json({
        error: false,
        article,
      });
    } catch (error) {
      return this.handleError(next, error.message || 'An unexpected error occurred', 500);
    }
  }
}

export default new ArticleController();
