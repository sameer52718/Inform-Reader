import BaseController from '../BaseController.js';
import User from '../../models/User.js';

class UserController extends BaseController {
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

            const { _id } = req.user;

            const filter = { _id: { $ne: _id }, role: 'USER' };

            if (startDate) {
                filter.createdAt = { $gte: new Date(startDate) };
            }

            if (endDate) {
                filter.createdAt = {
                    ...filter.createdAt,
                    $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
                };
            }

            const users = await User.find(filter)
                .select('name email phone profile status createdAt')
                .skip(skip)
                .limit(limit);

            const totalUsers = await User.countDocuments(filter);
            const totalPages = Math.ceil(totalUsers / limit);

            return res.status(200).json({
                error: false,
                message: 'Users retrieved successfully',
                data: users,
                pagination: {
                    totalItems: totalUsers,
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

export default new UserController();
