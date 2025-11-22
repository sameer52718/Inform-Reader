import Name from '../../models/Name.js';
import BaseController from '../BaseController.js';
import Category from '../../models/Category.js';
import fs from 'fs/promises';
import path from 'path';
import Country from '../../models/Country.js';
class NamesController extends BaseController {
  constructor() {
    super();
    this.getNamesList = this.getNamesList.bind(this);
    this.getNameDetail = this.getNameDetail.bind(this);
  }

  // Method for names listing with filters and pagination
  async getNamesList(req, res) {
    try {
      // Extract query parameters
      const { page = 1, limit = 10, initialLetter, categoryId, gender, search } = req.query;

      // Build filter object
      let filter = {};
      if (initialLetter) filter.initialLetter = initialLetter;

      if (categoryId) {
        const category = await Category.findOne({ slug: categoryId, isDeleted: false, status: true });
        if (category) {
          filter.categoryId = category._id;
        }
      }
      if (gender) filter.gender = gender;
      if (search) filter.name = { $regex: search, $options: 'i' };

      // Paginate and get names
      const names = await Name.find(filter)
        .select('name shortMeaning slug')
        .skip((page - 1) * limit) // Skip the records for pagination
        .limit(parseInt(limit)); // Limit the number of records per page

      // Get total count for pagination
      const totalCount = await Name.countDocuments(filter);
      // Respond with the paginated result
      return res.status(200).json({
        data: names,
        pagination: {
          totalItems: totalCount,
          totalPages: Math.ceil(totalCount / limit),
          currentPage: parseInt(page),
          pageSize: parseInt(limit),
        },
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Error retrieving names list' });
    }
  }
  // Method for getting name detail
  async getNameDetail(req, res, next) {
    try {
      const { nameId: slug } = req.params;
      const { host } = req.query;

      // Find the name by its slug
      const name = await Name.findOne({ slug })
        .populate('religionId', 'name')
        .populate('categoryId', 'name')
        .populate('adminId', 'name') // optional
        .exec();

      if (!name) {
        return res.status(404).json({ message: 'Name not found' });
      }

      // Load country.json (template)
      const countryTemplatesFile = path.join(process.cwd(), 'templates', 'names', 'country.json');
      const countryDataRaw = await fs.readFile(countryTemplatesFile, 'utf-8');
      const countryTemplates = JSON.parse(countryDataRaw);

      let subdomainCountryCode = 'pk';
      try {
        const hostname = new URL(`https://${host}`).hostname;
        const parts = hostname.split('.');
        if (parts.length > 2) {
          subdomainCountryCode = parts[0].toLowerCase(); // e.g., "PK"
        }
      } catch {}

      const country = await Country.findOne({
        countryCode: subdomainCountryCode.toLowerCase(),
      });

      if (!country) {
        return res.status(404).json({ message: 'Country not found' });
      }

      const countryTemplate = countryTemplates.find((item) => item.country_code.toLowerCase() === subdomainCountryCode);

      if (!countryTemplate) {
        return res.status(404).json({ message: 'No template found for this country in country.json' });
      }

      // Replacement variable map
      const map = {
        name: name.name,
        length_of_name: name.nameLength,
        gender: name.gender,
        origin: name.origion,
        meaning: name.longMeaning,
        easy_to_pronounce: name.shortName === 'YES' ? 'easy to pronounce' : 'hard to pronounce',
        lucky_number: name.luckyNumber || '',
        lucky_color: name.luckyColor || '',
        lucky_stone: name.luckyStone || '',
        religion: name.religionId?.name || '',
        category: name.categoryId?.name || '',
        country: country.name,
        city: name?.city || '',
      };

      // Replace helper
      const replaceVars = (text) => text?.replace(/{(.*?)}/g, (_, key) => (map[key] !== undefined ? map[key] : `{${key}}`)) || '';

      // Generate paragraph
      const filledParagraph = replaceVars(countryTemplate.paragraph);

      // Generate FAQs
      const filledFaqs = countryTemplate.faqs.map((faq) => ({
        question: replaceVars(faq.q),
        answer: replaceVars(faq.a),
      }));

      const constants = countryTemplate.constants || {};

      // Find related names (same category & country)
      const relatedNames = await Name.find({
        _id: { $ne: name._id },
        categoryId: name.categoryId?._id,
      })
        .select('name slug gender')
        .limit(5)
        .exec();

      // Build response (mirrors getAreaDetail structure)
      const data = {
        ...name.toObject(),
        content: {
          title: `Name: ${name.name} - ${name.gender}, ${name.origion}`,
          paragraph: filledParagraph,
          faqs: filledFaqs,
          constants,
        },
        relatedNames,
      };

      return res.status(200).json({ success: true, data });
    } catch (error) {
      console.error('❌ Error fetching name detail:', error);
      return res.status(500).json({ message: 'Error retrieving name detail' });
    }
  }
}

export default new NamesController();
