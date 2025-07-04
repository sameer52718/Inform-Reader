import jwt from 'jsonwebtoken';
import ErrorHandler from '../utils/Error.js';
import otpGenerator from 'otp-generator';
import sendMail, { EmailEnums, EmailTempletes } from '../utils/sendMail.js';
import mongoose from 'mongoose';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { v2 } from '@google-cloud/translate';
// import User from '../models/User.js';
// import Notification from '../models/Notification.js';

class BaseController {
  constructor() {
    this.translateClient = new v2.Translate();
  }

  userTypes = {
    user: 1,
    admin: 2,
  };

  async translateRecursive(obj, from, to) {
    const untranslatable = new Set(['john@example.com', '+1 (555) 123-4567', '+1 (555) 000-0000', '••••••••', 'www.informreaders.com', '123 News Street, New York, NY 10001']);

    const paths = [];
    const values = [];

    // Step 1: Recursively collect strings and their paths
    const collect = (curr, path = [], parentIsArray = false) => {
      if (typeof curr === 'string') {
        paths.push({ path, parentIsArray });
        values.push(curr);
        console.log(`Collected: Path = ${JSON.stringify(path)}, Value = "${curr}"`);
      } else if (typeof curr === 'object' && curr !== null) {
        const isArray = Array.isArray(curr);
        for (const key in curr) {
          const newKey = isArray ? Number(key) : key;
          collect(curr[key], [...path, newKey], isArray);
        }
      }
    };
    collect(obj);

    if (values.length === 0) return obj;

    // Step 2: Translate strings
    const translatedValues = [];
    for (let i = 0; i < values.length; i++) {
      const value = values[i];
      if (untranslatable.has(value)) {
        translatedValues.push(value); // Skip translation
        console.log(`Skipped: Index ${i}, Value = "${value}"`);
      } else {
        try {
          const [translated] = await this.translateClient.translate(value, {
            from,
            to,
            format: 'text',
          });
          const cleaned = translated.trim();
          if (!cleaned) {
            console.warn(`Empty translation at index ${i}, using original.`);
            translatedValues.push(value);
          } else {
            translatedValues.push(cleaned);
            console.log(`Translated: Index ${i}, Original = "${value}", Translated = "${cleaned}"`);
          }
        } catch (err) {
          console.error(`Translation failed at index ${i} for "${value}":`, err);
          translatedValues.push(value);
        }
      }
    }

    // Step 3: Validate translation count
    if (translatedValues.length !== values.length) {
      console.error('Original values:', values);
      console.error('Translated values:', translatedValues);
      throw new Error(`Translation mismatch: ${values.length} expected, got ${translatedValues.length}`);
    }

    // Optional: Warn on suspicious translation outputs
    translatedValues.forEach((val, idx) => {
      if (!val || /[\[\]#@]/.test(val)) {
        console.warn(`Suspicious translation at index ${idx}: "${val}" (original: "${values[idx]}")`);
      }
    });

    // Step 4: Rebuild translated object preserving structure
    const result = Array.isArray(obj) ? [] : {};

    const setDeep = (target, path, value, parentIsArray) => {
      let ref = target;

      for (let i = 0; i < path.length - 1; i++) {
        const key = path[i];
        const nextKey = path[i + 1];
        const isNextArrayIndex = Number.isInteger(nextKey);

        if (!(key in ref)) {
          // Only create array/object if not already set
          ref[key] = isNextArrayIndex ? [] : {};
        }

        ref = ref[key];
      }

      const lastKey = path[path.length - 1];
      ref[lastKey] = value; // Set final translated string
    };

    paths.forEach(({ path, parentIsArray }, i) => {
      setDeep(result, path, translatedValues[i], parentIsArray);
    });

    console.log('Final Translated Object:', JSON.stringify(result, null, 2));
    return result;
  }

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
