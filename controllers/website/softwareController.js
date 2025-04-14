import Software from '../../models/Software.js';
import BaseController from '../BaseController.js';

class SoftwareController extends BaseController {
    constructor() {
        super();
        this.get = this.get.bind(this);
        this.detail = this.detail.bind(this);
    }

    async get(req, res) {
        try {
            const {
                page = 1,
                limit = 10,
                search,
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

            // Apply name search if provided (case-insensitive)
            if (search) {
                filter.name = { $regex: search, $options: 'i' };
            }

            // Query the database with pagination
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

    async detail(req, res) {
        try {
            const { id } = req.params;

            // Get the main software by ID
            const software = await Software.findOne({
                _id: id,
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

            // Fetch related software from the same category/subcategory
            const relatedSoftware = await Software.find({
                _id: { $ne: id }, // Exclude the current software
                status: true,
                isDeleted: false,
                $or: [
                    { categoryId: software.categoryId._id },
                ]
            })
                .limit(20)
                .select('name overview version logo tag')
                .lean();

            return res.status(200).json({
                data: software,
                related: relatedSoftware,
            });

        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: 'Error retrieving software details' });
        }
    }


}

export default new SoftwareController();
