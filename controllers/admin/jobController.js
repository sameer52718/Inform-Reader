import BaseController from '../BaseController.js';
import Job from '../../models/Job.js';

class JobController extends BaseController {
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

            const jobs = await Job.find(filters)
                .populate('adminId', 'name')
                .populate('categoryId', 'name')
                .populate('subCategoryId', 'name')
                .populate('companyId', 'name logo')
                .populate('countryId', 'name')
                .select('name type status createdAt')
                .skip(skip)
                .limit(limit);

            const totalJobs = await Job.countDocuments(filters);
            const totalPages = Math.ceil(totalJobs / limit);

            return res.status(200).json({
                error: false,
                jobs,
                pagination: {
                    totalItems: totalJobs,
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
            const {
                categoryId, subCategoryId, companyId, countryId, location,
                name, qualification, experience, gender, careerLevel, type
            } = req.body;

            // Ensure all required fields are provided
            const requiredFields = { categoryId, subCategoryId, companyId, name, type, countryId, location, qualification, experience, gender, careerLevel };
            const missingFields = Object.entries(requiredFields).filter(([_, value]) => !value).map(([key]) => key);

            if (missingFields.length) {
                return this.handleError(next, `Missing required fields: ${missingFields.join(', ')}`, 400);
            }

            // Create job entry
            await Job.create({
                adminId: _id,
                ...requiredFields,
            });

            return res.status(201).json({
                error: false,
                message: 'Job added successfully',
            });

        } catch (error) {
            return this.handleError(next, error.message || 'An unexpected error occurred', 500);
        }
    }

    async info(req, res, next) {
        try {
            const { id } = req.params;
            const job = await Job.findById(id)
                .populate('adminId', 'name')
                .populate('categoryId', 'name')
                .populate('subCategoryId', 'name')
                .populate('companyId', 'name logo')
                .populate('countryId', 'name');

            if (!job) {
                return this.handleError(next, 'Job not found', 404);
            }

            return res.status(200).json({
                error: false,
                job,
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
                return this.handleError(next, 'Job ID is required', 400);
            }

            // Validate required fields in the request body
            const requiredFields = ['categoryId', 'subCategoryId', 'companyId', 'name', 'type', 'countryId', 'location', 'qualification', 'experience', 'gender', 'careerLevel'];
            const missingFields = requiredFields.filter(field => !updates[field]);

            if (missingFields.length) {
                return this.handleError(next, `Missing required fields: ${missingFields.join(', ')}`, 400);
            }

            // Prevent updating protected fields
            const protectedFields = ['_id', 'adminId', 'createdAt', 'updatedAt'];
            protectedFields.forEach(field => delete updates[field]);

            // Find and update the job
            const job = await Job.findByIdAndUpdate(id, updates, { new: true, runValidators: true });

            if (!job) {
                return this.handleError(next, 'Job not found', 404);
            }

            return res.status(200).json({
                error: false,
                message: 'Job updated successfully',
            });

        } catch (error) {
            return this.handleError(next, error.message || 'An unexpected error occurred', 500);
        }
    }

    async status(req, res, next) {
        try {
            const { id } = req.params;

            const filters = { isDeleted: false, _id: id };
            const job = await Job.findOne(filters);
            if (!job) {
                return this.handleError(next, 'Job not found', 404);
            }

            job.status = !job.status;

            await job.save();

            return res.status(200).json({
                error: false,
                message: `Job status updated successfully to ${job.status ? 'Active' : 'De-Active'}`,
            });

        } catch (error) {
            return this.handleError(next, error.message || 'An unexpected error occurred', 500);
        }
    }

    async delete(req, res, next) {
        try {

            const { id } = req.params;
            const job = await Job.findById(id);
            if (!job) {
                return this.handleError(next, 'Job not found', 404);
            }

            job.isDeleted = !job.isDeleted;
            await job.save();

            return res.status(200).json({
                error: false,
                message: `Job has been ${job.isDeleted ? 'deleted' : 'restored'} successfully`,
            });

        } catch (error) {
            return this.handleError(next, error.message || 'An unexpected error occurred', 500);
        }
    }


}

export default new JobController();
