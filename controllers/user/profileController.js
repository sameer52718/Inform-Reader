import BaseController from '../BaseController.js';
import User from '../../models/User.js';
import bcrypt from 'bcrypt';

class ProfileController extends BaseController {
  constructor() {
    super();
    this.update = this.update.bind(this);
    this.changePassword = this.changePassword.bind(this);
  }
  async update(req, res, next) {
    try {
      const { _id } = req.user;
      const { name, phone } = req.body;

      // Validate input fields
      if (!this.validateFields(req.body, ['name', 'phone'])) {
        return this.handleError(next, 'All fields (name, phone) are required', 400);
      }

      // Find the user by ID
      const admin = await User.findOne({ _id, role: 'USER' });
      if (!admin) {
        return this.handleError(next, 'Admin not found', 404);
      }

      // Update admin details
      Object.assign(admin, { name, phone });
      await admin.save();

      // Respond with success
      return res.status(200).json({
        error: false,
        message: 'Profile saved successfully',
      });

    } catch (error) {
      // Centralized error handling
      return this.handleError(next, error.message || 'An unexpected error occurred', 500);
    }
  }

  async changePassword(req, res, next) {
    try {
      const { password, newPassword } = req.body;
      const { _id } = req.user;

      if (!password || !newPassword) {
        return this.handleError(next, 'Both password and newPassword are required.', 400);
      }

      const admin = await User.findOne({ _id, role: 'USER' });
      if (!admin) {
        return this.handleError(next, 'Admin not found.', 404);
      }

      const isMatch = await bcrypt.compare(password, admin.password);
      if (!isMatch) {
        return this.handleError(next, 'Current password is invalid.', 400);
      }

      admin.password = newPassword;
      await admin.save();

      // Return success message
      return res.status(200).json({ error: false, message: 'Password changed successfully.' });
    } catch (error) {
      return this.handleError(next, error.message || 'An unexpected error occurred.', 500);
    }
  }

}

export default new ProfileController();
