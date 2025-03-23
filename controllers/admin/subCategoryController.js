import BaseController from '../BaseController.js';
import SubCategory from '../../models/SubCategory.js';

class SubCategoryController extends BaseController {
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

            const subCategories = await SubCategory.find(filters)
                .populate('adminId', 'name')
                .populate('typeId', 'name')
                .populate('categoryId', 'name')
                .skip(skip)
                .limit(limit);

            const totalSubCategories = await SubCategory.countDocuments(filters);
            const totalPages = Math.ceil(totalSubCategories / limit);

            return res.status(200).json({
                error: false,
                subCategories,
                pagination: {
                    totalItems: totalSubCategories,
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
            const { name, typeId, categoryId } = req.body;

            if (!name || !typeId || !categoryId) {
                return this.handleError(next, 'All fields (name, typeId, categoryId) are required', 400);
            }

            const existingSubCategory = await SubCategory.findOne({ name });
            if (existingSubCategory) {
                return this.handleError(next, 'SubCategory with this name already exists', 400);
            }

            const newSubCategory = await SubCategory.create({
                adminId: _id,
                typeId,
                categoryId,
                name,
            });

            return res.status(201).json({
                error: false,
                message: 'SubCategory created successfully',
            });

        } catch (error) {
            return this.handleError(next, error.message || 'An unexpected error occurred', 500);
        }
    }

    async info(req, res, next) {
        try {
            let { id } = req.params;

            const subCategory = await SubCategory.findOne({ isDeleted: false, _id: id })
                .populate('adminId', 'name')
                .populate('categoryId', 'name')
                .populate('typeId', 'name');

            if (!subCategory) {
                return this.handleError(next, 'SubCategory not found', 404);
            }

            return res.status(200).json({
                error: false,
                subCategory,
            });

        } catch (error) {
            return this.handleError(next, error.message || 'An unexpected error occurred', 500);
        }
    }

    async update(req, res, next) {
        try {
            const { _id } = req.user;
            const { name, typeId, categoryId } = req.body;
            const { id } = req.params;

            if (!name || !typeId || !categoryId) {
                return this.handleError(next, 'All fields (name, typeId, category) are required', 400);
            }

            const existingSubCategory = await SubCategory.findById(id);
            if (!existingSubCategory) {
                return this.handleError(next, 'SubCategory not found', 404);
            }

            const duplicateSubCategory = await SubCategory.findOne({ name, _id: { $ne: id } });
            if (duplicateSubCategory) {
                return this.handleError(next, 'SubCategory with this name already exists', 400);
            }

            // Update the subCategory
            existingSubCategory.name = name;
            existingSubCategory.typeId = typeId;
            existingSubCategory.categoryId = categoryId;

            await existingSubCategory.save();

            return res.status(200).json({
                error: false,
                message: 'SubCategory updated successfully',
            });

        } catch (error) {
            return this.handleError(next, error.message || 'An unexpected error occurred', 500);
        }
    }

    async status(req, res, next) {
        try {
            const { id } = req.params;

            const subCategory = await SubCategory.findOne({ isDeleted: false, _id: id });
            if (!subCategory) {
                return this.handleError(next, 'SubCategory not found', 404);
            }

            subCategory.status = !subCategory.status;
            await subCategory.save();

            return res.status(200).json({
                error: false,
                message: `SubCategory status updated successfully to ${subCategory.status ? 'Active' : 'De-Active'}`,
            });

        } catch (error) {
            return this.handleError(next, error.message || 'An unexpected error occurred', 500);
        }
    }

    async delete(req, res, next) {
        try {
            const { id } = req.params;

            const subCategory = await SubCategory.findById(id);
            if (!subCategory) {
                return this.handleError(next, 'SubCategory not found', 404);
            }

            subCategory.isDeleted = !subCategory.isDeleted;
            await subCategory.save();

            return res.status(200).json({
                error: false,
                message: `SubCategory has been ${subCategory.isDeleted ? 'deleted' : 'restored'} successfully`,
            });

        } catch (error) {
            return this.handleError(next, error.message || 'An unexpected error occurred', 500);
        }
    }
}

export default new SubCategoryController();
