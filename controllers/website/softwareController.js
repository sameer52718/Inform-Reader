import Software from '../../models/Software.js';
import BaseController from '../BaseController.js';
import SubCategory from '../../models/SubCategory.js';

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

      // Get the main software by ID
      const software = await Software.findOne({
        slug: slug,
        status: true,
        isDeleted: false,
      })
        .populate('categoryId', 'name')
        .populate('subCategoryId', 'name')
        .populate('adminId', 'name email')
        .select('-__v -isDeleted');

      if (!software) {
        return res.status(404).json({ message: 'Software not found' });
      }

      const versionList = await Software.find({
        name: software.name, // same software
        _id: { $ne: software._id }, // exclude current software
        version: { $ne: software.version }, // version must be different
        status: true,
        isDeleted: false,
      })
        .select('name slug version logo size releaseDate')
        .sort({ createdAt: -1 })
        .lean();
      console.log(versionList);

      return res.status(200).json({
        data: software,
        versions: versionList,
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
