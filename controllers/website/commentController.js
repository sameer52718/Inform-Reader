import BaseController from '../BaseController.js';
import Blog from '../../models/Blog.js';
import Comment from '../../models/Comment.js';

class CommentController extends BaseController {
  constructor() {
    super();
    this.getComments = this.getComments.bind(this);
    this.createComment = this.createComment.bind(this);
  }

  async getComments(req, res, next) {
    try {
      const { slug } = req.params;
      const { isDeleted, status } = req.query;

      // Find blog by slug
      const blog = await Blog.findOne({ slug, isDeleted: false });
      if (!blog) {
        return res.status(404).json({
          error: true,
          message: 'Blog not found.',
        });
      }

      // Build filters
      const filters = { blogId: blog._id };
      if (isDeleted !== undefined) {
        filters.isDeleted = isDeleted === 'true';
      } else {
        filters.isDeleted = false;
      }
      if (status !== undefined) {
        filters.status = status === 'true';
      }

      const comments = await Comment.find(filters)
        .populate('author', 'name')
        .sort({ createdAt: -1 });

      return res.status(200).json({
        error: false,
        comments,
      });
    } catch (error) {
      return this.handleError(next, error.message || 'An unexpected error occurred', 500);
    }
  }

  async createComment(req, res, next) {
    try {
      const { slug } = req.params;
      const { content } = req.body;
      const userId = req.user?._id; // Assumes user is authenticated

      if (!userId) {
        return res.status(401).json({
          error: true,
          message: 'Unauthorized. Please log in.',
        });
      }

      if (!content || !content.trim()) {
        return res.status(400).json({
          error: true,
          message: 'Comment content is required.',
        });
      }

      // Find blog by slug
      const blog = await Blog.findOne({ slug, isDeleted: false });
      if (!blog) {
        return res.status(404).json({
          error: true,
          message: 'Blog not found.',
        });
      }

      const comment = new Comment({
        blogId: blog._id,
        author: userId,
        content: content.trim(),
      });

      await comment.save();

      // Populate author for response
      const populatedComment = await Comment.findById(comment._id).populate('author', 'name');

      return res.status(201).json({
        error: false,
        comment: populatedComment,
      });
    } catch (error) {
      return this.handleError(next, error.message || 'An unexpected error occurred', 500);
    }
  }
}

export default new CommentController();