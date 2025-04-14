import BaseController from '../BaseController.js';
import Specification from '../../models/Specification.js';

class SpecificationController extends BaseController {
    constructor() {
        super();
        this.get = this.get.bind(this);
        this.getAll = this.getAll.bind(this);
        this.detail = this.detail.bind(this);
    }

    async get(req, res, next) {
        try {
            // Step 1: Group specification by category and sort them by createdAt, then limit to 5 latest specification in each category
            const categories = await Specification.aggregate([
                {
                    $group: {
                        _id: "$category", // Group by category
                        specification: {
                            $push: "$$ROOT" // Push all data for each category into 'specification'
                        }
                    }
                },
                {
                    $project: {
                        _id: 0, // Don't include the _id field
                        category: "$_id", // Category name
                        specification: { $slice: ["$specification", 25] } // Limit to 25 latest specification in each category
                    }
                },
                { $sample: { size: 25 } }, // Randomly select 25 categories
                {
                    $project: {
                        category: 1, // Include the category field
                        specification: {
                            $map: {
                                input: "$specification",
                                as: "specification",
                                in: {
                                    _id: "$$specification._id", // Include brand
                                    brand: "$$specification.brand", // Include brand
                                    name: "$$specification.name", // Include name
                                    price: "$$specification.price", // Include price
                                    priceSymbal: "$$specification.priceSymbal", // Include price symbol
                                    image: "$$specification.image", // Include image
                                    category: "$$specification.category", // Include category
                                    // Include any other necessary fields
                                }
                            }
                        }
                    }
                }
            ]);

            // Step 2: Prepare response
            if (!categories || categories.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "No categories found",
                });
            }

            // Send the response with the random 5 categories and their latest 5 specification
            res.status(200).json({
                error: false,
                data: categories
            });

        } catch (error) {
            return this.handleError(next, error.message, 500);
        }
    }

    async getAll(req, res, next) {
        try {
            const { category } = req.params;
            const { page = 1, limit = 10, sortBy } = req.query;  // Default page to 1 and limit to 10
            const skip = (page - 1) * limit;  // Calculate the skip value based on the current page

            // Validate input fields
            if (!category) {
                return this.handleError(next, 'Category is required', 400);
            }

            // Build the query object for the specified category
            const query = { category };

            // Prepare sorting object based on sortBy query parameter
            let aggregationPipeline = [
                { $match: query },  // Filter by category
                { $skip: skip },     // Skip for pagination
                { $limit: parseInt(limit) }  // Limit results
            ];

            if (sortBy === 'highToLowPrice') {
                aggregationPipeline.push({ $sort: { price: -1 } });  // Sort by price descending
            } else if (sortBy === 'LowToHighPrice') {
                aggregationPipeline.push({ $sort: { price: 1 } });   // Sort by price ascending
            } else if (sortBy === 'name') {
                aggregationPipeline.push({ $sort: { name: 1 } });    // Sort by name ascending
            } else if (sortBy === 'latest') {
                aggregationPipeline.push({ $sort: { createdAt: -1 } });  // Sort by creation date descending
            } else {
                // Random sort
                aggregationPipeline.push({ $sample: { size: parseInt(limit) } });  // Random sample
            }

            // Use the aggregation pipeline to fetch data with sorting and pagination
            const specification = await Specification.aggregate(aggregationPipeline);

            // Count the total number of specification in the specified category to calculate the total pages
            const totalspecification = await Specification.countDocuments(query);

            // Calculate total pages based on the total specification and limit
            const totalPages = Math.ceil(totalspecification / limit);

            // Return paginated data with pagination metadata
            res.status(200).json({
                error: false,
                specification,
                pagination: {
                    totalItems: totalspecification,
                    currentPage: parseInt(page),
                    totalPages,
                    pageSize: parseInt(limit),
                },
            });
        } catch (error) {
            return this.handleError(next, error.message, 500);
        }
    }

    async detail(req, res, next) {
        try {
            const { category, id } = req.params;

            // Validate input fields
            if (!category || !id) {
                return this.handleError(next, 'Category and ID are required', 400);
            }

            // Fetch the specification by category and id
            const specification = await Specification.findOne({ _id: id, category });

            // If the specification is not found, return a 404 error
            if (!specification) {
                return this.handleError(next, 'specification not found', 404);
            }

            // Return the specification details
            res.status(200).json({
                error: false,
                specification,
            });

        } catch (error) {
            return this.handleError(next, error.message, 500);
        }
    }

}

export default new SpecificationController();
