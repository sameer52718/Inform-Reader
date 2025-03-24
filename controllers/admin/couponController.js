import BaseController from '../BaseController.js';
import Coupon from '../../models/Coupon.js';

class CouponController extends BaseController {
    constructor() {
        super();
        this.get = this.get.bind(this);
        this.insert = this.insert.bind(this);
        this.info = this.info.bind(this);
        this.update = this.update.bind(this);
        this.status = this.status.bind(this);
        this.delete = this.delete.bind(this);
    }

    async get(req, res, next) {
        try {
            let { page = 1, limit = 10, isDeleted } = req.query;
            page = parseInt(page);
            limit = parseInt(limit);
            const skip = (page - 1) * limit;

            const filters = { isDeleted: false };
            if (isDeleted) filters.isDeleted = true;

            const coupons = await Coupon.find(filters)
                .populate('adminId', 'name')
                .populate('categoryId', 'name')
                .populate('subCategoryId', 'name')
                .populate('brandId', 'name')
                .select('name discount code status createdAt')
                .skip(skip)
                .limit(limit);

            const totalCoupons = await Coupon.countDocuments(filters);
            const totalPages = Math.ceil(totalCoupons / limit);

            return res.status(200).json({
                error: false,
                coupons,
                pagination: {
                    totalItems: totalCoupons,
                    currentPage: page,
                    totalPages,
                    pageSize: limit,
                },
            });

        } catch (error) {
            return this.handleError(next, error.message || 'An unexpected error occurred', 500);
        }
    }

    async insert(req, res, next) {
        try {
            const { _id } = req.user;
            const { brandId, categoryId, subCategoryId, name, discount, code } = req.body;

            if (!name || !discount || !code) {
                return this.handleError(next, 'All required fields (name, discount, code) must be provided', 400);
            }

            let image = '';

            if (req.files && req.files.length > 0) {
                for (const file of req.files) {
                    const fieldname = file.fieldname;
                    const fileName = file.originalname;
                    const filePath = this.createPath('coupon/' + fieldname + '/', fileName);
                    const attachedPath = this.attachPath(filePath);

                    // Check if the file size is greater than 2MB (2MB = 2 * 1024 * 1024 bytes)
                    const maxSize = 2 * 1024 * 1024; // 2MB
                    if (file.size > maxSize) {
                        return this.handleError(next, `${fieldname} size exceeds 2MB limit`, 400);
                    }

                    try {
                        const isUploaded = await this.uploadFile({
                            Key: filePath,
                            Body: file.buffer,
                            ContentType: file.mimetype,
                        });

                        if (!isUploaded) {
                            return this.handleError(next, `${fieldname} upload failed`, 400);
                        }

                        // Assign the appropriate field based on the fieldname
                        if (fieldname === 'image') {
                            image = attachedPath;
                        }

                    } catch (uploadError) {
                        return this.handleError(next, 'An error occurred during image upload', 500);
                    }
                }
            }

            const newCoupon = await Coupon.create({
                brandId,
                categoryId,
                subCategoryId,
                adminId: _id,
                name,
                discount,
                code,
                image,
            });

            return res.status(201).json({
                error: false,
                message: 'Coupon added successfully',
            });

        } catch (error) {
            return this.handleError(next, error.message || 'An unexpected error occurred', 500);
        }
    }

    async info(req, res, next) {
        try {
            const { id } = req.params;
            const coupon = await Coupon.findById(id)
                .populate('adminId', 'name')
                .populate('categoryId', 'name')
                .populate('subCategoryId', 'name')
                .populate('brandId', 'name');

            if (!coupon) {
                return this.handleError(next, 'Coupon not found', 404);
            }

            return res.status(200).json({
                error: false,
                coupon,
            });

        } catch (error) {
            return this.handleError(next, error.message || 'An unexpected error occurred', 500);
        }
    }

    async update(req, res, next) {
        try {
            const { id } = req.params;
            const updates = req.body;

            if (!id) {
                return this.handleError(next, 'Coupon ID is required', 400);
            }

            const coupon = await Coupon.findById(id);
            if (!coupon) {
                return this.handleError(next, 'Coupon not found', 404);
            }

            // Prevent updating protected fields (e.g., `_id`, `adminId`)
            const protectedFields = ['_id', 'adminId'];
            protectedFields.forEach(field => delete updates[field]);

            // If updating image, handle image upload
            let image = coupon.image; // Preserve existing image
            if (req.files && req.files.length > 0) {
                for (const file of req.files) {
                    const fieldname = file.fieldname;
                    const fileName = file.originalname;
                    const filePath = this.createPath('coupon/' + fieldname + '/', fileName);
                    const attachedPath = this.attachPath(filePath);

                    // Check file size (Max: 2MB)
                    const maxSize = 2 * 1024 * 1024;
                    if (file.size > maxSize) {
                        return this.handleError(next, `${fieldname} size exceeds 2MB limit`, 400);
                    }

                    try {
                        const isUploaded = await this.uploadFile({
                            Key: filePath,
                            Body: file.buffer,
                            ContentType: file.mimetype,
                        });

                        if (!isUploaded) {
                            return this.handleError(next, `${fieldname} upload failed`, 400);
                        }

                        if (fieldname === 'image') {
                            image = attachedPath;
                        }

                    } catch (uploadError) {
                        return this.handleError(next, 'An error occurred during image upload', 500);
                    }
                }
            }

            // Apply updates to the coupon document
            Object.assign(coupon, updates);
            coupon.image = image; // Update image if changed

            await coupon.save();

            return res.status(200).json({
                error: false,
                message: 'Coupon updated successfully',
            });

        } catch (error) {
            return this.handleError(next, error.message || 'An unexpected error occurred', 500);
        }
    }

    async status(req, res, next) {
        try {
            const { id } = req.params;

            const filters = { isDeleted: false, _id: id };
            const coupon = await Coupon.findOne(filters);
            if (!coupon) {
                return this.handleError(next, 'Coupon not found', 404);
            }

            coupon.status = !coupon.status;

            await coupon.save();

            return res.status(200).json({
                error: false,
                message: `Coupon status updated successfully to ${coupon.status ? 'Active' : 'De-Active'}`,
            });

        } catch (error) {
            return this.handleError(next, error.message || 'An unexpected error occurred', 500);
        }
    }

    async delete(req, res, next) {
        try {

            const { id } = req.params;
            const coupon = await Coupon.findById(id);
            if (!coupon) {
                return this.handleError(next, 'Coupon not found', 404);
            }

            coupon.isDeleted = !coupon.isDeleted;
            await coupon.save();

            return res.status(200).json({
                error: false,
                message: `Coupon has been ${coupon.isDeleted ? 'deleted' : 'restored'} successfully`,
            });

        } catch (error) {
            return this.handleError(next, error.message || 'An unexpected error occurred', 500);
        }
    }

}

export default new CouponController();
