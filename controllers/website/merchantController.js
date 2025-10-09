import BaseController from '../BaseController.js';
import Merchant from '../../models/Merchant.js';

class MerchantController extends BaseController {
    constructor() {
        super();
        this.get = this.get.bind(this);
        this.info = this.info.bind(this);
    }

    async get(req, res, next) {
        try {
            const { advertiserId, name, page = 1, limit = 10, sort = 'createdAt', order = 'desc' } = req.query;

            // Build query object for filtering
            const query = {};

            // Filter by advertiserId (exact match)
            if (advertiserId) {
                query.advertiserId = Number(advertiserId);
            }

            // Filter by name (case-insensitive partial match)
            if (name) {
                query.name = { $regex: name, $options: 'i' };
            }

            // Pagination
            const pageNum = parseInt(page, 10);
            const limitNum = parseInt(limit, 10);
            const skip = (pageNum - 1) * limitNum;

            // Sorting
            const sortOrder = order === 'desc' ? -1 : 1;
            const sortQuery = { [sort]: sortOrder };

            // Execute query
            const merchants = await Merchant.find(query)
                // .sort(sortQuery)
                .skip(skip)
                .limit(limitNum)
                .lean();

            // Get total count for pagination metadata
            const total = await Merchant.countDocuments(query);

            return res.status(200).json({
                merchants,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total,
                    totalPages: Math.ceil(total / limitNum)
                }
            });

        } catch (error) {
            return this.handleError(next, error.message || 'An unexpected error occurred', 500);
        }
    }

    async info(req, res, next) {
        try {
            const { id } = req.params;

            // Find merchant by _id or advertiserId
            const merchant = await Merchant.findOne({ advertiserId: Number(id) }).lean();

            if (!merchant) {
                return res.status(404).json({
                    success: false,
                    message: 'Merchant not found',
                });
            }

            return res.status(200).json({
                success: true,
                merchant,
            });

        } catch (error) {
            return this.handleError(next, error.message || 'An unexpected error occurred', 500);
        }
    }
}

export default new MerchantController();