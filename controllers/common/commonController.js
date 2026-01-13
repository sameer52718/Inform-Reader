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
import Config from '../../models/Config.js';
import City from '../../models/City.js';
import Nationality from '../../models/Nationality.js';
import dotenv from 'dotenv';
import ollama from 'ollama';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const gemini = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

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
    this.getConfig = this.getConfig.bind(this);
    this.cities = this.cities.bind(this);
    this.translateContent = this.translateContent.bind(this);
    this.nationality = this.nationality.bind(this);
    this.chat = this.chat.bind(this);
    this.generateContent = this.generateContent.bind(this);
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
              countries: { $push: { name: '$name', countryCode: '$countryCode', flag: '$flag' } },
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

  async nationality(req, res, next) {
    try {
      const nationalities = await Nationality.find({ status: true }).select('name');
      return res.json({ error: false, nationalities });
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

      const categories = await Category.find(filter).select('name slug');
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

      if (req.query.category) {
        const category = await Category.findOne({
          name: req.query.category,
          status: true,
          isDeleted: false,
        }).select('name');
        console.log(category, req.query.category);

        if (!category) {
          return res.json({ error: false, subCategories: [] });
        }

        filter.categoryId = category._id;
      }
      console.log(filter);

      const subCategories = await SubCategory.find(filter).select('name slug');

      return res.json({ error: false, subCategories });
    } catch (error) {
      return this.handleError(next, error.message, 500);
    }
  }

  async brand(req, res, next) {
    const { category } = req.query;
    try {
      const filter = { status: true, isDeleted: false };
      if (category) filter.category = category;

      const brands = await Brand.find(filter).select('name');
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
      const { type = 'CAR' } = req.query;

      const makes = await Make.find({ status: true, type }).select('name');
      return res.json({ error: false, data: makes });
    } catch (error) {
      return this.handleError(next, error.message, 500);
    }
  }

  async model(req, res, next) {
    try {
      const { makeId } = req.query;

      const filters = { status: true };

      if (makeId) {
        filters.makeId = makeId;
      }

      const models = await Model.find(filters).select('name');
      return res.json({ error: false, data: models });
    } catch (error) {
      return this.handleError(next, error.message, 500);
    }
  }

  async getConfig(req, res, next) {
    try {
      const config = await Config.findOne().select('logo themeColor -_id');
      return res.json({ error: false, data: config });
    } catch (error) {
      return this.handleError(next, error.message, 500);
    }
  }

  async cities(req, res, next) {
    try {
      const { country, capital, minPopulation, name } = req.query;
      const filter = { status: true, isDeleted: false };

      // Filter by country (using countryCode)
      if (country) {
        const countryDoc = await Country.findOne({ countryCode: country.toLowerCase() });
        if (countryDoc) {
          filter.country = countryDoc._id;
        } else {
          return res.json({ error: false, cities: [] });
        }
      }

      // Filter by capital (true/false)
      if (capital !== undefined) {
        filter.capital = capital === 'true';
      }

      // Filter by minimum population
      if (minPopulation) {
        const population = parseInt(minPopulation, 10);
        if (!isNaN(population)) {
          filter.population = { $gte: population };
        }
      }

      // Filter by name (case-insensitive partial match)
      if (name) {
        filter.name = { $regex: name, $options: 'i' };
      }

      const cities = await City.find(filter).select('name zone lat lng').populate('country', 'name countryCode region').limit(500);

      return res.json({ error: false, cities });
    } catch (error) {
      return this.handleError(next, error.message, 500);
    }
  }

  async translateContent(req, res, next) {
    try {
      const { json, from, to } = req.body;

      if (!json || !from || !to) {
        return res.status(400).json({ error: true, message: 'Missing required fields: json, from, to' });
      }

      const translated = await this.translateRecursive(json, from, to);
      return res.json(translated);
    } catch (error) {
      return this.handleError(next, error.message, 500);
    }
  }

  async chat(req, res, next) {
    try {
      const { message, model = 'llama3.2' } = req.body;
      const response = await ollama.chat({
        model,
        messages: [{ role: 'user', content: message }],
      });
      return res.json({ error: false, response: response.message.content });
    } catch (error) {
      return this.handleError(next, error.message, 500);
    }
  }

  async generateContent(req, res, next) {
    try {
      const { message } = req.body;
      // console.log(`Generating content for ${message}`);
      if (!message) {
        return res.status(400).json({ error: true, message: 'Message is required' });
      }

      const response = await gemini.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: message,
      });

      return res.json({ error: false, response: response.candidates[0].content.parts[0].text });
    } catch (error) {
      return this.handleError(next, error.message, 500);
    }
  }
}

export default new CommonController();
