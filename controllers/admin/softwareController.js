import BaseController from '../BaseController.js';
import Software from '../../models/Software.js';

class SoftwareController extends BaseController {
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

            const software = await Software.find(filters)
                .populate('adminId', 'name')
                // .populate('categoryId', 'name')
                // .populate('subCategoryId', 'name')
                .select('name logo status version createdAt operatingSystem')
                .skip(skip)
                .sort({createdAt : -1})
                .limit(limit);

            const totalSoftwares = await Software.countDocuments(filters);
            const totalPages = Math.ceil(totalSoftwares / limit);

            return res.status(200).json({
                error: false,
                data: software,
                pagination: {
                    totalItems: totalSoftwares,
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
            const { categoryId, subCategoryId, name, overview, download, releaseDate, lastUpdate, version, operatingSystem, size, tag } = req.body;

            // Validate required fields
            if (!categoryId || !subCategoryId || !name || !overview || !download || !releaseDate || !version || !size || !tag) {
                return this.handleError(next, 'All required fields (categoryId, subCategoryId, name, overview, download, releaseDate, lastUpdate, version, size, tag) must be provided', 400);
            }

            // Ensure `operatingSystem` and `tag` are arrays
            // if (!Array.isArray(operatingSystem)) {
            //     return this.handleError(next, 'Operating System must be an array', 400);
            // }
            if (!Array.isArray(tag)) {
                return this.handleError(next, 'Tag must be an array', 400);
            }

            let logo = '';
            if (req.files && req.files.length > 0) {
                for (const file of req.files) {
                    const fieldname = file.fieldname;
                    const fileName = file.originalname;
                    const filePath = this.createPath('software/' + fieldname + '/', fileName);
                    const attachedPath = this.attachPath(filePath);

                    // Validate file size (max 2MB)
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

                        // Assign logo path if the file is for the logo
                        if (fieldname === 'logo') {
                            logo = attachedPath;
                        }

                    } catch (uploadError) {
                        return this.handleError(next, 'An error occurred during logo upload', 500);
                    }
                }
            }

            // Create new software entry
            const newSoftware = await Software.create({
                categoryId,
                subCategoryId,
                adminId: _id,
                name,
                overview,
                logo,
                download,
                releaseDate,
                lastUpdate: lastUpdate || new Date(),
                version,
                operatingSystem,
                size,
                tag
            });

            return res.status(201).json({
                error: false,
                message: 'Software added successfully',
            });

        } catch (error) {
            return this.handleError(next, error.message || 'An unexpected error occurred', 500);
        }
    }

    async info(req, res, next) {
        try {
            const { id } = req.params;
            const software = await Software.findById(id)
                .populate('adminId', 'name')
                .populate('categoryId', 'name')
                .populate('subCategoryId', 'name');

            if (!software) {
                return this.handleError(next, 'Software not found', 404);
            }

            return res.status(200).json({
                error: false,
                software,
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
                return this.handleError(next, 'Software ID is required', 400);
            }

            const software = await Software.findById(id);
            if (!software) {
                return this.handleError(next, 'Software not found', 404);
            }

            // Prevent updating protected fields (e.g., `_id`, `adminId`)
            const protectedFields = ['_id', 'adminId'];
            protectedFields.forEach(field => delete updates[field]);

            // If updating logo, handle logo upload
            let logo = software.logo; // Preserve existing logo
            if (req.files && req.files.length > 0) {
                for (const file of req.files) {
                    const fieldname = file.fieldname;
                    const fileName = file.originalname;
                    const filePath = this.createPath('software/' + fieldname + '/', fileName);
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

            // Apply updates to the software document
            Object.assign(software, updates);
            software.logo = logo; // Update logo if changed

            await software.save();

            return res.status(200).json({
                error: false,
                message: 'Software updated successfully',
            });

        } catch (error) {
            return this.handleError(next, error.message || 'An unexpected error occurred', 500);
        }
    }

    async status(req, res, next) {
        try {
            const { id } = req.params;

            const filters = { isDeleted: false, _id: id };
            const software = await Software.findOne(filters);
            if (!software) {
                return this.handleError(next, 'Software not found', 404);
            }

            software.status = !software.status;

            await software.save();

            return res.status(200).json({
                error: false,
                message: `Software status updated successfully to ${software.status ? 'Active' : 'De-Active'}`,
            });

        } catch (error) {
            return this.handleError(next, error.message || 'An unexpected error occurred', 500);
        }
    }

    async delete(req, res, next) {
        try {

            const { id } = req.params;
            const software = await Software.findById(id);
            if (!software) {
                return this.handleError(next, 'Software not found', 404);
            }

            software.isDeleted = !software.isDeleted;
            await software.save();

            return res.status(200).json({
                error: false,
                message: `Software has been ${software.isDeleted ? 'deleted' : 'restored'} successfully`,
            });

        } catch (error) {
            return this.handleError(next, error.message || 'An unexpected error occurred', 500);
        }
    }

}

export default new SoftwareController();
