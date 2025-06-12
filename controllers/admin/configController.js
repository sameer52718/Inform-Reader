import BaseController from '../BaseController.js';
import Config from '../../models/Config.js';

class ConfigController extends BaseController {
  constructor() {
    super();
    this.update = this.update.bind(this);
  }

  async update(req, res, next) {
    try {
      const updates = req.body;

      // Find the existing config document
      const config = await Config.findOne();
      if (!config) {
        return this.handleError(next, 'Configuration not found', 404);
      }

      // Prevent updating protected fields
      const protectedFields = ['_id', 'createdAt', 'updatedAt'];
      protectedFields.forEach((field) => delete updates[field]);

      // Handle logo upload if provided
      let logo = config.logo; // Preserve existing logo
      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          const fieldname = file.fieldname;
          const fileName = file.originalname;
          const filePath = this.createPath('config/' + fieldname + '/', fileName);
          const attachedPath = this.attachPath(filePath);

          // Validate file size (max 2MB)
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

            if (fieldname === 'logo') {
              logo = attachedPath;
            }
          } catch (uploadError) {
            console.log(uploadError);

            return this.handleError(next, 'An error occurred during logo upload', 500);
          }
        }
      }

      // Apply updates to the config document
      Object.assign(config, updates);
      config.logo = logo; // Update logo if changed

      await config.save();

      return res.status(200).json({
        error: false,
        message: 'Configuration updated successfully',
      });
    } catch (error) {
      return this.handleError(next, error.message || 'An unexpected error occurred', 500);
    }
  }
}

export default new ConfigController();
