import Name from '../../models/Name.js';
import BaseController from '../BaseController.js';

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
      const { page = 1, limit = 10, initialLetter, categoryId, gender } = req.query;

      // Build filter object
      let filter = {};
      if (initialLetter) filter.initialLetter = initialLetter;
      if (categoryId) filter.categoryId = categoryId;
      if (gender) filter.gender = gender;

      // Paginate and get names
      const names = await Name.find(filter)
        .select('name shortMeaning')
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
  async getNameDetail(req, res) {
    try {
      const { nameId } = req.params; // Extract nameId from URL params

      // Find the name by its ID
      const name = await Name.findById(nameId)
        .populate('religionId') // Optional: populate the 'religionId' field if necessary
        .populate('categoryId') // Optional: populate the 'categoryId' field if necessary
        .exec();

      if (!name) {
        return res.status(404).json({ message: 'Name not found' });
      }

      // Respond with name details
      return res.status(200).json({ data: name });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Error retrieving name detail' });
    }
  }
}

export default new NamesController();
