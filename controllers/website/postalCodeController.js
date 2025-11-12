import mongoose from 'mongoose';
import Country from '../../models/Country.js';
import PostalCode from '../../models/PostalCode.js';
import BaseController from '../BaseController.js';
import path from 'path';
import fs from 'fs/promises';

class PostalCodeController extends BaseController {
  constructor() {
    super();
    this.get = this.get.bind(this);
    this.detail = this.detail.bind(this);
    this.getPostalCodesGroupedByRegion = this.getPostalCodesGroupedByRegion.bind(this);
    this.groupByState = this.groupByState.bind(this);
    this.groupByArea = this.groupByArea.bind(this);
    this.getAreaDetail = this.getAreaDetail.bind(this);
  }

  // Method for software listing with filters and pagination
  async get(req, res) {
    try {
      const { page = 1, limit = 10, countryCode, region, search } = req.query;

      const parsedPage = parseInt(page);
      const parsedLimit = parseInt(limit);

      // Base filter: only active and not deleted
      const filter = {
        status: true,
        isDeleted: false,
      };

      if (!countryCode || !region) {
        return this.handleError(next, 'Country Code and Region is Required!', 400);
      }

      const country = await Country.findOne({ countryCode });
      if (!country) {
        return this.handleError(next, 'Country Not Found', 400);
      }

      filter.countryId = country._id;
      filter.state = region.replaceAll('%20', ' ');

      if (search) {
        filter.$or = [{ code: { $regex: search, $options: 'i' } }, { area: { $regex: search, $options: 'i' } }];
      }

      const groupedRegions = await PostalCode.aggregate([
        { $match: { countryId: new mongoose.Types.ObjectId(country._id), state: { $ne: region } } },
        {
          $group: {
            _id: '$state',
          },
        },
        { $sort: { _id: 1 } },
      ]);

      // Fetch postal codes with pagination
      const postalCodes = await PostalCode.find(filter)
        .select('countryId state area code slug')
        .populate('countryId', 'name') // populate country name
        .skip((parsedPage - 1) * parsedLimit)
        .limit(parsedLimit);

      const totalCount = await PostalCode.countDocuments(filter);

      return res.status(200).json({
        data: {
          country: {
            name: country.name,
            code: country.countryCode,
            continent: country.region,
          },
          postalCodes,
          regions: groupedRegions.map((region) => region._id),
        },
        pagination: {
          totalItems: totalCount,
          totalPages: Math.ceil(totalCount / parsedLimit),
          currentPage: parsedPage,
          pageSize: parsedLimit,
        },
      });
    } catch (error) {
      console.error('❌ Error retrieving postal codes:', error);
      return res.status(500).json({ message: 'Error retrieving postal codes' });
    }
  }

  async getPostalCodesGroupedByRegion(req, res, next) {
    const { countryCode } = req.query;

    if (!countryCode) {
      return this.handleError(next, 'countryCode is required in query', 400);
    }

    try {
      // Step 1: Find the target country
      const targetCountry = await Country.findOne({ countryCode: countryCode.toLowerCase() });

      if (!targetCountry) {
        return this.handleError(next, 'Country not found', 400);
      }

      // Step 2: Group postal codes by region/state
      const groupedPostalCodes = await PostalCode.aggregate([
        { $match: { countryId: new mongoose.Types.ObjectId(targetCountry._id) } },
        {
          $group: {
            _id: '$state',
          },
        },
        { $sort: { _id: 1 } },
      ]);

      // Step 3: Find other countries in the same continent (excluding current)
      const otherCountries = await Country.find({
        region: targetCountry.region,
        _id: { $ne: targetCountry._id },
      }).select('name countryCode flag');

      // Step 4: Send response
      return res.json({
        data: {
          country: {
            name: targetCountry.name,
            code: targetCountry.countryCode,
            continent: targetCountry.region,
          },
          regions: groupedPostalCodes.map((region) => region._id),
          otherCountriesInContinent: otherCountries,
        },
        error: false,
      });
    } catch (error) {
      console.error('Error fetching grouped postal codes:', error);
      return this.handleError(next, error.message);
    }
  }

  // Get single software detail by ID
  async detail(req, res) {
    try {
      const { id: code } = req.params;

      const origin = req.headers.origin || req.get('origin') || '';
      let subdomainCountryCode = 'pk';

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

      // Find country
      const country = await Country.findOne({ countryCode: subdomainCountryCode.toLowerCase() });
      if (!country) {
        return this.handleError(next, 'Country not found', 404);
      }

      const postalCode = await PostalCode.findOne({
        code,
        status: true,
        isDeleted: false,
        countryId: country._id,
      })
        .populate('countryId')
        .select('-__v -isDeleted');

      if (!postalCode) {
        return res.status(404).json({ message: 'Postal Code not found' });
      }

      const countryCode = this.extractSubdomainCountryCode(req).toUpperCase();

      // 🔹 Paths for templates
      const countryTemplatesFile = path.join(process.cwd(), 'templates', 'postalcodes', 'country.json');
      const universalTemplatesFile = path.join(process.cwd(), 'templates', 'postalcodes', 'template.json');

      // 🔹 Load and parse both template files (once per request)
      const [countryDataRaw, universalDataRaw] = await Promise.all([
        fs.readFile(countryTemplatesFile, { encoding: 'utf-8' }),
        fs.readFile(universalTemplatesFile, { encoding: 'utf-8' }),
      ]);

      const countryTemplates = JSON.parse(countryDataRaw);
      const universalTemplates = JSON.parse(universalDataRaw);

      // 🔹 Pick country-specific templates
      const countrySet = countryTemplates[countryCode] || [];
      const randomCountryTemplate = countrySet.length > 0 ? countrySet[Math.floor(Math.random() * countrySet.length)] : null;

      // 🔹 Pick universal template
      const randomUniversal = universalTemplates[Math.floor(Math.random() * universalTemplates.length)];

      // 🔹 Replacement helper
      const replaceVars = (text, map) => text?.replace(/{(.*?)}/g, (_, key) => (map[key] !== undefined ? map[key] : `{${key}}`)) || '';

      // 🔹 Prepare variable map for replacements
      const map = {
        postal_code: postalCode.code,
        place_name: postalCode.area || postalCode.adminName2 || '',
        admin_name1: postalCode.state || '',
        admin_name2: postalCode.adminName2 || '',
        admin_name3: postalCode.adminName3 || '',
        country: postalCode.countryId.name,
        country_code: countryCode,
        latitude: postalCode.latitude ?? '',
        longitude: postalCode.longitude ?? '',
        accuracy: postalCode.accuracy ?? '',
        postal_authority: 'Universal Postal Union',
        code_format: 'Standard GeoNames Postal Format',
        related_Postal_Code_link: `/postalcode/${countryCode}/${postalCode.state}`,
        top_5_Postal_Code_link: `/postalcode/${countryCode}/${postalCode.state}`,
        admin_type: 'regions',
      };

      // 🔹 Fill template content
      const filledCountrySummary = randomCountryTemplate ? replaceVars(randomCountryTemplate, map) : '';

      const filledTitle = replaceVars(randomUniversal.content.title, map);
      const filledParagraph = replaceVars(randomUniversal.content.paragraph, map);
      const filledFaqs = randomUniversal.content.faqs.map((f) => ({
        question: replaceVars(f.question, map),
        answer: replaceVars(f.answer, map),
      }));

      // 🔹 Fetch related info
      const otherCountries = await Country.find({
        region: postalCode.countryId.region,
      }).select('name countryCode flag');

      const groupedPostalCodes = await PostalCode.aggregate([
        { $match: { countryId: new mongoose.Types.ObjectId(postalCode.countryId._id) } },
        { $group: { _id: '$state' } },
        { $sort: { _id: 1 } },
      ]);

      // 🔹 Build response
      const response = {
        postalCode,
        content: {
          title: filledTitle,
          paragraph: filledParagraph,
          faqs: filledFaqs,
          summary: filledCountrySummary,
          tone: randomUniversal.tone,
          eeat_notes: randomUniversal.eeat_notes,
        },
        otherCountries,
        regions: groupedPostalCodes.map((r) => r._id),
      };

      return res.status(200).json({ data: response, error: false });
    } catch (error) {
      console.error('❌ detail error:', error);
      return res.status(500).json({ message: 'Error retrieving postal code details' });
    }
  }

  // ✅ Group by State (like groupByBank)
  async groupByState(req, res, next) {
    try {
      const { search, status = true } = req.query;

      const origin = req.headers.origin || req.get('origin') || '';
      let subdomainCountryCode = 'pk';

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

      // Find country
      const country = await Country.findOne({ countryCode: subdomainCountryCode.toLowerCase() });
      if (!country) {
        return this.handleError(next, 'Country not found', 404);
      }

      // Base match
      const match = {
        countryId: country._id,
        isDeleted: false,
      };

      if (status !== undefined) {
        match.status = status === 'true' || status === true;
      }

      if (search) {
        match.$or = [{ state: { $regex: search, $options: 'i' } }, { area: { $regex: search, $options: 'i' } }, { code: { $regex: search, $options: 'i' } }];
      }

      // Group by state
      const groupedStates = await PostalCode.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$state',
            totalAreas: { $sum: 1 },
            stateSlug: { $first: '$stateSlug' },
            areas: { $addToSet: '$area' },
          },
        },
        { $sort: { _id: 1 } },
        {
          $project: {
            _id: 1,
            totalAreas: 1,
            stateSlug: 1,
            areas: { $slice: ['$areas', 5] },
          },
        },
      ]);

      return res.status(200).json({
        success: true,
        country: {
          name: country.name,
          code: country.countryCode,
          flag: country.flag,
        },
        totalStates: groupedStates.length,
        states: groupedStates.map((item) => ({
          state: item._id,
          stateSlug: item.stateSlug,
          totalAreas: item.totalAreas,
          areas: item.areas,
        })),
      });
    } catch (error) {
      return this.handleError(next, error.message, 500);
    }
  }

  // ✅ Group by Area (like groupByBranch)
  async groupByArea(req, res, next) {
    try {
      const { stateSlug, search, status = true } = req.query;

      if (!stateSlug) {
        return this.handleError(next, 'stateSlug is required', 400);
      }

      const origin = req.headers.origin || req.get('origin') || '';
      let subdomainCountryCode = 'pk';

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

      // Find country
      const country = await Country.findOne({ countryCode: subdomainCountryCode.toLowerCase() });
      if (!country) {
        return this.handleError(next, 'Country not found', 404);
      }

      // Base match
      const match = {
        countryId: country._id,
        stateSlug: stateSlug.toLowerCase(),
        isDeleted: false,
        area: { $ne: '' },
      };

      if (status !== undefined) {
        match.status = status === 'true' || status === true;
      }

      if (search) {
        match.$or = [{ area: { $regex: search, $options: 'i' } }, { code: { $regex: search, $options: 'i' } }];
      }

      // Group by area
      const groupedAreas = await PostalCode.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$area',
            areaSlug: { $first: '$areaSlug' },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      // Get state info (for name)
      const stateInfo = await PostalCode.findOne({
        countryId: country._id,
        stateSlug: stateSlug.toLowerCase(),
      }).select('state stateSlug countryId');

      if (!stateInfo) {
        return this.handleError(next, 'State not found', 404);
      }

      return res.status(200).json({
        success: true,
        country: {
          name: country.name,
          code: country.countryCode,
          flag: country.flag,
        },
        state: {
          name: stateInfo.state,
          slug: stateInfo.stateSlug,
        },
        totalAreas: groupedAreas.length,
        areas: groupedAreas.map((item) => ({
          area: item._id,
          areaSlug: item.areaSlug,
        })),
      });
    } catch (error) {
      return this.handleError(next, error.message, 500);
    }
  }

  // 🔹 Get postal code (area) detail by slug
  async getAreaDetail(req, res, next) {
    try {
      const { areaSlug } = req.query;

      if (!areaSlug) {
        return this.handleError(next, 'areaSlug are required', 400);
      }

      const origin = req.headers.origin || req.get('origin') || '';
      let subdomainCountryCode = 'pk';

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

      // Find country
      const country = await Country.findOne({ countryCode: subdomainCountryCode.toLowerCase() });
      if (!country) {
        return this.handleError(next, 'Country not found', 404);
      }

      // Find postal code (area) by slug
      const postalCode = await PostalCode.findOne({
        countryId: country._id,
        areaSlug: areaSlug,
        isDeleted: false,
        status: true,
      }).populate('countryId', 'name countryCode region flag');

      if (!postalCode) {
        return this.handleError(next, 'Postal Code not found', 404);
      }

      // Group other areas from same state (for sidebar suggestions)
      const relatedAreas = await PostalCode.find({
        countryId: country._id,
        state: postalCode.state,
        slug: { $ne: postalCode.slug },
        isDeleted: false,
        status: true,
      })
        .select('area areaSlug')
        .limit(5);

      // Build response
      const data = {
        country: {
          name: country.name,
          code: country.countryCode,
          flag: country.flag,
          continent: country.region,
        },
        postalCode: {
          code: postalCode.code,
          area: postalCode.area,
          state: postalCode.state,
          latitude: postalCode.latitude,
          longitude: postalCode.longitude,
          adminName2: postalCode.adminName2,
          adminName3: postalCode.adminName3,
          accuracy: postalCode.accuracy,
        },
        relatedAreas,
      };

      return res.status(200).json({ success: true, data });
    } catch (error) {
      console.error('❌ Error fetching area detail:', error);
      return this.handleError(next, error.message);
    }
  }
}

export default new PostalCodeController();
