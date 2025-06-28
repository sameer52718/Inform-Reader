import BaseController from '../BaseController.js';
import Blog from '../../models/Blog.js';
import mongoose from 'mongoose';

class BlogController extends BaseController {
  constructor() {
    super();
    this.get = this.get.bind(this);
    this.detail = this.detail.bind(this);
  }

  async get(req, res, next) {
    try {
      // Extract query parameters
      const { isDeleted, status, adminId, categoryId, subCategoryId, name, tag, page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

      // Build filters object
      const filters = {};

      // Filter by isDeleted (boolean)
      if (isDeleted !== undefined) {
        filters.isDeleted = isDeleted === 'true';
      } else {
        // Default to non-deleted blogs
        filters.isDeleted = false;
      }

      // Filter by status (boolean)
      if (status !== undefined) {
        filters.status = status === 'true';
      }

      // Filter by adminId (ObjectId)
      if (adminId) {
        filters.adminId = adminId;
      }

      // Filter by categoryId (ObjectId)
      if (categoryId) {
        filters.categoryId = categoryId;
      }

      // Filter by subCategoryId (ObjectId)
      if (subCategoryId) {
        filters.subCategoryId = subCategoryId;
      }

      // Filter by name (case-insensitive partial match)
      if (name) {
        filters.name = { $regex: name, $options: 'i' };
      }

      // Filter by tags (array contains any of the provided tags)
      if (tag) {
        const tagsArray = Array.isArray(tag) ? tag : tag.split(',');
        filters.tag = { $in: tagsArray };
      }

      // Pagination
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      // Sorting
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

      // Query the database
      const totalBlogs = await Blog.countDocuments(filters);
      const totalPages = Math.ceil(totalBlogs / limitNum);

      const blogs = await Blog.find(filters)
        .populate('adminId', 'name email profile')
        .populate('categoryId', 'name')
        .populate('subCategoryId', 'name')
        .sort(sort)
        .skip(skip)
        .limit(limitNum);

      // Return response
      return res.status(200).json({
        error: false,
        blogs,
        pagination: {
          totalItems: totalBlogs,
          currentPage: pageNum,
          totalPages,
          pageSize: limitNum,
        },
      });
    } catch (error) {
      return this.handleError(next, error.message || 'An unexpected error occurred', 500);
    }
  }

  async detail(req, res, next) {
    try {
      let { isDeleted } = req.query;
      let { slug } = req.params;

      const filters = { isDeleted: false, slug };
      if (isDeleted) filters.isDeleted = true;

      const blog = await Blog.findOne(filters)
        .populate('categoryId', 'name')
        .populate('subCategoryId', 'name')
        .populate('adminId', 'name profile')
        .select('name blog image shortDescription writterName tag wishList createdAt');

      if (!blog) {
        return this.handleError(next, 'Blog not found', 404);
      }

      const related = await Blog.find({ status: true, isDeleted: false, categoryId: blog.categoryId._id, _id: { $ne: blog._id } })
        .populate('adminId', 'name email profile')
        .populate('categoryId', 'name')
        .populate('subCategoryId', 'name')
        .sort({ createdAt: -1 })
        .limit(10);

      return res.status(200).json({
        error: false,
        blog,
        related,
      });
    } catch (error) {
      return this.handleError(next, error.message || 'An unexpected error occurred', 500);
    }
  }
}

export default new BlogController();
