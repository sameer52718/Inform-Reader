import BaseController from '../BaseController.js';
import BankCode from '../../models/BankCode.js';
import Country from '../../models/Country.js';
import path from 'path';
import fs from 'fs/promises';

class BankCodeController extends BaseController {
  constructor() {
    super();
    this.get = this.get.bind(this);
    this.detail = this.detail.bind(this);
    this.groupByBank = this.groupByBank.bind(this);
    this.groupByBranch = this.groupByBranch.bind(this);
    this.branchDetail = this.branchDetail.bind(this);
  }

  async get(req, res, next) {
    try {
      const { countryCode, page = 1, limit = 10, search } = req.query; // Default page to 1 and limit to 10
      const skip = (page - 1) * limit; // Calculate the skip value based on the current page

      // Validate input fields
      if (!countryCode) {
        return this.handleError(next, 'countryCode is required', 400);
      }

      // Fetch the country by countryCode
      const country = await Country.findOne({ countryCode: countryCode.toLowerCase() });

      if (!country) {
        return this.handleError(next, 'Country not found', 404);
      }

      // Build the query object
      const query = { countryId: country._id };

      if (search) {
        query.$or = [{ bank: { $regex: search, $options: 'i' } }, { city: { $regex: search, $options: 'i' } }];
      }

      // Fetch paginated BankCodes by countryId with skip and limit
      const bankCodes = await BankCode.find(query).skip(skip).limit(parseInt(limit)).exec();

      // Count total bank codes to calculate total pages
      const totalBankCodes = await BankCode.countDocuments(query);

      // Calculate total pages based on the total bank codes and limit
      const totalPages = Math.ceil(totalBankCodes / limit);

      // Return paginated BankCodes with pagination metadata
      return res.status(200).json({
        success: true,
        country,
        bankCodes,
        pagination: {
          totalItems: totalBankCodes,
          currentPage: parseInt(page),
          totalPages,
          pageSize: parseInt(limit),
        },
      });
    } catch (error) {
      return this.handleError(next, error.message, 500);
    }
  }

  async detail(req, res, next) {
    try {
      const { swiftCode } = req.params;

      if (!swiftCode) {
        return this.handleError(next, 'swiftCode is required', 400);
      }

      // Fetch the bank details
      const bankCodes = await BankCode.findOne({ swiftCode }).populate('countryId', 'name countryCode');

      if (!bankCodes) {
        return res.status(404).json({ success: false, message: 'Bank not found' });
      }

      // Load country templates (templates/bankcodes/country.json)
      const countryTemplatesFile = path.join(process.cwd(), 'templates', 'bankcodes', 'country.json');

      const countryDataRaw = await fs.readFile(countryTemplatesFile, {
        encoding: 'utf-8',
      });

      const countryTemplates = JSON.parse(countryDataRaw);

      // Find template matching country
      const countryTemplate = countryTemplates.find((item) => item.country_code.toLowerCase() === bankCodes.countryId.countryCode.toLowerCase());

      if (!countryTemplate) {
        return res.status(404).json({
          message: 'No template found for this country in bankcodes/country.json',
        });
      }

      // Replacement map
      const map = {
        'Swift Code': bankCodes.swiftCode,
        Bank: bankCodes.bank,
        City: bankCodes.city,
        Branch: bankCodes.branch || '',
        Country: bankCodes.countryId.name,
      };

      // Replace helper
      const replaceVars = (text) => text?.replace(/{(.*?)}/g, (_, key) => (map[key] !== undefined ? map[key] : `{${key}}`)) || '';

      // Generate dynamic paragraph
      const filledParagraph = replaceVars(countryTemplate.paragraph_template);

      // Generate FAQs
      const filledFaqs = countryTemplate.faqs.map((faq) => ({
        question: replaceVars(faq.question),
        answer: replaceVars(faq.answer),
      }));

      const constants = countryTemplate.constants || {};

      // Fetch related banks
      const related = await BankCode.find({
        bank: bankCodes.bank,
        _id: { $ne: bankCodes._id },
      }).limit(25);

      // Final Response
      const response = {
        bankCodes,
        content: {
          title: `SWIFT Code ${bankCodes.swiftCode} - ${bankCodes.bank}, ${bankCodes.city}, ${bankCodes.countryId.name}`,
          paragraph: filledParagraph,
          faqs: filledFaqs,
          constants,
        },
        related,
      };

      return res.status(200).json({ ...response, error: false });
    } catch (error) {
      return this.handleError(next, error.message, 500);
    }
  }

  async groupByBank(req, res, next) {
    try {
      const { host, search, status = true } = req.query;

      let subdomainCountryCode = 'pk';
      try {
        const hostname = new URL(`https://${host}`).hostname;
        const parts = hostname.split('.');
        if (parts.length > 2) {
          subdomainCountryCode = parts[0].toUpperCase(); // e.g. "PK"
        }
      } catch {
        // fallback
      }

      // Find the country by countryCode
      const country = await Country.findOne({ countryCode: subdomainCountryCode.toLowerCase() });
      if (!country) {
        return this.handleError(next, 'Country not found', 404);
      }

      // Base match query
      const match = {
        countryId: country._id,
        isDeleted: false,
      };

      if (status !== undefined) {
        match.status = status === 'true' || status === true;
      }

      if (search) {
        match.$or = [{ bank: { $regex: search, $options: 'i' } }, { city: { $regex: search, $options: 'i' } }, { branch: { $regex: search, $options: 'i' } }];
      }

      // Group by bank and include one bankSlug (first occurrence)
      const groupedBanks = await BankCode.aggregate([
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
        { $sort: { _id: 1 } },
      ]);

      return res.status(200).json({
        success: true,
        country: {
          name: country.name,
          code: country.countryCode,
          flag: country.flag,
        },
        totalBanks: groupedBanks.length,
        banks: groupedBanks.map((item) => ({
          bank: item._id,
          bankSlug: item.bankSlug,
          totalBranches: item.totalBranches,
          cities: item.cities,
          swiftCodes: item.swiftCodes,
          branches: item.branches,
        })),
      });
    } catch (error) {
      return this.handleError(next, error.message, 500);
    }
  }

  async groupByBranch(req, res, next) {
    try {
      const { host, bankSlug, search, status = true } = req.query;

      // Validate input
      if (!bankSlug) {
        return this.handleError(next, 'bankSlug is required', 400);
      }

      let subdomainCountryCode = 'pk';
      try {
        const hostname = new URL(`https://${host}`).hostname;
        const parts = hostname.split('.');
        if (parts.length > 2) {
          subdomainCountryCode = parts[0].toUpperCase(); // e.g. "PK"
        }
      } catch {
        // fallback
      }

      //  Fetch the country by code
      const country = await Country.findOne({ countryCode: subdomainCountryCode.toLowerCase() });
      if (!country) {
        return this.handleError(next, 'Country not found', 404);
      }

      //  Base match query
      const match = {
        countryId: country._id,
        bankSlug: bankSlug.toLowerCase(),
        isDeleted: false,
        branch: { $ne: '' },
      };

      if (status !== undefined) {
        match.status = status === 'true' || status === true;
      }

      if (search) {
        match.$or = [{ branch: { $regex: search, $options: 'i' } }, { city: { $regex: search, $options: 'i' } }, { swiftCode: { $regex: search, $options: 'i' } }];
      }

      //  Group by branch
      const groupedBranches = await BankCode.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$branch',
            branchSlug: { $first: '$branchSlug' },
            totalSwiftCodes: { $sum: 1 },
            cities: { $addToSet: '$city' },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      // ✅ Get bank info
      const bankInfo = await BankCode.findOne({
        countryId: country._id,
        bankSlug: bankSlug.toLowerCase(),
      }).select('bank bankSlug countryId');

      if (!bankInfo) {
        return this.handleError(next, 'Bank not found', 404);
      }

      // ✅ Response
      return res.status(200).json({
        success: true,
        country: {
          name: country.name,
          code: country.countryCode,
          flag: country.flag,
        },
        bank: {
          name: bankInfo.bank,
          slug: bankInfo.bankSlug,
        },
        totalBranches: groupedBranches.length,
        branches: groupedBranches.map((item) => ({
          branch: item._id,
          totalSwiftCodes: item.totalSwiftCodes,
          cities: item.cities,
          branchSlug: item.branchSlug,
        })),
      });
    } catch (error) {
      return this.handleError(next, error.message, 500);
    }
  }

  async branchDetail(req, res, next) {
    try {
      const { host } = req.query;
      const { bankSlug, branchSlug } = req.params;

      // Validate input
      if (!bankSlug) return this.handleError(next, 'bankSlug is required', 400);
      if (!branchSlug) return this.handleError(next, 'branchSlug is required', 400);

      let subdomainCountryCode = 'pk';
      try {
        const hostname = new URL(`https://${host}`).hostname;
        const parts = hostname.split('.');
        if (parts.length > 2) {
          subdomainCountryCode = parts[0].toUpperCase(); // e.g. "PK"
        }
      } catch {
        // fallback
      }

      //  Fetch the country by code
      const country = await Country.findOne({ countryCode: subdomainCountryCode.toLowerCase() });
      if (!country) {
        return this.handleError(next, 'Country not found', 404);
      }

      // Find the branch
      const branch = await BankCode.findOne({
        countryId: country._id,
        bankSlug: bankSlug.toLowerCase(),
        branchSlug: branchSlug.toLowerCase(),
        isDeleted: false,
      });

      if (!branch) return this.handleError(next, 'Branch not found', 404);

      // Populate country info
      await branch.populate('countryId', 'name flag countryCode');

      // Fetch related branches of the same bank, excluding current branch
      const relatedBranches = await BankCode.find({
        countryId: country._id,
        bankSlug: bankSlug.toLowerCase(),
        branchSlug: { $ne: branchSlug.toLowerCase() },
        isDeleted: false,
        branch: { $ne: '' },
      })
        .select('branch branchSlug city') // Only return safe fields
        .limit(10) // optional: limit number of related branches
        .sort({ branch: 1 });

      return res.status(200).json({
        success: true,
        branch: {
          name: branch.branch,
          slug: branch.branchSlug,
          city: branch.city,
          bank: branch.bank,
          swiftCode: branch.swiftCode,
          country: {
            name: branch.countryId.name,
            code: branch.countryId.countryCode,
            flag: branch.countryId.flag,
          },
          status: branch.status,
        },
        related: relatedBranches.map((b) => ({
          name: b.branch,
          slug: b.branchSlug,
          city: b.city,
        })),
      });
    } catch (error) {
      return this.handleError(next, error.message, 500);
    }
  }
}

export default new BankCodeController();
