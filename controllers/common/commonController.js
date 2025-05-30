import BaseController from '../BaseController.js';
import Country from '../../models/Country.js';
import Type from '../../models/Type.js';
import Category from '../../models/Category.js';
import SubCategory from '../../models/SubCategory.js';
import Brand from '../../models/Brand.js';
import Religion from '../../models/Religion.js';
import Company from '../../models/Company.js';
import Model from '../../models/Model.js';
import Make from '../../models/Make.js';

class CommonController extends BaseController {
  constructor() {
    super();
    this.country = this.country.bind(this);
    this.type = this.type.bind(this);
    this.category = this.category.bind(this);
    this.subCategory = this.subCategory.bind(this);
    this.brand = this.brand.bind(this);
    this.religion = this.religion.bind(this);
    this.company = this.company.bind(this);
    this.make = this.make.bind(this);
    this.model = this.model.bind(this);
  }

  async country(req, res, next) {
    try {
      const { groupCountry, region, country } = req.query;
      const response = {};

      // If groupCountry is provided, group the countries by region
      if (groupCountry) {
        const groupCountry = await Country.aggregate([
          {
            $group: {
              _id: '$region',
              countries: { $push: { name: '$name', countryCode: '$countryCode', flag: '$flag' } }, // Push country details to the array
            },
          },
          {
            $sort: { _id: 1 },
          },
        ]);

        response['groupCountry'] = groupCountry;
      }

      if (region) {
        response['regionCountry'] = await Country.find({ region: region });
      }

      if (country) {
        response['country'] = await Country.find({});
      }

      return res.json({ error: false, response });
    } catch (error) {
      return this.handleError(next, error.message, 500);
    }
  }

  async type(req, res, next) {
    try {
      const types = await Type.find({ status: true }).select('name');
      return res.json({ error: false, types });
    } catch (error) {
      return this.handleError(next, error.message, 500);
    }
  }

  async category(req, res, next) {
    const { type } = req.query;

    try {
      const filter = { status: true, isDeleted: false };

      if (type) {
        const categoryType = await Type.findOne({ name: type });
        if (type) {
          filter.typeId = categoryType._id;
        }
      }
      console.log(filter);

      const categories = await Category.find(filter).select('name');
      return res.json({ error: false, categories });
    } catch (error) {
      return this.handleError(next, error.message, 500);
    }
  }

  async subCategory(req, res, next) {
    try {
      const filter = { status: true, isDeleted: false };
      if (req.query.categoryId) {
        filter.categoryId = req.query.categoryId;
      }

      const subCategories = await SubCategory.find(filter).select('name');
      return res.json({ error: false, subCategories });
    } catch (error) {
      return this.handleError(next, error.message, 500);
    }
  }

  async brand(req, res, next) {
    try {
      const brands = await Brand.find({ status: true, isDeleted: false }).select('name');
      return res.json({ error: false, brands });
    } catch (error) {
      return this.handleError(next, error.message, 500);
    }
  }

  async religion(req, res, next) {
    try {
      const religions = await Religion.find({ status: true }).select('name');
      return res.json({ error: false, religions });
    } catch (error) {
      return this.handleError(next, error.message, 500);
    }
  }

  async company(req, res, next) {
    try {
      const companies = await Company.find({ status: true }).select('name');
      return res.json({ error: false, companies });
    } catch (error) {
      return this.handleError(next, error.message, 500);
    }
  }

  async make(req, res, next) {
    try {
      const makes = await Make.find({ status: true }).select('name');
      return res.json({ error: false, data: makes });
    } catch (error) {
      return this.handleError(next, error.message, 500);
    }
  }

  async model(req, res, next) {
    try {
      const models = await Model.find({ status: true }).select('name');
      return res.json({ error: false, data: models });
    } catch (error) {
      return this.handleError(next, error.message, 500);
    }
  }
}

export default new CommonController();
