import BaseController from '../BaseController.js';
import Contact from '../../models/Contact.js'; // Make sure this path is correct

class ContactController extends BaseController {
    constructor() {
        super();
        this.get = this.get.bind(this);
    }

    async get(req, res, next) {
        try {
            let { page = 1, limit = 10, startDate, endDate } = req.query;

            page = parseInt(page);
            limit = parseInt(limit);
            const skip = (page - 1) * limit;

            const filter = {};

            // Optional date filtering
            if (startDate) {
                filter.createdAt = { $gte: new Date(startDate) };
            }

            if (endDate) {
                filter.createdAt = {
                    ...filter.createdAt,
                    $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
                };
            }

            const messages = await Contact.find(filter)
                .select('name email subject message createdAt')
                .sort({ createdAt: -1 }) // Most recent first
                .skip(skip)
                .limit(limit);

            const totalMessages = await Contact.countDocuments(filter);
            const totalPages = Math.ceil(totalMessages / limit);

            return res.status(200).json({
                error: false,
                message: 'Contact messages retrieved successfully',
                data: messages,
                pagination: {
                    totalItems: totalMessages,
                    currentPage: page,
                    totalPages,
                    pageSize: limit,
                },
            });
        } catch (error) {
            return this.handleError(next, error.message || 'An unexpected error occurred');
        }
    }
}

export default new ContactController();
