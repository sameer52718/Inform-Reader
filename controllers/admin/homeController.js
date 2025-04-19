import BaseController from '../BaseController.js';
import Traffic from '../../models/Traffic.js';

class HomeController extends BaseController {
    constructor() {
        super();
        this.get = this.get.bind(this);
    }

    async get(req, res, next) {
        try {

            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

            const traffic = await Traffic.aggregate([
                {
                    $match: {
                        date: { $gte: startOfMonth, $lte: endOfMonth }
                    }
                },
                {
                    $group: {
                        _id: {
                            year: { $year: '$date' },
                            month: { $month: '$date' },
                            day: { $dayOfMonth: '$date' }
                        },
                        count: { $sum: 1 }
                    }
                },
                {
                    $sort: { '_id.day': 1 } // Sort by day of the month
                },
                {
                    $project: {
                        date: {
                            $dateFromParts: {
                                year: '$_id.year',
                                month: '$_id.month',
                                day: '$_id.day'
                            }
                        },
                        count: 1,
                        _id: 0
                    }
                }
            ]);

            return res.status(200).json({
                error: false,
                traffic,
            });

        } catch (error) {
            // Handle errors gracefully
            return this.handleError(next, error.message || 'An unexpected error occurred');
        }
    }


}

export default new HomeController();
