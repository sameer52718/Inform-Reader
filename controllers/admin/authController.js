import BaseController from '../BaseController.js';
import User from '../../models/User.js';
import bcrypt from 'bcrypt';

class AuthController extends BaseController {
    constructor() {
        super();
        this.signin = this.signin.bind(this);
        this.forgot = this.forgot.bind(this);
        this.changePassword = this.changePassword.bind(this);
    }

    async ensureAdminExists() {
        const adminExists = await User.findOne({ role: 'ADMIN' });

        if (!adminExists) {
            const defaultAdmin = new User({
                name: 'Default Admin',
                email: 'sameer@thebytepulse.com',
                password: 'Admin@123', // Hash password
                role: 'ADMIN',
                status: true,
                verified: true
            });

            await defaultAdmin.save();
            console.log('Default Admin Created: admin@example.com / Admin@123');
        }
    }

    async signin(req, res, next) {
        try {
            // Ensure an admin exists before login
            await this.ensureAdminExists();

            const { email, password, rememberMe } = req.body;

            if (!email || !password) {
                return this.handleError(next, 'Email Or Password is required', 400);
            }

            const admin = await User.findOne({ email, role: 'ADMIN' });

            if (!admin) {
                return this.handleError(next, 'Invalid email.', 400);
            }

            const isMatch = await bcrypt.compare(password, admin.password);

            if (!isMatch) {
                return this.handleError(next, 'Invalid password.', 400);
            }

            if (!admin.status) {
                return this.handleError(next, 'Account is deactivated.', 400);
            }

            let authorization;

            if (rememberMe) {
                authorization = this.generateToken(admin._id, this.userTypes.admin, '365d');
            } else {
                authorization = this.generateToken(admin._id, this.userTypes.admin, '1d');
            }

            return res.status(200).json({
                error: false,
                message: 'Login Successful',
                token: authorization,
                verified: admin.verified,
                admin: {
                    _id: admin._id,
                    name: admin.name,
                    email: admin.email,
                    profile: admin.profile,
                }
            });

        } catch (error) {
            return this.handleError(next, error.message || 'An unexpected error occurred');
        }
    }

    async forgot(req, res, next) {
        try {
            const { email } = req.body;

            // Validate input
            if (!email) {
                return this.handleError(next, 'Email is required', 400);
            }

            const admin = await User.findOne({ email, role: 'ADMIN' });

            if (!admin) {
                return res.status(200).json({ error: true, message: 'Account Not Found.' });
            }

            const otp = this.generateOtp();

            const authorization = this.generateToken(admin._id, this.userTypes.admin, '5m');

            admin.otp = otp;
            await admin.save();

            await this.sendOtpMail(admin.email, otp, 'Otp For Verification');

            return res.status(200).json({
                error: false,
                message: 'Account Found',
                token: authorization,
                otp
            });

        } catch (error) {
            // Handle any unexpected errors
            return this.handleError(next, error.message || 'An unexpected error occurred');
        }
    }


    async changePassword(req, res, next) {
        try {
            const { password } = req.body;
            const { _id } = req.user;

            // Validate if password is provided
            if (!password) {
                return this.handleError(next, 'Password is required.', 400);
            }

            const admin = await User.findOne({ _id, role: 'ADMIN' });
            if (!admin) {
                return this.handleError(next, 'Admin not found.', 404);
            }

            admin.password = password;
            await admin.save();

            return res.status(200).json({ error: false, message: 'Password changed successfully.' });
        } catch (error) {
            // Handle unexpected errors
            return this.handleError(next, error.message || 'An unexpected error occurred.');
        }
    }


}

export default new AuthController();
