import BaseController from '../BaseController.js';
import Blog from '../../models/Blog.js';
import mongoose from "mongoose";

class BlogController extends BaseController {
    constructor() {
        super();
        this.get = this.get.bind(this);
        this.filterByCategory = this.filterByCategory.bind(this);
        this.detail = this.detail.bind(this);
    }

    async get(req, res, next) {
        try {
            let { isDeleted } = req.query;

            const filters = { isDeleted: false };
            if (isDeleted) filters.isDeleted = true;

            // Get latest 5 blogs grouped by categoryId with category name
            const blogs = await Blog.aggregate([
                { $match: filters },
                { $sort: { createdAt: -1 } },
                {
                    $lookup: {
                        from: "categories", // Ensure this matches the Category collection name
                        localField: "categoryId",
                        foreignField: "_id",
                        as: "category"
                    }
                },
                { $unwind: "$category" },
                {
                    $group: {
                        _id: "$categoryId",
                        categoryName: { $first: "$category.name" },
                        blogs: { $push: { name: "$name", image: "$image", shortDescription: "$shortDescription", writterName: "$writterName" } }
                    }
                },
                { $project: { _id: 1, categoryName: 1, blogs: { $slice: ["$blogs", 5] } } }
            ]);

            // Get 5 random blogs
            const randomBlogs = await Blog.aggregate([
                { $match: filters },
                { $sample: { size: 5 } },
                { $project: { name: 1, image: 1, shortDescription: 1, writterName: 1 } }
            ]);

            return res.status(200).json({
                error: false,
                blogs,
                randomBlogs
            });

        } catch (error) {
            return this.handleError(next, error.message || "An unexpected error occurred", 500);
        }

    }
    async filterByCategory(req, res, next) {
        try {
            let { isDeleted } = req.query;
            let { categoryId } = req.params;


            const filters = { isDeleted: false, categoryId: new mongoose.Types.ObjectId(categoryId) };
            if (isDeleted) filters.isDeleted = true;

            // Get all blogs of the given categoryId
            const blogs = await Blog.aggregate([
                { $match: filters },
                {
                    $lookup: {
                        from: "categories", // Ensure this matches the Category collection name
                        localField: "categoryId",
                        foreignField: "_id",
                        as: "category"
                    }
                },
                { $unwind: "$category" },
                {
                    $project: {
                        _id: 1,
                        categoryId: 1,
                        categoryName: "$category.name",
                        name: 1,
                        image: 1,
                        shortDescription: 1,
                        writterName: 1
                    }
                }
            ]);

            return res.status(200).json({
                error: false,
                blogs
            });

        } catch (error) {
            return this.handleError(next, error.message || "An unexpected error occurred", 500);
        }

    }

    async detail(req, res, next) {
        try {
            let { isDeleted } = req.query;
            let { categoryId } = req.params;
            let { blogId } = req.params;
        
            const filters = { isDeleted: false, categoryId: new mongoose.Types.ObjectId(categoryId), _id: new mongoose.Types.ObjectId(blogId) };
            if (isDeleted) filters.isDeleted = true;
        
            const blog = await Blog.findOne(filters)
                            .populate('categoryId', 'name')
                            .populate('subCategoryId', 'name')
                            .select('name blog image shortDescription writterName tag wishList createdAt');
            
            if (!blog) {
                return this.handleError(next, 'Blog not found', 404);
            }
        
            return res.status(200).json({
                error: false,
                blog
            });
        
        } catch (error) {
            return this.handleError(next, error.message || "An unexpected error occurred", 500);
        }

    }

}

export default new BlogController();
