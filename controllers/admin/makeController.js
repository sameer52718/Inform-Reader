import BaseController from '../BaseController.js';
import Make from '../../models/Make.js';

class MakeController extends BaseController {
  constructor() {
    super();
    this.get = this.get.bind(this);
    this.insert = this.insert.bind(this);
    this.info = this.info.bind(this);
    this.update = this.update.bind(this);
    this.status = this.status.bind(this);
    this.delete = this.delete.bind(this);
  }

  async get(req, res, next) {
    try {
      let { isDeleted } = req.query;

      const filters = { isDeleted: false };

      if (isDeleted) {
        filters.isDeleted = true;
      }

      const makes = await Make.find(filters).populate('adminId', 'name').select('name status createdAt');

      return res.status(200).json({
        error: false,
        makes,
      });
    } catch (error) {
      return this.handleError(next, error.message || 'An unexpected error occurred', 500);
    }
  }

  async insert(req, res, next) {
    try {
      const { _id } = req.user;
      const { name } = req.body;

      if (!name) {
        return this.handleError(next, 'All fields (name) are required', 400);
      }

      const existingMake = await Make.findOne({ name });
      if (existingMake) {
        return this.handleError(next, 'Make with this name already exists', 400);
      }

      // Handle image and banner picture upload if a file is provided
      let image = '';

      if (req.files && req.files.length > 0) {
          for (const file of req.files) {
              const fieldname = file.fieldname;
              const fileName = file.originalname;
              const filePath = this.createPath('make/' + fieldname + '/', fileName);
              const attachedPath = this.attachPath(filePath);

              // Check if the file size is greater than 2MB (2MB = 2 * 1024 * 1024 bytes)
              const maxSize = 2 * 1024 * 1024; // 2MB
              if (file.size > maxSize) {
                  return this.handleError(next, `${fieldname} size exceeds 2MB limit`, 400);
              }

              try {
                  const isUploaded = await this.uploadFile({
                      Key: filePath,
                      Body: file.buffer,
                      ContentType: file.mimetype,
                  });

                  if (!isUploaded) {
                      return this.handleError(next, `${fieldname} upload failed`, 400);
                  }

                  // Assign the appropriate field based on the fieldname
                  if (fieldname === 'image') {
                      image = attachedPath;
                  }

              } catch (uploadError) {
                  return this.handleError(next, 'An error occurred during image upload', 500);
              }
          }
      }

      await Make.create({
        adminId: _id,
        name,
        image
      });

      return res.status(201).json({
        error: false,
        message: 'Make created successfully',
      });
    } catch (error) {
      // Centralized error handling
      return this.handleError(next, error.message || 'An unexpected error occurred', 500);
    }
  }

  async info(req, res, next) {
    try {
      let { id } = req.params;

      const filters = { isDeleted: false, _id: id };
      const make = await Make.findOne(filters).populate('adminId', 'name image');

      return res.status(200).json({
        error: false,
        make,
      });
    } catch (error) {
      return this.handleError(next, error.message || 'An unexpected error occurred', 500);
    }
  }

  async update(req, res, next) {
    try {
      const { _id } = req.user;
      const { name } = req.body;
      const { id } = req.params;

      if (!name) {
        return this.handleError(next, 'All fields (name) are required', 400);
      }

      const existingMake = await Make.findById(id);
      if (!existingMake) {
        return this.handleError(next, 'Make not found', 404);
      }

      const duplicateMake = await Make.findOne({ name, _id: { $ne: id } });
      if (duplicateMake) {
        return this.handleError(next, 'Make with this name already exists', 400);
      }

      // Handle image and banner picture upload if a file is provided
      let image = existingMake.image;

      if (req.files && req.files.length > 0) {
          for (const file of req.files) {
              const fieldname = file.fieldname;
              const fileName = file.originalname;
              const filePath = this.createPath('make/' + fieldname + '/', fileName);
              const attachedPath = this.attachPath(filePath);

              // Check if the file size is greater than 2MB (2MB = 2 * 1024 * 1024 bytes)
              const maxSize = 2 * 1024 * 1024; // 2MB
              if (file.size > maxSize) {
                  return this.handleError(next, `${fieldname} size exceeds 2MB limit`, 400);
              }

              try {
                  const isUploaded = await this.uploadFile({
                      Key: filePath,
                      Body: file.buffer,
                      ContentType: file.mimetype,
                  });

                  if (!isUploaded) {
                      return this.handleError(next, `${fieldname} upload failed`, 400);
                  }

                  // Assign the appropriate field based on the fieldname
                  if (fieldname === 'image') {
                      image = attachedPath;
                  }

              } catch (uploadError) {
                  return this.handleError(next, 'An error occurred during image upload', 500);
              }
          }
      }

      existingMake.name = name;
      existingMake.image = image;
      await existingMake.save();

      return res.status(200).json({
        error: false,
        message: 'Make updated successfully',
      });
    } catch (error) {
      return this.handleError(next, error.message || 'An unexpected error occurred', 500);
    }
  }

  async status(req, res, next) {
    try {
      const { id } = req.params;

      const filters = { isDeleted: false, _id: id };
      const make = await Make.findOne(filters);
      if (!make) {
        return this.handleError(next, 'Make not found', 404);
      }

      make.status = !make.status;

      await make.save();

      return res.status(200).json({
        error: false,
        message: `Make status updated successfully to ${make.status ? 'Active' : 'De-Active'}`,
      });
    } catch (error) {
      return this.handleError(next, error.message || 'An unexpected error occurred', 500);
    }
  }

  async delete(req, res, next) {
    try {
      const { id } = req.params;

      const make = await Make.findById(id);
      if (!make) {
        return this.handleError(next, 'Make not found', 404);
      }

      make.isDeleted = !make.isDeleted;
      await make.save();

      return res.status(200).json({
        error: false,
        message: `Make has been ${make.isDeleted ? 'deleted' : 'restored'} successfully`,
      });
    } catch (error) {
      return this.handleError(next, error.message || 'An unexpected error occurred', 500);
    }
  }
}

export default new MakeController();
