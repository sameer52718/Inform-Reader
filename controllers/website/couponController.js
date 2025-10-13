import BaseController from '../BaseController.js';
import Coupon from '../../models/Coupon.js';
import Offer from '../../models/Offer.js';
import Merchant from '../../models/Merchant.js';
import Advertisement from '../../models/Advertisement.js';
import SubCategory from '../../models/SubCategory.js';
import mongoose from "mongoose";

class CouponController extends BaseController {
    constructor() {
        super();
        this.home = this.home.bind(this);
        this.category = this.category.bind(this);
        this.get = this.get.bind(this);
        this.filter = this.filter.bind(this);
        this.detail = this.detail.bind(this);
        this.offerFilter = this.offerFilter.bind(this);
        this.offerDetail = this.offerDetail.bind(this);
        this.advertisementFilter = this.advertisementFilter.bind(this);
        this.advertisementDetail = this.advertisementDetail.bind(this);
    }

    async home(req, res, next) {
        try {
            // Fetch 12 random active coupons
            const coupons = await Coupon.aggregate([
                {
                    $match: {
                        isDeleted: false,
                        status: true
                    }
                },
                {
                    // Add a stage to validate categoryId
                    $addFields: {
                        isValidCategoryId: {
                            $cond: {
                                if: {
                                    $and: [
                                        { $ne: ["$categoryId", null] },
                                        { $ne: ["$categoryId", ""] },
                                        { $eq: [{ $type: "$categoryId" }, "objectId"] }
                                    ]
                                },
                                then: true,
                                else: false
                            }
                        }
                    }
                },
                {
                    $match: {
                        // Only include documents with valid or null categoryId
                        $or: [
                            { isValidCategoryId: true },
                            { categoryId: { $exists: false } },
                            { categoryId: null }
                        ]
                    }
                },
                { $sample: { size: 12 } },
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
                        couponcode: 1,
                        offerdescription: 1,
                        advertisername: 1,
                        offerstartdate: 1,
                        offerenddate: 1,
                        categoryName: "$category.name",
                        clickurl: 1
                    }
                }
            ]);

            // Log coupons with invalid categoryId for debugging
            const invalidCoupons = await Coupon.find({
                isDeleted: false,
                status: true,
                categoryId: {
                    $exists: true,
                    $ne: null,
                    $not: { $type: "objectId" }
                }
            })
                .select('_id categoryId')
                .limit(5)
                .lean();

            if (invalidCoupons.length > 0) {
                console.warn("⚠️ Found coupons with invalid categoryId:", invalidCoupons);
            }

            // Fetch 12 random active offers
            const offers = await Offer.aggregate([
                { $match: { is_active: true, status: "Active" } },
                { $sample: { size: 12 } },
                {
                    $project: {
                        _id: 1,
                        goid: 1,
                        offer_number: 1,
                        name: 1,
                        type: 1,
                        start_datetime: 1,
                        end_datetime: 1,
                        "advertiser.id": 1,
                        "advertiser.name": 1,
                        "advertiser.network": 1
                    }
                }
            ]);

            // Fetch 12 random partnerable merchants
            const merchants = await Merchant.aggregate([
                { $match: { can_partner: true } },
                { $sample: { size: 12 } },
                {
                    $project: {
                        _id: 1,
                        advertiserId: 1,
                        name: 1,
                        url: 1,
                        description: 1,
                        "contact.name": 1,
                        "contact.country": 1
                    }
                }
            ]);

            return res.status(200).json({
                error: false,
                coupons,
                offers,
                merchants
            });
        } catch (error) {
            console.error("❌ Error in home function:", error.message, error.stack);
            return this.handleError(next, error.message || 'An unexpected error occurred', 500);
        }
    }

    async category(req, res, next) {
        try {
            // Step 1: Find all distinct subCategoryIds used in active, non-deleted coupons
            const subCategoryIds = await Coupon.distinct("subCategoryId", {
                isDeleted: false,
                status: true,
                subCategoryId: { $ne: null }
            });

            // Step 2: Fetch corresponding subcategory details
            const subCategories = await SubCategory.find({
                _id: { $in: subCategoryIds },
            })
                .select("_id name categoryId order createdAt updatedAt")
                .sort({ order: 1 })
                .lean();

            // Step 3: Return result
            return res.status(200).json({
                error: false,
                message: "Subcategories fetched successfully",
                count: subCategories.length,
                subCategories
            });
        } catch (error) {
            console.error("❌ Error in category function:", error.message, error.stack);
            return this.handleError(next, error.message || "An unexpected error occurred", 500);
        }
    }

    async get(req, res, next) {
        try {
            let { isDeleted } = req.query;

            const filters = { isDeleted: false };
            if (isDeleted === 'true') filters.isDeleted = true;

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
                { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
                {
                    $group: {
                        _id: "$categoryId",
                        categoryName: { $first: "$category.name" },
                        coupons: {
                            $push: {
                                couponcode: "$couponcode",
                                offerdescription: "$offerdescription",
                                advertisername: "$advertisername",
                                offerstartdate: "$offerstartdate",
                                offerenddate: "$offerenddate"
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
            return this.handleError(next, error.message || 'An unexpected error occurred', 500);
        }
    }

    async filter(req, res, next) {
        try {
            let {
                categoryId,
                subCategoryId,
                adminId,
                promotiontype,
                offerdescription,
                offerstartdate,
                offerenddate,
                couponcode,
                clickurl,
                impressionpixel,
                advertiserid,
                advertisername,
                network,
                status,
                isDeleted,
                page = 1,
                limit = 10,
                sort = 'createdAt',
                order = 'desc'
            } = req.query;

            const filters = { isDeleted: false };

            if (isDeleted === 'true') filters.isDeleted = true;
            if (categoryId) filters.categoryId = new mongoose.Types.ObjectId(categoryId);
            if (subCategoryId) filters.subCategoryId = new mongoose.Types.ObjectId(subCategoryId);
            if (adminId) filters.adminId = new mongoose.Types.ObjectId(adminId);
            if (promotiontype) filters['promotiontypes.promotiontype'] = { $regex: promotiontype, $options: 'i' };
            if (offerdescription) filters.offerdescription = { $regex: offerdescription, $options: 'i' };
            if (offerstartdate) filters.offerstartdate = { $gte: new Date(offerstartdate) };
            if (offerenddate) filters.offerenddate = { $lte: new Date(offerenddate) };
            if (couponcode) filters.couponcode = { $regex: couponcode, $options: 'i' };
            if (clickurl) filters.clickurl = { $regex: clickurl, $options: 'i' };
            if (impressionpixel) filters.impressionpixel = { $regex: impressionpixel, $options: 'i' };
            if (advertiserid) filters.advertiserid = Number(advertiserid);
            if (advertisername) filters.advertisername = { $regex: advertisername, $options: 'i' };
            if (network) filters.network = { $regex: network, $options: 'i' };
            if (status !== undefined) filters.status = status === 'true';

            // Pagination
            const pageNum = parseInt(page, 10);
            const limitNum = parseInt(limit, 10);
            const skip = (pageNum - 1) * limitNum;

            // Sorting
            const sortOrder = order === 'desc' ? -1 : 1;
            const sortQuery = { [sort]: sortOrder };

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
                        adminId: 1,
                        categoryId: 1,
                        categoryName: "$category.name",
                        subCategoryId: 1,
                        promotiontypes: 1,
                        offerdescription: 1,
                        offerstartdate: 1,
                        offerenddate: 1,
                        couponcode: 1,
                        clickurl: 1,
                        impressionpixel: 1,
                        advertiserid: 1,
                        advertisername: 1,
                        network: 1,
                        status: 1,
                        createdAt: 1
                    }
                },
                { $sort: sortQuery },
                { $skip: skip },
                { $limit: limitNum }
            ]);

            const total = await Coupon.countDocuments(filters);

            return res.status(200).json({
                error: false,
                coupons,
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

    async detail(req, res, next) {
        try {
            let { isDeleted } = req.query;
            let { couponId } = req.params;

            const filters = {
                isDeleted: false,
                _id: new mongoose.Types.ObjectId(couponId)
            };
            if (isDeleted === 'true') filters.isDeleted = true;

            const coupon = await Coupon.findOne(filters)
                .populate('categoryId', 'name')
                .populate('subCategoryId', 'name')
                .populate('adminId', 'name email')
                .select('adminId categoryId subCategoryId promotiontypes offerdescription offerstartdate offerenddate couponcode clickurl impressionpixel advertiserid advertisername network status createdAt');

            if (!coupon) {
                return this.handleError(next, 'Coupon not found', 404);
            }

            return res.status(200).json({
                error: false,
                coupon
            });
        } catch (error) {
            return this.handleError(next, error.message || 'An unexpected error occurred', 500);
        }
    }

    async offerFilter(req, res, next) {
        try {
            let {
                advertiserId,
                advertiserName,
                status,
                type,
                startDatetime,
                endDatetime,
                isActive,
                page = 1,
                limit = 10,
                sort = 'createdAt',
                order = 'desc'
            } = req.query;

            const filters = { is_active: true };

            if (isActive === 'false') filters.is_active = false;
            if (advertiserId) filters['advertiser.id'] = Number(advertiserId);
            if (advertiserName) filters['advertiser.name'] = { $regex: advertiserName, $options: 'i' };
            if (status) filters.status = { $regex: status, $options: 'i' };
            if (type) filters.type = { $regex: type, $options: 'i' };
            if (startDatetime) filters.start_datetime = { $gte: new Date(startDatetime) };
            if (endDatetime) filters.end_datetime = { $lte: new Date(endDatetime) };

            // Pagination
            const pageNum = parseInt(page, 10);
            const limitNum = parseInt(limit, 10);
            const skip = (pageNum - 1) * limitNum;

            // Sorting
            const sortOrder = order === 'desc' ? -1 : 1;
            const sortQuery = { [sort]: sortOrder };

            const offers = await Offer.aggregate([
                { $match: filters },
                {
                    $project: {
                        _id: 1,
                        goid: 1,
                        advertiser: {
                            id: 1,
                            name: 1,
                            network: 1,
                            status: 1
                        },
                        offer_number: 1,
                        name: 1,
                        type: 1,
                        status: 1,
                        start_datetime: 1,
                        end_datetime: 1,
                        createdAt: 1
                    }
                },
                { $sort: sortQuery },
                { $skip: skip },
                { $limit: limitNum }
            ]);

            const total = await Offer.countDocuments(filters);

            return res.status(200).json({
                error: false,
                offers,
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

    async offerDetail(req, res, next) {
        try {
            let { isActive } = req.query;
            let { offerId } = req.params;

            const filters = { is_active: true };

            if (isActive === 'false') filters.is_active = false;
            filters.goid = Number(offerId);

            const offer = await Offer.findOne(filters).lean();

            if (!offer) {
                return this.handleError(next, 'Offer not found', 404);
            }

            return res.status(200).json({
                error: false,
                offer
            });
        } catch (error) {
            return this.handleError(next, error.message || 'An unexpected error occurred', 500);
        }
    }

    async advertisementFilter(req, res, next) {
        try {
            let {
                advertiserId,
                advertiserName,
                programName,
                accountStatus,
                relationshipStatus,
                language,
                performanceIncentives,
                isActive,
                startDatetime,
                endDatetime,
                page = 1,
                limit = 10,
                sort = 'createdAt',
                order = 'desc'
            } = req.query;

            const filters = {};

            // ✅ Boolean filter
            if (isActive === 'true') filters.is_active = true;
            if (isActive === 'false') filters.is_active = false;

            // ✅ Simple filters
            if (advertiserId) filters.advertiserId = advertiserId;
            if (advertiserName) filters.advertiserName = { $regex: advertiserName, $options: 'i' };
            if (programName) filters.programName = { $regex: programName, $options: 'i' };
            if (accountStatus) filters.accountStatus = { $regex: accountStatus, $options: 'i' };
            if (relationshipStatus) filters.relationshipStatus = { $regex: relationshipStatus, $options: 'i' };
            if (language) filters.language = { $regex: language, $options: 'i' };

            // ✅ Boolean filters
            if (performanceIncentives !== undefined) {
                filters.performanceIncentives = performanceIncentives === 'true';
            }

            // ✅ Date range filters (if you want created range)
            if (startDatetime || endDatetime) {
                filters.createdAt = {};
                if (startDatetime) filters.createdAt.$gte = new Date(startDatetime);
                if (endDatetime) filters.createdAt.$lte = new Date(endDatetime);
            }

            // ✅ Pagination
            const pageNum = parseInt(page, 10);
            const limitNum = parseInt(limit, 10);
            const skip = (pageNum - 1) * limitNum;

            // ✅ Sorting
            const sortOrder = order === 'desc' ? -1 : 1;
            const sortQuery = { [sort]: sortOrder };

            // ✅ Query
            const advertisements = await Advertisement.find(filters)
                .select(
                    'advertiserId advertiserName programName accountStatus relationshipStatus language networkRank performanceIncentives primaryCategory createdAt'
                )
                .sort(sortQuery)
                .skip(skip)
                .limit(limitNum)
                .lean();

            const total = await Advertisement.countDocuments(filters);

            return res.status(200).json({
                error: false,
                data: advertisements,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total,
                    totalPages: Math.ceil(total / limitNum),
                },
            });
        } catch (error) {
            return next({
                status: 500,
                message: error.message || 'An unexpected error occurred',
            });
        }
    }

    // 📄 GET SINGLE ADVERTISEMENT DETAIL
    async advertisementDetail(req, res, next) {
        try {
            const { advertiserId } = req.params;

            const filters = {};
            if (advertiserId) filters.advertiserId = advertiserId;

            const advertisement = await Advertisement.findOne(filters).lean();

            if (!advertisement) {
                return next({
                    status: 404,
                    message: 'Advertisement not found',
                });
            }

            return res.status(200).json({
                error: false,
                data: advertisement,
            });
        } catch (error) {
            return next({
                status: 500,
                message: error.message || 'An unexpected error occurred',
            });
        }
    }
}

export default new CouponController();