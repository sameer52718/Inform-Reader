import BaseController from '../BaseController.js';
import Biography from '../../models/Biography.js';

class BiographyController extends BaseController {
    constructor() {
        super();
        this.get = this.get.bind(this);
        this.filterByCategory = this.filterByCategory.bind(this);
        this.detail = this.detail.bind(this);
    }

    async get(req, res, next) {
        try {
            let { isDeleted } = req.query;

            const filters = { isDeleted: false };
            if (isDeleted) filters.isDeleted = true;

            // Get 5 random categories
            const randomCategories = await Biography.aggregate([
                { $match: filters },
                { $group: { _id: "$categoryId" } },
                { $sample: { size: 5 } }
            ]);

            const categoryIds = randomCategories.map(cat => cat._id);

            // Fetch 5 biographies per category with category name
            const biographies = await Biography.aggregate([
                { $match: { ...filters, categoryId: { $in: categoryIds } } },
                {
                    $lookup: {
                        from: "categories", // Make sure this matches your Category model collection name
                        localField: "categoryId",
                        foreignField: "_id",
                        as: "category"
                    }
                },
                { $unwind: "$category" },
                {
                    $group: {
                        _id: "$categoryId",
                        categoryName: { $first: "$category.name" },
                        biographies: { $push: { name: "$name", image: "$image" } }
                    }
                },
                { $project: { _id: 1, categoryName: 1, biographies: { $slice: ["$biographies", 5] } } }
            ]);

            return res.status(200).json({
                error: false,
                categories: biographies
            });

        } catch (error) {
            return this.handleError(next, error.message || "An unexpected error occurred", 500);
        }

    }

    async filterByCategory(req, res, next) {
        try {
            let { isDeleted } = req.query;
            let { categoryId } = req.params;

            const filters = { isDeleted: false, categoryId: categoryId };
            if (isDeleted) filters.isDeleted = true;

            const biographies = await Biography.find(filters)
                .select("name image");

            return res.status(200).json({
                error: false,
                biographies
            });

        } catch (error) {
            return this.handleError(next, error.message || "An unexpected error occurred", 500);
        }
    }

    async detail(req, res, next) {
        try {
            let { isDeleted } = req.query;
            let { categoryId } = req.params;
            let { biographyId } = req.params;

            const filters = { isDeleted: false, categoryId: categoryId, _id: biographyId };
            if (isDeleted) filters.isDeleted = true;

            const biographies = await Biography.findOne(filters)
                .populate('nationalityId', 'name')
                .populate('categoryId', 'name')
                .select("name image generalInformation");

            return res.status(200).json({
                error: false,
                biographies
            });

        } catch (error) {
            return this.handleError(next, error.message || "An unexpected error occurred", 500);
        }
    }

}

export default new BiographyController();
