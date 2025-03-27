import BaseController from '../BaseController.js';
import Company from '../../models/Company.js';

class CompanyController extends BaseController {
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

            const companies = await Company.find(filters)
            .populate('adminId', 'name')
                .select('name logo status createdAt')
                .skip(skip)
                .limit(limit);

            const totalCompanies = await Company.countDocuments(filters);
            const totalPages = Math.ceil(totalCompanies / limit);

            return res.status(200).json({
                error: false,
                companies,
                pagination: {
                    totalItems: totalCompanies,
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
            const { name } = req.body;

            if (!name) {
                return this.handleError(next, 'All required fields (name) must be provided', 400);
            }

            // Handle logo and banner picture upload if a file is provided
            let logo = '';

            if (req.files && req.files.length > 0) {
                for (const file of req.files) {
                    const fieldname = file.fieldname;
                    const fileName = file.originalname;
                    const filePath = this.createPath('company/' + fieldname + '/', fileName);
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
                        if (fieldname === 'logo') {
                            logo = attachedPath;
                        }

                    } catch (uploadError) {
                        return this.handleError(next, 'An error occurred during logo upload', 500);
                    }
                }
            }

            const newCompany = await Company.create({
                adminId: _id,
                name,
                logo,
            });

            return res.status(201).json({
                error: false,
                message: 'Company added successfully',
            });

        } catch (error) {
            return this.handleError(next, error.message || 'An unexpected error occurred', 500);
        }
    }

    async info(req, res, next) {
        try {
            const { id } = req.params;
            const company = await Company.findById(id)
                .populate('adminId', 'name');

            if (!company) {
                return this.handleError(next, 'Company not found', 404);
            }

            return res.status(200).json({
                error: false,
                company,
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
                return this.handleError(next, 'Company ID is required', 400);
            }

            const company = await Company.findById(id);
            if (!company) {
                return this.handleError(next, 'Company not found', 404);
            }

            // Prevent updating protected fields (e.g., `_id`, `adminId`)
            const protectedFields = ['_id', 'adminId'];
            protectedFields.forEach(field => delete updates[field]);

            // If updating logo, handle logo upload
            let logo = company.logo; // Preserve existing logo
            if (req.files && req.files.length > 0) {
                for (const file of req.files) {
                    const fieldname = file.fieldname;
                    const fileName = file.originalname;
                    const filePath = this.createPath('company/' + fieldname + '/', fileName);
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

                        if (fieldname === 'logo') {
                            logo = attachedPath;
                        }

                    } catch (uploadError) {
                        return this.handleError(next, 'An error occurred during logo upload', 500);
                    }
                }
            }

            // Apply updates to the company document
            Object.assign(company, updates);
            company.logo = logo; // Update logo if changed

            await company.save();

            return res.status(200).json({
                error: false,
                message: 'Company updated successfully',
            });

        } catch (error) {
            return this.handleError(next, error.message || 'An unexpected error occurred', 500);
        }
    }

    async status(req, res, next) {
        try {
            const { id } = req.params;

            const filters = { isDeleted: false, _id: id };
            const company = await Company.findOne(filters);
            if (!company) {
                return this.handleError(next, 'Company not found', 404);
            }

            company.status = !company.status;

            await company.save();

            return res.status(200).json({
                error: false,
                message: `Company status updated successfully to ${company.status ? 'Active' : 'De-Active'}`,
            });

        } catch (error) {
            return this.handleError(next, error.message || 'An unexpected error occurred', 500);
        }
    }

    async delete(req, res, next) {
        try {

            const { id } = req.params;
            const company = await Company.findById(id);
            if (!company) {
                return this.handleError(next, 'Company not found', 404);
            }

            company.isDeleted = !company.isDeleted;
            await company.save();

            return res.status(200).json({
                error: false,
                message: `Company has been ${company.isDeleted ? 'deleted' : 'restored'} successfully`,
            });

        } catch (error) {
            return this.handleError(next, error.message || 'An unexpected error occurred', 500);
        }
    }

}

export default new CompanyController();
