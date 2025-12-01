import Software from '../../models/Software.js';
import BaseController from '../BaseController.js';
import SubCategory from '../../models/SubCategory.js';
import path from 'path';
import fs from 'fs/promises';

class SoftwareController extends BaseController {
  constructor() {
    super();
    this.get = this.get.bind(this);
    this.detail = this.detail.bind(this);
    this.getRandom = this.getRandom.bind(this);
  }

  async get(req, res) {
    try {
      const { page = 1, limit = 10, search, categoryId, subCategoryslug, operatingSystem, tag } = req.query;

      const parsedLimit = parseInt(limit);
      const parsedPage = parseInt(page);

      // Base filters for active and not-deleted software
      const filter = {
        status: true,
        isDeleted: false,
      };

      // Apply optional filters
      if (categoryId) filter.categoryId = categoryId;
      if (subCategoryslug) {
        const subcategory = await SubCategory.find({ slug: subCategoryslug, status: true, isDeleted: false });
        if (subcategory) {
          filter.subCategoryId = { $in: subcategory.map((item) => item._id) };
        }
      }
      if (operatingSystem) filter.operatingSystem = operatingSystem;
      if (tag) filter.tag = tag;

      // Apply name search if provided (case-insensitive)
      if (search) {
        filter.name = { $regex: search, $options: 'i' };
      }
      console.log(filter);

      // Query the database with pagination
      const softwareList = await Software.find(filter)
        .skip((parsedPage - 1) * parsedLimit)
        .limit(parsedLimit);

      const totalCount = await Software.countDocuments(filter);

      // Respond with paginated result
      return res.status(200).json({
        data: softwareList,
        pagination: {
          totalItems: totalCount,
          totalPages: Math.ceil(totalCount / parsedLimit),
          currentPage: parsedPage,
          pageSize: parsedLimit,
        },
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Error retrieving software list' });
    }
  }

  async detail(req, res) {
    try {
      const { id: slug } = req.params;
      const { host } = req.query;

      let subdomainCountryCode = 'pk';
      try {
        const hostname = new URL(`https://${host}`).hostname;
        const parts = hostname.split('.');
        if (parts.length > 2) subdomainCountryCode = parts[0].toLowerCase();
      } catch {}

      // Load country.json
      const filePath = path.join(process.cwd(), 'templates', 'softwares', 'country.json');
      const countryJson = JSON.parse(await fs.readFile(filePath, 'utf-8'));

      // Which country template?
      const countryTemplate = countryJson.find((c) => c.code.toLowerCase() === subdomainCountryCode.toLowerCase());

      if (!countryTemplate) return res.status(404).json({ message: 'Country template not found' });

      // Fetch software
      const software = await Software.findOne({
        slug,
        status: true,
        isDeleted: false,
      })
        .populate('categoryId', 'name')
        .populate('subCategoryId', 'name')
        .populate('adminId', 'name email')
        .select('-__v -isDeleted');

      if (!software) return res.status(404).json({ message: 'Software not found' });

      // Other versions
      const versionList = await Software.find({
        name: software.name,
        _id: { $ne: software._id },
        version: { $ne: software.version },
        status: true,
        isDeleted: false,
      })
        .select('name slug version logo size releaseDate')
        .sort({ createdAt: -1 })
        .lean();

      // -------------------------------
      // 🔥 TEMPLATE SELECTION LOGIC
      // -------------------------------
      const cat = software.categoryId?.name?.toLowerCase() || '';
      const subcat = software.subCategoryId?.name?.toLowerCase() || '';

      let templateKey = '';

      // Priority #1 → Subcategory
      if (subcat.includes('game') || subcat.includes('games')) templateKey = 'game';
      else if (subcat.includes('browsers')) templateKey = 'web_tool';
      // Priority #2 → Category (only if subcategory is not known)
      else if (cat.includes('windows') || cat.includes('mac')) templateKey = 'pc_software';
      else if (cat.includes('android') || cat.includes('ios')) templateKey = 'mobile_app';

      // Default fallback
      if (!templateKey) templateKey = 'pc_software';

      // Get main template block
      const template = countryTemplate.templates[templateKey];
      if (!template) return res.status(404).json({ message: 'Template not available for this type' });

      // -------------------------------
      // 🔥 VARIABLE MAP
      // -------------------------------
      const map = {
        Name: software.name,
        Version: software.version,
        LastUpdated: software.releaseDate ? new Date(software.releaseDate).toDateString() : '',
        Size: software.size || '',
        Status: software.status ? 'Official' : 'Unofficial',
        Category: software.categoryId?.name || '',
        SubCategory: software.subCategoryId?.name || '',
        Country: countryTemplate.country,
      };

      const replaceVars = (text) => text?.replace(/{(.*?)}/g, (_, k) => (map[k] ? map[k] : `{${k}}`)) || '';

      // -------------------------------
      // 🔥 BUILD CONTENT
      // -------------------------------
      let content = {};

      for (let key of Object.keys(template)) {
        if (Array.isArray(template[key])) {
          content[key] = template[key].map((item) =>
            typeof item === 'string'
              ? replaceVars(item)
              : {
                  q: replaceVars(item.q),
                  a: replaceVars(item.a),
                },
          );
        } else if (typeof template[key] === 'object') {
          content[key] = {};
          Object.keys(template[key]).forEach((field) => {
            content[key][field] = replaceVars(template[key][field]);
          });
        } else {
          content[key] = replaceVars(template[key]);
        }
      }
      console.log(content);
      return res.status(200).json({
        data: software,
        versions: versionList,
        templateType: templateKey,
        content,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Error retrieving software details' });
    }
  }

  // 🔹 Get 12 random software
  async getRandom(req, res) {
    try {
      const randomSoftware = await Software.aggregate([
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
        { $project: { name: 1, overview: 1, version: 1, logo: 1, tag: 1, slug: 1, subCategory: { _id: 1, name: 1, slug: 1 } } },
      ]);

      return res.status(200).json({ data: randomSoftware });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Error fetching random software' });
    }
  }
}

export default new SoftwareController();
