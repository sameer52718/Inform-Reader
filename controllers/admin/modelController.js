import BaseController from '../BaseController.js';
import Model from '../../models/Model.js';

class ModelController extends BaseController {
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

      const models = await Model.find(filters).populate('adminId', 'name').populate('makeId', 'name').select('name status createdAt');

      return res.status(200).json({
        error: false,
        models,
      });
    } catch (error) {
      return this.handleError(next, error.message || 'An unexpected error occurred', 500);
    }
  }

  async insert(req, res, next) {
    try {
      const { _id } = req.user;
      const { name, makeId } = req.body;

      if (!name || !makeId) {
        return this.handleError(next, 'All fields (name, makeId) are required', 400);
      }

      const existingModel = await Model.findOne({ name });
      if (existingModel) {
        return this.handleError(next, 'Model with this name already exists', 400);
      }

      // Handle image and banner picture upload if a file is provided
      let image = '';

      if (req.files && req.files.length > 0) {
          for (const file of req.files) {
              const fieldname = file.fieldname;
              const fileName = file.originalname;
              const filePath = this.createPath('model/' + fieldname + '/', fileName);
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

      const newModel = await Model.create({
        adminId: _id,
        makeId,
        name,
        image
      });

      return res.status(201).json({
        error: false,
        message: 'Model created successfully',
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
      const model = await Model.findOne(filters).populate('adminId', 'name image').populate('makeId', 'name');

      return res.status(200).json({
        error: false,
        model,
      });
    } catch (error) {
      return this.handleError(next, error.message || 'An unexpected error occurred', 500);
    }
  }

  async update(req, res, next) {
    try {
      const { _id } = req.user;
      const { name, makeId } = req.body;
      const { id } = req.params;

      if (!name || !makeId) {
        return this.handleError(next, 'All fields (name, makeId) are required', 400);
      }

      const existingModel = await Model.findById(id);
      if (!existingModel) {
        return this.handleError(next, 'Model not found', 404);
      }

      const duplicateModel = await Model.findOne({ name, _id: { $ne: id } });
      if (duplicateModel) {
        return this.handleError(next, 'Model with this name already exists', 400);
      }

      // Handle image and banner picture upload if a file is provided
      let image = existingModel.image;

      if (req.files && req.files.length > 0) {
          for (const file of req.files) {
              const fieldname = file.fieldname;
              const fileName = file.originalname;
              const filePath = this.createPath('model/' + fieldname + '/', fileName);
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

      existingModel.name = name;
      existingModel.name = image;
      existingModel.makeId = makeId;
      await existingModel.save();

      return res.status(200).json({
        error: false,
        message: 'Model updated successfully',
      });
    } catch (error) {
      return this.handleError(next, error.message || 'An unexpected error occurred', 500);
    }
  }

  async status(req, res, next) {
    try {
      const { id } = req.params;

      const filters = { isDeleted: false, _id: id };
      const model = await Model.findOne(filters);
      if (!model) {
        return this.handleError(next, 'Model not found', 404);
      }

      model.status = !model.status;

      await model.save();

      return res.status(200).json({
        error: false,
        message: `Model status updated successfully to ${model.status ? 'Active' : 'De-Active'}`,
      });
    } catch (error) {
      return this.handleError(next, error.message || 'An unexpected error occurred', 500);
    }
  }

  async delete(req, res, next) {
    try {
      const { id } = req.params;

      const model = await Model.findById(id);
      if (!model) {
        return this.handleError(next, 'Model not found', 404);
      }

      model.isDeleted = !model.isDeleted;
      await model.save();

      return res.status(200).json({
        error: false,
        message: `Model has been ${model.isDeleted ? 'deleted' : 'restored'} successfully`,
      });
    } catch (error) {
      return this.handleError(next, error.message || 'An unexpected error occurred', 500);
    }
  }
}

export default new ModelController();
