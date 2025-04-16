import BaseController from '../BaseController.js';
import User from '../../models/User.js';
import bcrypt from 'bcrypt';

class AuthController extends BaseController {
    constructor() {
        super();
        this.insert = this.insert.bind(this);
        this.get = this.get.bind(this);
        this.status = this.status.bind(this);
        this.delete = this.delete.bind(this);
    }

    async insert(req, res, next) {
        try {
            // Extract data from request body
            const { name, email, password, phone } = req.body;

            // Validate input
            if (!email || !password || !phone || !name) {
                return this.handleError(next, 'Email, Phone, Name or Password is required', 400);
            }

            // Check if the email or phone already exists in the database
            const existingUser = await User.findOne({ email });

            if (existingUser) {
                return this.handleError(next, 'Email already in use', 400);
            }

            // Create a new user object
            const newUser = new User({
                name,
                email,
                password,
                phone,
                role: 'ADMIN',
            });

            // Save the user to the database
            await newUser.save();

            // Respond with success message
            return res.status(201).json({
                error: false,
                message: 'Account Created Successfully',
            });

        } catch (error) {
            // Handle errors gracefully
            return this.handleError(next, error.message || 'An unexpected error occurred');
        }
    }

    async get(req, res, next) {
        try {
            let { page = 1, limit = 10 } = req.query;

            page = parseInt(page);
            limit = parseInt(limit);
            const skip = (page - 1) * limit;

            const { _id } = req.user;

            // Retrieve users excluding the current user and filter by role 'ADMIN'
            const users = await User.find({ _id: { $ne: _id }, role: 'ADMIN' })
                .select('name email phone profile status createdAt')
                .skip(skip)
                .limit(limit);

            // Count total users for pagination calculation
            const totalUsers = await User.countDocuments({ _id: { $ne: _id }, role: 'ADMIN' });
            const totalPages = Math.ceil(totalUsers / limit);

            return res.status(200).json({
                error: false,
                message: 'Users retrieved successfully',
                data: users,
                pagination: {
                    totalItems: totalUsers,
                    currentPage: page,
                    totalPages,
                    pageSize: limit,
                },
            });

        } catch (error) {
            return this.handleError(next, error.message || 'An unexpected error occurred');
        }
    }


    async status(req, res, next) {
        try {
            const { id } = req.params;

            // Find user by ID
            const user = await User.findOne({ _id: id, role: 'ADMIN' });

            if (!user) {
                return this.handleError(next, 'User not found', 404);
            }

            // Toggle the status
            user.status = !user.status;

            // Save the updated user
            await user.save();

            return res.status(200).json({
                error: false,
                message: `User status updated successfully`,
            });

        } catch (error) {
            return this.handleError(next, error.message || 'An unexpected error occurred');
        }
    }

    async delete(req, res, next) {
        try {
            const { id } = req.params;

            // Find user by ID
            const admin = await User.findById(id);

            if (!admin) {
                return this.handleError(next, 'Admin not found', 404);
            }

            // Delete the admin from the database
            await User.deleteOne({ _id: id });

            return res.status(200).json({
                error: false,
                message: 'Admin account deleted successfully.',
            });

        } catch (error) {
            return this.handleError(next, error.message || 'An unexpected error occurred');
        }
    }


}

export default new AuthController();
