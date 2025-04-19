import BaseController from '../BaseController.js';
import NewsLetter from '../../models/NewsLetter.js';

class NewsLetterController extends BaseController {
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

            // Optional: Filter by date range
            if (startDate) {
                filter.createdAt = { $gte: new Date(startDate) };
            }

            if (endDate) {
                filter.createdAt = {
                    ...filter.createdAt,
                    $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
                };
            }

            const newsletters = await NewsLetter.find(filter)
                .select('email createdAt')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit);

            const total = await NewsLetter.countDocuments(filter);
            const totalPages = Math.ceil(total / limit);

            return res.status(200).json({
                error: false,
                message: 'Newsletter emails fetched successfully',
                data: newsletters,
                pagination: {
                    totalItems: total,
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

export default new NewsLetterController();
