import BaseController from '../BaseController.js';
import Biography from '../../models/Biography.js';

class BiographyController extends BaseController {
    constructor() {
        super();
        this.get = this.get.bind(this);
        this.insert = this.insert.bind(this);
        this.general = this.general.bind(this);
        this.info = this.info.bind(this);
        this.update = this.update.bind(this);
        this.status = this.status.bind(this);
        this.delete = this.delete.bind(this);
        this.deleteGeneralInfo = this.deleteGeneralInfo.bind(this);
    }

    async get(req, res, next) {
        try {

            let { page = 1, limit = 10, isDeleted } = req.query;
            page = parseInt(page);
            limit = parseInt(limit);
            const skip = (page - 1) * limit;

            const filters = { isDeleted: false };
            if (isDeleted) filters.isDeleted = true;

            const biographies = await Biography.find(filters)
                .populate('adminId', 'name')
                .populate('nationalityId', 'name')
                .populate('categoryId', 'name')
                .select('name image status createdAt')
                .skip(skip)
                .limit(limit);

            const totalBiographies = await Biography.countDocuments(filters);
            const totalPages = Math.ceil(totalBiographies / limit);

            return res.status(200).json({
                error: false,
                biographies,
                pagination: {
                    totalItems: totalBiographies,
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
            const { nationalityId, name, categoryId } = req.body;

            if (!nationalityId || !name || !categoryId) {
                return this.handleError(next, 'All required fields (nationalityId, categoryId, name) must be provided', 400);
            }

            // Handle image and banner picture upload if a file is provided
            let image = '';

            if (req.files && req.files.length > 0) {
                for (const file of req.files) {
                    const fieldname = file.fieldname;
                    const fileName = file.originalname;
                    const filePath = this.createPath('biography/' + fieldname + '/', fileName);
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

            const newBiography = await Biography.create({
                nationalityId,
                categoryId,
                adminId: _id,
                name,
                image,
            });

            return res.status(201).json({
                error: false,
                message: 'Biography added successfully',
            });

        } catch (error) {
            return this.handleError(next, error.message || 'An unexpected error occurred', 500);
        }
    }

    async general(req, res, next) {
        try {
            const { biographyId, general } = req.body;
    
            if (!biographyId || !Array.isArray(general)) {
                return this.handleError(next, 'biographyId and a valid general array are required', 400);
            }
    
            // Find the biography document and update it
            const updatedBiography = await Biography.findByIdAndUpdate(
                biographyId,
                { $set: { generalInformation: general } }, // Replace the entire array
                { new: true } // Return the updated document
            );
    
            if (!updatedBiography) {
                return this.handleError(next, 'Biography not found', 404);
            }
    
            return res.status(200).json({
                error: false,
                message: 'Biography General Information updated successfully',
            });
    
        } catch (error) {
            return this.handleError(next, error.message || 'An unexpected error occurred', 500);
        }
    }
    
    async info(req, res, next) {
        try {
            const { id } = req.params;
            const biography = await Biography.findById(id)
                .populate('adminId', 'name')
                .populate('nationalityId', 'name')
                .populate('categoryId', 'name');

            if (!biography) {
                return this.handleError(next, 'Biography not found', 404);
            }

            return res.status(200).json({
                error: false,
                biography,
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
                return this.handleError(next, 'Biography ID is required', 400);
            }

            const biography = await Biography.findById(id);
            if (!biography) {
                return this.handleError(next, 'Biography not found', 404);
            }

            // Prevent updating protected fields (e.g., `_id`, `adminId`)
            const protectedFields = ['_id', 'adminId'];
            protectedFields.forEach(field => delete updates[field]);

            // If updating image, handle image upload
            let image = biography.image; // Preserve existing image
            if (req.files && req.files.length > 0) {
                for (const file of req.files) {
                    const fieldname = file.fieldname;
                    const fileName = file.originalname;
                    const filePath = this.createPath('biography/' + fieldname + '/', fileName);
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

            // Apply updates to the biography document
            Object.assign(biography, updates);
            biography.image = image; // Update image if changed

            await biography.save();

            return res.status(200).json({
                error: false,
                message: 'Biography updated successfully',
            });

        } catch (error) {
            return this.handleError(next, error.message || 'An unexpected error occurred', 500);
        }
    }

    async status(req, res, next) {
        try {
            const { id } = req.params;

            const filters = { isDeleted: false, _id: id };
            const biography = await Biography.findOne(filters);
            if (!biography) {
                return this.handleError(next, 'Biography not found', 404);
            }

            biography.status = !biography.status;

            await biography.save();

            return res.status(200).json({
                error: false,
                message: `Biography status updated successfully to ${biography.status ? 'Active' : 'De-Active'}`,
            });

        } catch (error) {
            return this.handleError(next, error.message || 'An unexpected error occurred', 500);
        }
    }

    async delete(req, res, next) {
        try {

            const { id } = req.params;
            const biography = await Biography.findById(id);
            if (!biography) {
                return this.handleError(next, 'Biography not found', 404);
            }

            biography.isDeleted = !biography.isDeleted;
            await biography.save();

            return res.status(200).json({
                error: false,
                message: `Biography has been ${biography.isDeleted ? 'deleted' : 'restored'} successfully`,
            });

        } catch (error) {
            return this.handleError(next, error.message || 'An unexpected error occurred', 500);
        }
    }

    async deleteGeneralInfo(req, res, next) {
        try {
            const { id } = req.params;
            const { generalInfoId } = req.body;
    
            if (!generalInfoId) {
                return this.handleError(next, 'generalInfoId are required', 400);
            }
    
            // Find the biography and update by removing the specific general info entry
            const updatedBiography = await Biography.findByIdAndUpdate(
                id,
                { $pull: { generalInformation: { _id: generalInfoId } } }, // Removes the matching general info entry
                { new: true } // Returns the updated document
            );
    
            if (!updatedBiography) {
                return this.handleError(next, 'Biography not found', 404);
            }
    
            return res.status(200).json({
                error: false,
                message: 'General information entry deleted successfully',
                biography: updatedBiography
            });
    
        } catch (error) {
            return this.handleError(next, error.message || 'An unexpected error occurred', 500);
        }
    }
    

}

export default new BiographyController();
