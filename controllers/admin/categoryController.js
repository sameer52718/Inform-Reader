import BaseController from '../BaseController.js';
import Category from '../../models/Category.js';

class CategoryController extends BaseController {
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

            const categories = await Category.find(filters)
                .populate('adminId', 'name')
                .populate('typeId', 'name')
                .skip(skip)
                .limit(limit);

            const totalCategories = await Category.countDocuments(filters);
            const totalPages = Math.ceil(totalCategories / limit);

            return res.status(200).json({
                error: false,
                categories,
                pagination: {
                    totalItems: totalCategories,
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
            const { name, typeId } = req.body;

            if (!name || !typeId) {
                return this.handleError(next, 'All fields (name, typeId) are required', 400);
            }

            const existingCategory = await Category.findOne({ name });
            if (existingCategory) {
                return this.handleError(next, 'Category with this name already exists', 400);
            }

            const newCategory = await Category.create({
                adminId: _id,
                typeId,
                name,
            });

            return res.status(201).json({
                error: false,
                message: 'Category created successfully',
            });

        } catch (error) {
            // Centralized error handling
            return this.handleError(next, error.message || 'An unexpected error occurred', 500);
        }
    }

    async info(req, res, next) {
        try {
            let { id } = req.params;

            const filters = { isDeleted: false, _id: id };
            const category = await Category.findOne(filters)
                .populate('adminId', 'name')
                .populate('typeId', 'name');

            return res.status(200).json({
                error: false,
                category,
            });

        } catch (error) {
            return this.handleError(next, error.message || 'An unexpected error occurred', 500);
        }
    }

    async update(req, res, next) {
        try {
            const { _id } = req.user;
            const { name, typeId } = req.body;
            const { id } = req.params;

            if (!name || !typeId) {
                return this.handleError(next, 'All fields (name, typeId) are required', 400);
            }

            const existingCategory = await Category.findById(id);
            if (!existingCategory) {
                return this.handleError(next, 'Category not found', 404);
            }

            const duplicateCategory = await Category.findOne({ name, _id: { $ne: id } });
            if (duplicateCategory) {
                return this.handleError(next, 'Category with this name already exists', 400);
            }

            // Update the category
            existingCategory.name = name;
            existingCategory.typeId = typeId;
            existingCategory.adminId = _id;

            await existingCategory.save();

            return res.status(200).json({
                error: false,
                message: 'Category updated successfully',
            });

        } catch (error) {
            return this.handleError(next, error.message || 'An unexpected error occurred', 500);
        }
    }

    async status(req, res, next) {
        try {
            const { id } = req.params;

            const filters = { isDeleted: false, _id: id };
            const category = await Category.findOne(filters);
            if (!category) {
                return this.handleError(next, 'Category not found', 404);
            }

            category.status = !category.status;

            await category.save();

            return res.status(200).json({
                error: false,
                message: `Category status updated successfully to ${category.status ? 'Active' : 'De-Active'}`,
            });

        } catch (error) {
            return this.handleError(next, error.message || 'An unexpected error occurred', 500);
        }
    }

    async delete(req, res, next) {
        try {
            const { id } = req.params;

            const category = await Category.findById(id);
            if (!category) {
                return this.handleError(next, 'Category not found', 404);
            }

            category.isDeleted = !category.isDeleted;
            await category.save();

            return res.status(200).json({
                error: false,
                message: `Category has been ${category.isDeleted ? 'deleted' : 'restored'} successfully`,
            });

        } catch (error) {
            return this.handleError(next, error.message || 'An unexpected error occurred', 500);
        }
    }

}

export default new CategoryController();
