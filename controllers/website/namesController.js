import Name from '../../models/Name.js';
import BaseController from '../BaseController.js';
import Category from '../../models/Category.js';
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
      let filter = { isProcessed: true };
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
      const name = await Name.findOne({ slug, isDeleted: false, status: true, isProcessed: true })
        .populate('religionId', 'name')
        .populate('categoryId', 'name')
        .populate('adminId', 'name')
        .exec();

      if (!name) {
        return res.status(404).json({ message: 'Name not found' });
      }

      // Return the new structured data
      const data = {
        name: name.name,
        slug: name.slug,
        gender: name.gender,
        origin: name.origin,
        religion: name.religionId?.name || '',
        category: name.categoryId?.name || '',
        seo: name.seo,
        focus_keywords: name.focus_keywords,
        ai_overview_summary: name.ai_overview_summary,
        introduction: name.introduction,
        quick_facts: name.quick_facts,
        meaning: name.meaning,
        etymology: name.etymology,
        cultural_context: name.cultural_context,
        popularity_trends: name.popularity_trends,
        modern_vs_traditional: name.modern_vs_traditional,
        regional_usage: name.regional_usage,
        ethnic_community_usage: name.ethnic_community_usage,
        traditionally_admired_qualities: name.traditionally_admired_qualities,
        notable_individuals: name.notable_individuals,
        internal_linking_signals: name.internal_linking_signals,
        nicknames: name.nicknames,
        similar_names: name.similar_names,
        pronunciation: name.pronunciation,
        search_intent_analysis: name.search_intent_analysis,
        faqs: name.faqs,
        luckyNumber: name.luckyNumber,
        luckyColor: name.luckyColor,
        luckyStone: name.luckyStone,
      };

      // Get related names
      const relatedNames = await Name.find({
        _id: { $ne: name._id },
        categoryId: name.categoryId?._id,
        isDeleted: false,
        status: true,
        isProcessed: true,
      })
        .select('name slug gender')
        .limit(5)
        .exec();

      return res.status(200).json({
        success: true,
        data: {
          ...data,
          relatedNames,
        }
      });

    } catch (error) {
      console.error('❌ Error fetching name detail:', error);
      return res.status(500).json({ message: 'Error retrieving name detail' });
    }
  }
}

export default new NamesController();
