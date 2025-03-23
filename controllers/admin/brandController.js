import BaseController from '../BaseController.js';
import Brand from '../../models/Brand.js';

class BrandController extends BaseController {
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

            if (isDeleted) {
                filters.isDeleted = true;
            }

            const brands = await Brand.find(filters)
                .skip(skip)
                .limit(limit);

            const totalBrands = await Brand.countDocuments(filters);
            const totalPages = Math.ceil(totalBrands / limit);

            return res.status(200).json({
                error: false,
                brands,
                pagination: {
                    totalItems: totalBrands,
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
            const { name } = req.body;

            if (!name) {
                return this.handleError(next, 'Brand name is required', 400);
            }

            const existingBrand = await Brand.findOne({ name });
            if (existingBrand) {
                return this.handleError(next, 'Brand with this name already exists', 400);
            }

            await Brand.create({ name });

            return res.status(201).json({
                error: false,
                message: 'Brand created successfully',
            });

        } catch (error) {
            return this.handleError(next, error.message || 'An unexpected error occurred', 500);
        }
    }

    async info(req, res, next) {
        try {
            const { id } = req.params;
            const brand = await Brand.findOne({ _id: id, isDeleted: false });

            if (!brand) {
                return this.handleError(next, 'Brand not found', 404);
            }

            return res.status(200).json({
                error: false,
                brand,
            });

        } catch (error) {
            return this.handleError(next, error.message || 'An unexpected error occurred', 500);
        }
    }

    async update(req, res, next) {
        try {
            const { name, status } = req.body;
            const { id } = req.params;

            if (!name) {
                return this.handleError(next, 'Brand name is required', 400);
            }

            const existingBrand = await Brand.findById(id);
            if (!existingBrand) {
                return this.handleError(next, 'Brand not found', 404);
            }

            const duplicateBrand = await Brand.findOne({ name, _id: { $ne: id } });
            if (duplicateBrand) {
                return this.handleError(next, 'Brand with this name already exists', 400);
            }

            existingBrand.name = name;
            existingBrand.status = status !== undefined ? status : existingBrand.status;

            await existingBrand.save();

            return res.status(200).json({
                error: false,
                message: 'Brand updated successfully',
            });

        } catch (error) {
            return this.handleError(next, error.message || 'An unexpected error occurred', 500);
        }
    }

    async status(req, res, next) {
        try {
            const { id } = req.params;
            const brand = await Brand.findById(id);

            if (!brand) {
                return this.handleError(next, 'Brand not found', 404);
            }

            brand.status = !brand.status;
            await brand.save();

            return res.status(200).json({
                error: false,
                message: `Brand status updated successfully to ${brand.status ? 'Active' : 'De-Active'}`,
            });

        } catch (error) {
            return this.handleError(next, error.message || 'An unexpected error occurred', 500);
        }
    }

    async delete(req, res, next) {
        try {
            const { id } = req.params;
            const brand = await Brand.findById(id);

            if (!brand) {
                return this.handleError(next, 'Brand not found', 404);
            }

            brand.isDeleted = !brand.isDeleted;
            await brand.save();

            return res.status(200).json({
                error: false,
                message: `Brand has been ${brand.isDeleted ? 'deleted' : 'restored'} successfully`,
            });

        } catch (error) {
            return this.handleError(next, error.message || 'An unexpected error occurred', 500);
        }
    }
}

export default new BrandController();