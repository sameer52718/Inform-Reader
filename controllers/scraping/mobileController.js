import BaseController from '../BaseController.js';
import Mobile from '../../models/Mobile.js';

class SoftwareController extends BaseController {
  constructor() {
    super();
    this.insert = this.insert.bind(this);
  }
  async insert(req, res, next) {
    try {
      const data = req.body; // Expecting an array of phone objects
  
      // Insert the mobile data into the database
      await Mobile.insertMany(data);
  
      // Send a success response
      res.status(201).json({
        success: true,
        message: 'Mobile added successfully',
      });
  
    } catch (error) {
      // Handle errors (e.g., validation errors or database issues)
      return this.handleError(next, error);
    }
  }
}

export default new SoftwareController();
