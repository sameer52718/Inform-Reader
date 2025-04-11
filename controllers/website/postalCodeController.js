import PostalCode from '../../models/PostalCode.js';
import BaseController from '../BaseController.js';

class PostalCodeController extends BaseController {
    constructor() {
        super();
        this.get = this.get.bind(this);
        this.detail = this.detail.bind(this);
    }

    // Method for software listing with filters and pagination
    async get(req, res) {
        try {
            const {
                page = 1,
                limit = 10,
                countryId,
                state,
                area,
                code,
            } = req.query;

            const parsedPage = parseInt(page);
            const parsedLimit = parseInt(limit);

            // Base filter: only active and not deleted
            const filter = {
                status: true,
                isDeleted: false,
            };

            // Apply optional filters
            if (countryId) filter.countryId = countryId;
            if (state) filter.state = new RegExp(state.trim(), 'i'); // Case-insensitive partial match
            if (area) filter.area = new RegExp(area.trim(), 'i');     // Case-insensitive partial match
            if (code) filter.code = new RegExp(code, 'i');     // Case-insensitive partial match

            // Fetch postal codes with pagination
            const postalCodes = await PostalCode.find(filter)
                .select('countryId state area code')
                .populate('countryId', 'name') // populate country name
                .skip((parsedPage - 1) * parsedLimit)
                .limit(parsedLimit);

            const totalCount = await PostalCode.countDocuments(filter);

            return res.status(200).json({
                data: postalCodes,
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

    // Get single software detail by ID
    async detail(req, res) {
        try {
            const { id } = req.params;

            const software = await Software.findOne({
                _id: id,
                status: true,
                isDeleted: false,
            })
                .populate('categoryId', 'name') // populate category name
                .populate('subCategoryId', 'name') // populate sub-category name
                .populate('adminId', 'name email') // optional: populate admin info
                .select('-__v -isDeleted'); // exclude version and internal fields if desired

            if (!software) {
                return res.status(404).json({ message: 'Software not found' });
            }

            return res.status(200).json({ data: software });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: 'Error retrieving software details' });
        }
    }

}

export default new PostalCodeController();
