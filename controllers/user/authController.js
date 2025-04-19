import BaseController from '../BaseController.js';
import User from '../../models/User.js';
import bcrypt from 'bcrypt';

class AuthController extends BaseController {
  constructor() {
    super();
    this.signup = this.signup.bind(this);
    this.verify = this.verify.bind(this);
    this.resend = this.resend.bind(this);
    this.signin = this.signin.bind(this);
    this.forgot = this.forgot.bind(this);
    this.changePassword = this.changePassword.bind(this);
  }

  async signup(req, res, next) {
    try {
      const { name, email, phone, password } = req.body;

      // Validate required fields
      if (!email || !name || !password || !phone) {
        return res.status(400).json({ error: true, message: 'Email, Name, Password And Phone are required.' });
      }

      // Check if the email already exists and is verified
      const existingUser = await User.findOne({ email, verified: true });
      if (existingUser) {
        return res.status(409).json({ error: true, message: 'Email is already in use.' });
      }

      // Delete any unverified users with the same email
      await User.deleteMany({ email, verified: false });

      // Generate OTP
      const otp = this.generateOtp();

      // Prepare userDetails object
      const userDetails = {
        email,
        otp,
        name,
        password,
        phone,
        verified:true
      };

      // Create new user entry
      const newUser = await User.create(userDetails);

      // Generate token for the new user
      const token = this.generateToken(newUser._id, this.userTypes.user, '5m');

      // Send OTP verification email
      // await this.sendOtpMail(email, otp, 'Verify Your Account');

      return res.json({
        error: false,
        token
      });

    } catch (error) {
      // Centralized error handling
      return this.handleError(next, error.message || error);
    }
  }

  async verify(req, res, next) {
    try {
      const { _id } = req.user;
      const { otp } = req.body;

      // Validate required fields
      if (!otp) {
        return res.status(400).json({ error: true, message: 'otp are required.' });
      }

      // Find the user by _id and check if they have the role of 'USER'
      const user = await User.findOne({ _id, role: 'USER', otp: otp });

      // If the user is not found, return an error
      if (!user) {
        return res.status(404).json({ error: true, message: 'Invalid Otp' });
      }

      // If the user is already verified, return a message
      if (user.verified) {
        return res.status(401).json({ error: true, message: 'User already verified' });
      }

      // Update the user to mark them as verified and reset OTP
      user.verified = true;
      user.otp = 0;
      await user.save();

      // Generate a new token using the user's _id
      const newToken = this.generateToken(user._id, this.userTypes.user, '365d');

      // Return the response with user data and new token
      return res.status(200).json({
        error: false,
        message: 'Email successfully verified',
      });
    } catch (error) {
      // Handle errors gracefully
      return this.handleError(next, error.message);
    }
  }

  async resend(req, res, next) {
    try {
      const { _id } = req.user;

      const user = await User.findOne({ _id, role: 'USER' });

      if (!user) {
        return res.status(404).json({ error: true, message: 'User not found' });
      }

      if (user.verified) {
        return res.status(401).json({ error: true, message: 'User already verified' });
      }

      const otp = this.generateOtp();

      user.otp = otp;
      await user.save();

      await this.sendOtpMail(user.email, otp, 'Verify Your Account');

      const token = this.generateToken(user._id, this.userTypes.user, '5m');

      return res.status(200).json({
        error: false,
        message: 'OTP resent successfully',
        token,
      });
    } catch (error) {

      return this.handleError(next, error.message);
    }
  }

  async signin(req, res, next) {
    try {
      const { email, password } = req.body;

      // Validate input
      if (!email || !password) {
        return this.handleError(next, 'Email Or Password is required', 400);
      }

      // Step 1: Check if the user with the given email exists
      const user = await User.findOne({ email, role: 'USER' });

      if (!user) {
        return this.handleError(next, 'Invalid email.', 400);
      }

      // Step 2: Compare the provided password with the stored hashed password
      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        return this.handleError(next, 'Invalid password.', 400);
      }

      // Step 3: Check if the account is active
      if (!user.status) {
        return this.handleError(next, 'Account is deactivated.', 400);
      }

      let otp = 0;
      let authorization;

      // Step 4: If the user is not verified, generate an OTP and send it
      if (!user.verified) {
        otp = this.generateOtp();
        user.otp = otp;  // Update the user's OTP field
        await user.save();  // Save the user with the updated OTP

        // Generate a token valid for 5 minutes
        authorization = this.generateToken(user._id, this.userTypes.user, '5m');
        await this.sendOtpMail(user.email, otp, 'Verify Your Account');  // Send the OTP email
      } else {
        // If the user is verified, generate a long-term token (365 days)
        authorization = this.generateToken(user._id, this.userTypes.user, '365d');
      }

      // Step 5: Respond with success, along with user details and token
      return res.status(200).json({
        error: false,
        message: 'Login Successful',
        token: authorization,
        verified: user.verified,
        _id: user._id,
        otp,
        name: user.name,
        email: user.email,
        phone: user.phone,
      });

    } catch (error) {
      // Handle errors gracefully
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

      // Check if the user exists with the given email, is verified, and has the role 'USER'
      const user = await User.findOne({ email, verified: true, role: 'USER' });

      // If user not found, return an appropriate response
      if (!user) {
        return res.status(200).json({ error: true, message: 'Account Not Found.' });
      }

      // Generate OTP for verification
      const otp = this.generateOtp();

      // Generate token (5 minutes validity for OTP)
      const authorization = this.generateToken(user._id, this.userTypes.user, '5m');

      // Save the OTP in the user document
      user.otp = otp;
      await user.save();

      // Send the OTP email to the user
      await this.sendOtpMail(user.email, otp, 'Otp For Verification');

      // Return success response with OTP and token
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

      // Find the user by _id
      const user = await User.findById(_id);
      if (!user) {
        return this.handleError(next, 'User not found.', 404);
      }

      // Set the new password for the user
      user.password = password;

      // Save the user with the updated password
      await user.save();

      // Return success response
      return res.status(200).json({ error: false, message: 'Password changed successfully.' });
    } catch (error) {
      // Handle unexpected errors
      return this.handleError(next, error.message || 'An unexpected error occurred.');
    }
  }

}

export default new AuthController();
