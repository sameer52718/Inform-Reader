import BaseController from '../BaseController.js';
import Coupon from '../../models/Coupon.js';
import mongoose from "mongoose";

class CouponController extends BaseController {
    constructor() {
        super();
        this.get = this.get.bind(this);
        this.filter = this.filter.bind(this);
        this.detail = this.detail.bind(this);
    }

    async get(req, res, next) {
        try {
            let { isDeleted } = req.query;

            const filters = { isDeleted: false };
            if (isDeleted) filters.isDeleted = true;

            const latestCouponsByCategory = await Coupon.aggregate([
                { $match: filters },
                { $sort: { createdAt: -1 } },
                {
                    $lookup: {
                        from: "categories",
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
                        coupons: {
                            $push: {
                                name: "$name",
                                discount: "$discount",
                                image: "$image"
                            }
                        }
                    }
                },
                { $project: { _id: 1, categoryName: 1, coupons: { $slice: ["$coupons", 5] } } }
            ]);

            return res.status(200).json({
                error: false,
                latestCouponsByCategory
            });

        } catch (error) {
            return this.handleError(next, error.message || "An unexpected error occurred", 500);
        }
    }
    async filter(req, res, next) {
        try {
            let { categoryId, subCategoryId, brandId, discount, name } = req.query;

            const filters = { isDeleted: false };

            if (categoryId) {
                filters.categoryId = new mongoose.Types.ObjectId(categoryId);
            }

            if (subCategoryId) {
                filters.subCategoryId = new mongoose.Types.ObjectId(subCategoryId);
            }

            if (brandId) {
                filters.brandId = new mongoose.Types.ObjectId(brandId);
            }

            if (discount) {
                filters.discount = { $gte: parseFloat(discount) };
            }

            if (name) {
                filters.name = { $regex: name, $options: "i" }; // Case-insensitive search
            }
            
            const coupons = await Coupon.aggregate([
                { $match: filters },
                {
                    $lookup: {
                        from: "categories",
                        localField: "categoryId",
                        foreignField: "_id",
                        as: "category"
                    }
                },
                { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
                {
                    $project: {
                        _id: 1,
                        categoryId: 1,
                        categoryName: "$category.name",
                        subCategoryId: 1,
                        brandId: 1,
                        name: 1,
                        discount: 1,
                        image: 1
                    }
                }
            ]);

            return res.status(200).json({
                error: false,
                coupons
            });

        } catch (error) {
            return this.handleError(next, error.message || "An unexpected error occurred", 500);
        }
    }

    async detail(req, res, next) {
        try {
            let { isDeleted } = req.query;
            let { couponId } = req.params;

            const filters = {
                isDeleted: false,
                _id: couponId
            };
            if (isDeleted) filters.isDeleted = true;

            const coupon = await Coupon.findOne(filters)
                .populate('categoryId', 'name')
                .populate('brandId', 'name')
                .populate('subCategoryId', 'name')
                .select('name discount code image status createdAt');

            if (!coupon) {
                return this.handleError(next, 'Coupon not found', 404);
            }

            return res.status(200).json({
                error: false,
                coupon
            });

        } catch (error) {
            return this.handleError(next, error.message || "An unexpected error occurred", 500);
        }
    }


}

export default new CouponController();
