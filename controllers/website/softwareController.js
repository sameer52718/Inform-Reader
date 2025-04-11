import Software from '../../models/Software.js';
import BaseController from '../BaseController.js';

class SoftwareController extends BaseController {
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
                categoryId,
                subCategoryId,
                operatingSystem,
                tag,
            } = req.query;

            const parsedLimit = parseInt(limit);
            const parsedPage = parseInt(page);

            // Base filters for active and not-deleted software
            const filter = {
                status: true,
                isDeleted: false,
            };

            // Apply optional filters
            if (categoryId) filter.categoryId = categoryId;
            if (subCategoryId) filter.subCategoryId = subCategoryId;
            if (operatingSystem) filter.operatingSystem = operatingSystem;
            if (tag) filter.tag = tag;

            // Query the database
            const softwareList = await Software.find(filter)
                .select('name overview version logo tag')
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

export default new SoftwareController();
