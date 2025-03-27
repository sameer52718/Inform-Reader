import BaseController from '../BaseController.js';
import RealState from '../../models/RealState.js';

class RealStateController extends BaseController {
    constructor() {
        super();
        this.get = this.get.bind(this);
        this.insert = this.insert.bind(this);
        this.info = this.info.bind(this);
        this.update = this.update.bind(this);
        this.status = this.status.bind(this);
        this.delete = this.delete.bind(this);
        this.deleteImage = this.deleteImage.bind(this);
        
    }

    async get(req, res, next) {
        try {

            let { page = 1, limit = 10, isDeleted } = req.query;
            page = parseInt(page);
            limit = parseInt(limit);
            const skip = (page - 1) * limit;

            const filters = { isDeleted: false };
            if (isDeleted) filters.isDeleted = true;

            const RealStates = await RealState.find(filters)
                .populate('adminId', 'name')
                .populate('categoryId', 'name')
                .populate('subCategoryId', 'name')
                .populate('countryId', 'name')
                .select('name type status createdAt')
                .skip(skip)
                .limit(limit);

            const totalRealStates = await RealState.countDocuments(filters);
            const totalPages = Math.ceil(totalRealStates / limit);

            return res.status(200).json({
                error: false,
                RealStates,
                pagination: {
                    totalItems: totalRealStates,
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
                categoryId, subCategoryId, countryId,
                name, type, description, shortDescription, area, bedroom, bathroom,
                contactNumber, website, tags, lat, lng
            } = req.body;

            // Convert lat/lng to numbers
            const location = (lat && lng) ? { lat: parseFloat(lat), lng: parseFloat(lng) } : undefined;

            // Required fields check
            const requiredFields = { categoryId, subCategoryId, countryId, name, type, description, shortDescription };
            const missingFields = Object.entries(requiredFields).filter(([_, value]) => !value).map(([key]) => key);

            if (missingFields.length) {
                return this.handleError(next, `Missing required fields: ${missingFields.join(', ')}`, 400);
            }

            // Handle image uploads
            let image = '';
            let imagesArray = [];

            if (req.files && req.files.length > 0) {
                for (const file of req.files) {
                    const fieldname = file.fieldname;
                    const fileName = file.originalname;
                    const filePath = this.createPath('realstate/' + fieldname + '/', fileName);
                    const attachedPath = this.attachPath(filePath);

                    // Check file size (2MB max)
                    const maxSize = 2 * 1024 * 1024;
                    if (file.size > maxSize) {
                        return this.handleError(next, `${fieldname} size exceeds 2MB limit`, 400);
                    }

                    // Validate file type (JPEG, PNG)
                    const allowedTypes = ['image/jpeg', 'image/png'];
                    if (!allowedTypes.includes(file.mimetype)) {
                        return this.handleError(next, `Invalid file type for ${fieldname}. Allowed: JPEG, PNG`, 400);
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

                        // Assign uploaded file paths
                        if (fieldname === 'image') image = attachedPath;
                        if (fieldname === 'images') imagesArray.push(attachedPath);
                    } catch (uploadError) {
                        return this.handleError(next, 'An error occurred during image upload', 500);
                    }
                }
            }

            // Create RealState entry
            await RealState.create({
                adminId: _id,
                categoryId,
                subCategoryId,
                countryId,
                location,
                name,
                type,
                description,
                shortDescription,
                area,
                bedroom,
                bathroom,
                contactNumber,
                website,
                tags,
                image,
                images: imagesArray
            });

            return res.status(201).json({
                error: false,
                message: 'RealState added successfully!',
            });

        } catch (error) {
            return this.handleError(next, error.message || 'An unexpected error occurred', 500);
        }
    }

    async info(req, res, next) {
        try {
            const { id } = req.params;
            const realState = await RealState.findById(id)
                .populate('adminId', 'name')
                .populate('categoryId', 'name')
                .populate('subCategoryId', 'name')
                .populate('countryId', 'name');

            if (!realState) {
                return this.handleError(next, 'RealState not found', 404);
            }

            return res.status(200).json({
                error: false,
                realState,
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
                return this.handleError(next, 'RealState ID is required', 400);
            }

            // Validate required fields in the request body
            const requiredFields = ['categoryId', 'subCategoryId', 'countryId', 'name', 'type', 'description', 'shortDescription'];
            const missingFields = requiredFields.filter(field => !updates[field]);

            if (missingFields.length) {
                return this.handleError(next, `Missing required fields: ${missingFields.join(', ')}`, 400);
            }

            // Prevent updating protected fields
            const protectedFields = ['_id', 'adminId', 'createdAt', 'updatedAt'];
            protectedFields.forEach(field => delete updates[field]);

            // Find and update the RealState entry
            let realState = await RealState.findById(id);
            if (!realState) {
                return this.handleError(next, 'RealState not found', 404);
            }

            // Update fields with new values
            Object.assign(realState, updates);

            // Handle image uploads
            if (req.files && req.files.length > 0) {
                for (const file of req.files) {
                    const fieldname = file.fieldname;
                    const fileName = file.originalname;
                    const filePath = this.createPath(`realstate/${fieldname}/`, fileName);
                    const attachedPath = this.attachPath(filePath);

                    // Check file size (max 2MB)
                    const maxSize = 2 * 1024 * 1024;
                    if (file.size > maxSize) {
                        return this.handleError(next, `${fieldname} size exceeds 2MB limit`, 400);
                    }

                    // Validate file type (JPEG, PNG)
                    const allowedTypes = ['image/jpeg', 'image/png'];
                    if (!allowedTypes.includes(file.mimetype)) {
                        return this.handleError(next, `Invalid file type for ${fieldname}. Allowed: JPEG, PNG`, 400);
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

                        // Assign uploaded file paths correctly
                        if (fieldname === 'image') {
                            realState.image = attachedPath;
                        } else if (fieldname === 'images') {
                            realState.images.push(attachedPath);
                        }
                    } catch (uploadError) {
                        return this.handleError(next, 'An error occurred during image upload', 500);
                    }
                }
            }

            // Save updated RealState entry
            await realState.save();

            return res.status(200).json({
                error: false,
                message: 'RealState updated successfully',
            });

        } catch (error) {
            return this.handleError(next, error.message || 'An unexpected error occurred', 500);
        }
    }

    async status(req, res, next) {
        try {
            const { id } = req.params;

            const filters = { isDeleted: false, _id: id };
            const realState = await RealState.findOne(filters);
            if (!realState) {
                return this.handleError(next, 'RealState not found', 404);
            }

            realState.status = !realState.status;

            await realState.save();

            return res.status(200).json({
                error: false,
                message: `RealState status updated successfully to ${realState.status ? 'Active' : 'De-Active'}`,
            });

        } catch (error) {
            return this.handleError(next, error.message || 'An unexpected error occurred', 500);
        }
    }

    async delete(req, res, next) {
        try {

            const { id } = req.params;
            const realState = await RealState.findById(id);
            if (!realState) {
                return this.handleError(next, 'RealState not found', 404);
            }

            realState.isDeleted = !realState.isDeleted;
            await realState.save();

            return res.status(200).json({
                error: false,
                message: `RealState has been ${realState.isDeleted ? 'deleted' : 'restored'} successfully`,
            });

        } catch (error) {
            return this.handleError(next, error.message || 'An unexpected error occurred', 500);
        }
    }

    async deleteImage(req, res, next) {
        try {
            const { id } = req.params;
            const { imagePath } = req.body;
    
            if (!id) {
                return this.handleError(next, 'RealState ID is required', 400);
            }
            if (!imagePath) {
                return this.handleError(next, 'Image path is required', 400);
            }
    
            // Find the RealState entry
            let realState = await RealState.findById(id);
            if (!realState) {
                return this.handleError(next, 'RealState not found', 404);
            }
    
            // Check if image exists in the images array
            const imageIndex = realState.images.indexOf(imagePath);
            if (imageIndex === -1) {
                return this.handleError(next, 'Image not found in RealState', 404);
            }
    
            // Remove image from the images array
            realState.images.splice(imageIndex, 1);
    
            // Save the updated RealState entry
            await realState.save();
    
            return res.status(200).json({
                error: false,
                message: 'Image deleted successfully',
            });
    
        } catch (error) {
            return this.handleError(next, error.message || 'An unexpected error occurred', 500);
        }
    }
    

}

export default new RealStateController();
