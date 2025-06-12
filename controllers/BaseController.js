import jwt from 'jsonwebtoken';
import ErrorHandler from '../utils/Error.js';
import otpGenerator from 'otp-generator';
import sendMail, { EmailEnums, EmailTempletes } from '../utils/sendMail.js';
import mongoose from 'mongoose';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
// import User from '../models/User.js';
// import Notification from '../models/Notification.js';

class BaseController {
  userTypes = {
    user: 1,
    admin: 2,
  };

  /**
   * Generates a JWT token
   * @param {string} id - User/Admin ID
   * @param {number} type - User type (1 for admin, 2 for dummy admin, etc.)
   * @returns {string} JWT token
   */
  generateToken(id, type, duration = '365d') {
    return jwt.sign({ id, type }, process.env.JWT_SECRET_KEY, {
      expiresIn: duration,
    });
  }

  isValidId(id) {
    return mongoose.Types.ObjectId.isValid(id);
  }

  /**
   * Handles error by passing it to the next middleware
   * @param {Error} error - Error to handle
   * @param {number} statusCode - HTTP status code
   * @param {string} message - Custom error message
   */
  handleError(next, message, statusCode = 500) {
    const error = new ErrorHandler(message, statusCode);
    next(error);
  }

  /**
   * Standard validation to check if required fields are missing
   * @param {object} fields - An object of fields to check
   * @param {array} requiredFields - List of required fields to check
   * @returns {boolean} True if all fields are present, otherwise false
   */
  validateFields(fields, requiredFields) {
    for (const field of requiredFields) {
      if (!fields[field]) {
        console.log(field, 'not found');
        return false;
      }
    }
    return true;
  }

  /**
   * Generates a 6-digit OTP
   * @returns {string} OTP
   */
  generateOtp() {
    return otpGenerator.generate(6, {
      lowerCaseAlphabets: false,
      upperCaseAlphabets: false,
      specialChars: false,
    });
  }

  /**
   * Verifies a JWT token
   * @param {string} token - JWT token to verify
   * @returns {object} Decoded token data
   * @throws {Error} If token is invalid or expired
   */
  verifyToken(token) {
    return jwt.verify(token, process.env.JWT_SECRET_KEY);
  }

  /**
   * Decodes a JWT token without verifying its signature
   * @param {string} token - JWT token to decode
   * @returns {object} Decoded token data
   */
  decodeToken(token) {
    return jwt.decode(token, process.env.JWT_SECRET_KEY);
  }

  /**
   * Uploads a file to AWS S3
   * @param {object} params - Parameters for uploading the file
   * @param {string} params.Key - The S3 key (file path)
   * @param {Buffer|string} params.Body - The file content (Buffer or string)
   * @param {string} params.ContentType - The content type of the file (e.g., 'image/jpeg')
   * @returns {boolean} Returns true if the file is uploaded successfully, false otherwise
   */

  /**
   * Uploads a file to a local directory
   * @param {object} params - Parameters for uploading the file
   * @param {string} params.Key - The file path (including filename)
   * @param {Buffer|string} params.Body - The file content (Buffer or string)
   * @param {string} params.ContentType - The content type of the file (e.g., 'image/jpeg')
   * @returns {boolean} Returns true if the file is uploaded successfully, false otherwise
   */
  async uploadFile({ Key, Body }) {
    const localDir = path.join(process.cwd(), 'uploads');

    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }

    const filePath = path.join(localDir, Key);
    const fileDir = path.dirname(filePath);
    if (!fs.existsSync(fileDir)) {
      fs.mkdirSync(fileDir, { recursive: true });
    }

    try {
      await fs.promises.writeFile(filePath, Body);
      console.log(`File uploaded successfully to ${filePath}`);
      return true;
    } catch (error) {
      console.error('Error uploading file:', error);
      return false;
    }
  }
  generateCredentialId() {
    const prefix = 'cert_';
    const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const randomPartLength = 6; // Length of the random string
    let randomPart = '';

    for (let i = 0; i < randomPartLength; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      randomPart += characters[randomIndex];
    }

    return prefix + randomPart;
  }

  attachPath(path) {
    return path ? process.env.AWS_BASE_URL + 'uploads/' + path : null;
  }

  /**
   * Constructs a file upload path based on the given directory and file name.
   *
   * @param {string} path - The directory path where the file will be uploaded.
   *                        This can be an empty string, or a subdirectory (e.g., 'banners/').
   * @param {string} name - The name of the file to be uploaded, including its extension (e.g., 'image.jpg').
   * @returns {string} The complete upload path in the format 'uploads/{path}{name}',
   *                  which can be used for storing files in an S3 bucket or local storage.
   *
   * @example
   * // Returns 'uploads/banners/image.jpg'
   * createPath('banners/', 'image.jpg');
   *
   * // Returns 'uploads/image.png'
   * createPath('', 'image.png');
   */
  createPath(path = '', name) {
    const newName = `${Date.now()}-${name.replaceAll(' ', '-')}`;

    return `${path}${newName}`;
  }
  /**
   * Sends an OTP via email
   * @param {string} email - The recipient's email address
   * @param {string} otp - The OTP to send
   * @param {string} subject - The Subject to send
   * @returns {Promise<boolean>} True if email was sent successfully, false otherwise
   */
  async sendOtpMail(email, otp, subject) {
    try {
      await sendMail({
        template: EmailTempletes.otp,
        subject,
        otp,
        email,
        type: EmailEnums.otp,
      });
      return true;
    } catch (error) {
      console.error('Error sending OTP email:', error);
      return false;
    }
  }

  async generateReferralCode(length = 6) {
    let referralCode;
    let isUnique = false;

    while (!isUnique) {
      referralCode = crypto.randomBytes(length).toString('base64').replace(/[+/=]/g, '').slice(0, length);

      if (/^\d+$/.test(referralCode)) {
        const user = await User.findOne({ referralCode });

        if (!user && referralCode.length > 5) {
          isUnique = true;
        }
      }
    }

    return referralCode;
  }

  findEarningAmount(type) {
    switch (type) {
      case 'video': // Replace 'type1' with the actual case value
        return 0.01;

      default:
        return 0.0;
    }
  }

  async insertNotification(data) {
    try {
      // Insert each notification into the database
      const results = await Notification.create(data);
    } catch (err) {
      console.error('Error inserting notifications:', err);
    }
  }

  // async prepareResponse(response){
  //   try {

  //     return response.errorMessage

  //   } catch (error) {
  //     console.error('Error sending OTP email:', error);
  //   }
  // }
}

export default BaseController;
