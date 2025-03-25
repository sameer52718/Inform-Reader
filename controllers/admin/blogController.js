import BaseController from '../BaseController.js';
import Blog from '../../models/Blog.js';

class BlogController extends BaseController {
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

            const blogs = await Blog.find(filters)
                .populate('adminId', 'name')
                .populate('categoryId', 'name')
                .populate('subCategoryId', 'name')
                .select('name image status createdAt')
                .skip(skip)
                .limit(limit);

            const totalBlogs = await Blog.countDocuments(filters);
            const totalPages = Math.ceil(totalBlogs / limit);

            return res.status(200).json({
                error: false,
                blogs,
                pagination: {
                    totalItems: totalBlogs,
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
            const { categoryId, subCategoryId, name, blog, shortDescription, writterName, tag } = req.body;

            // Validate required fields
            if (!categoryId || !subCategoryId || !name || !blog || !shortDescription || !writterName || !tag) {
                return this.handleError(next, 'All required fields (categoryId, subCategoryId, name, blog, shortDescription, writterName, tag) must be provided', 400);
            }

            if (!Array.isArray(tag)) {
                return this.handleError(next, 'Tag must be an array', 400);
            }

            let image = '';
            if (req.files && req.files.length > 0) {
                for (const file of req.files) {
                    const fieldname = file.fieldname;
                    const fileName = file.originalname;
                    const filePath = this.createPath('blog/' + fieldname + '/', fileName);
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

                        // Assign image path if the file is for the image
                        if (fieldname === 'image') {
                            image = attachedPath;
                        }

                    } catch (uploadError) {
                        return this.handleError(next, 'An error occurred during image upload', 500);
                    }
                }
            }

            // Create new blog entry
            const newBlog = await Blog.create({
                categoryId,
                subCategoryId,
                adminId: _id,
                name,
                blog,
                image,
                shortDescription,
                writterName,
                tag
            });

            return res.status(201).json({
                error: false,
                message: 'Blog added successfully',
            });

        } catch (error) {
            return this.handleError(next, error.message || 'An unexpected error occurred', 500);
        }
    }

    async info(req, res, next) {
        try {
            const { id } = req.params;
            const blog = await Blog.findById(id)
                .populate('adminId', 'name')
                .populate('categoryId', 'name')
                .populate('subCategoryId', 'name');

            if (!blog) {
                return this.handleError(next, 'Blog not found', 404);
            }

            return res.status(200).json({
                error: false,
                blog,
            });

        } catch (error) {
            return this.handleError(next, error.message || 'An unexpected error occurred', 500);
        }
    }

    async update(req, res, next) {
        try {
            const { id } = req.params;
            let updates = req.body;
    
            let blog = await Blog.findById(id);
            if (!blog) {
                return this.handleError(next, 'Blog not found', 404);
            }
    
            // Prevent updating protected fields
            const protectedFields = ['_id', 'adminId'];
            protectedFields.forEach(field => delete updates[field]);
    
            // Ensure tag and wishlist are arrays
            if (updates.tag && !Array.isArray(updates.tag)) {
                return this.handleError(next, 'Tag must be an array', 400);
            }
    
            // Preserve existing image unless a new one is uploaded
            let image = blog.image;
    
            if (req.files && req.files.length > 0) {
                for (const file of req.files) {
                    if (file.fieldname === 'image') {
                        const filePath = this.createPath('blog/image/', file.originalname);
                        const attachedPath = this.attachPath(filePath);
    
                        // Validate file size (Max: 2MB)
                        if (file.size > 2 * 1024 * 1024) {
                            return this.handleError(next, 'Image size exceeds 2MB limit', 400);
                        }
    
                        try {
                            const isUploaded = await this.uploadFile({
                                Key: filePath,
                                Body: file.buffer,
                                ContentType: file.mimetype,
                            });
    
                            if (!isUploaded) {
                                return this.handleError(next, 'Image upload failed', 400);
                            }
    
                            image = attachedPath; // Assign new image path
                        } catch (uploadError) {
                            return this.handleError(next, 'An error occurred during image upload', 500);
                        }
                    }
                }
            }
    
            // Merge updates & save
            updates.image = image;
            await Blog.findByIdAndUpdate(id, updates, { new: true });
    
            return res.status(200).json({
                error: false,
                message: 'Blog updated successfully',
            });
    
        } catch (error) {
            return this.handleError(next, error.message || 'An unexpected error occurred', 500);
        }
    }
    

    async status(req, res, next) {
        try {
            const { id } = req.params;

            const filters = { isDeleted: false, _id: id };
            const blog = await Blog.findOne(filters);
            if (!blog) {
                return this.handleError(next, 'Blog not found', 404);
            }

            blog.status = !blog.status;

            await blog.save();

            return res.status(200).json({
                error: false,
                message: `Blog status updated successfully to ${blog.status ? 'Active' : 'De-Active'}`,
            });

        } catch (error) {
            return this.handleError(next, error.message || 'An unexpected error occurred', 500);
        }
    }

    async delete(req, res, next) {
        try {

            const { id } = req.params;
            const blog = await Blog.findById(id);
            if (!blog) {
                return this.handleError(next, 'Blog not found', 404);
            }

            blog.isDeleted = !blog.isDeleted;
            await blog.save();

            return res.status(200).json({
                error: false,
                message: `Blog has been ${blog.isDeleted ? 'deleted' : 'restored'} successfully`,
            });

        } catch (error) {
            return this.handleError(next, error.message || 'An unexpected error occurred', 500);
        }
    }

}

export default new BlogController();
