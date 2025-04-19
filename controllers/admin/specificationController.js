import BaseController from '../BaseController.js';
import Specification from '../../models/Specification.js';

class SpecificationController extends BaseController {
  constructor() {
    super();
    this.get = this.get.bind(this);
    this.insert = this.insert.bind(this);
    this.data = this.data.bind(this);
    this.info = this.info.bind(this);
    this.update = this.update.bind(this);
    this.status = this.status.bind(this);
    this.delete = this.delete.bind(this);
    this.deleteData = this.deleteData.bind(this);
  }

  async get(req, res, next) {
    try {
      let { page = 1, limit = 10, isDeleted } = req.query;
      page = parseInt(page);
      limit = parseInt(limit);
      const skip = (page - 1) * limit;

      const filters = { isDeleted: false };
      if (isDeleted) filters.isDeleted = true;

      const specifications = await Specification.find(filters)
        .select('name price priceSymbal status createdAt image categoryId')
        .populate('categoryId', 'name')
        .populate('subCategoryId', 'name')
        .populate('brandId', 'name')
        .skip(skip)
        .limit(limit);

      const totalSpecifications = await Specification.countDocuments(filters);
      const totalPages = Math.ceil(totalSpecifications / limit);

      return res.status(200).json({
        error: false,
        data: specifications,
        pagination: {
          totalItems: totalSpecifications,
          currentPage: page,
          totalPages,
          pageSize: limit,
        },
      });
    } catch (error) {
      return this.handleError(next, error.message || 'An unexpected error occurred', 500);
    }
  }

  async insert(req, res, next) {
    try {
      const { _id } = req.user;
      const { brandId, name, price, priceSymbal, categoryId, subCategoryId } = req.body;

      if (!brandId || !name || !price) {
        return this.handleError(next, 'All required fields (brandId, name, price) must be provided', 400);
      }

      // Handle image and banner picture upload if a file is provided
      let image = '';

      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          const fieldname = file.fieldname;
          const fileName = file.originalname;
          const filePath = this.createPath('specification/' + fieldname + '/', fileName);
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

      const newSpecification = await Specification.create({
        brandId,
        categoryId,
        subCategoryId,
        adminId: _id,
        name,
        price,
        priceSymbal: priceSymbal || 'PKR',
        image,
      });

      return res.status(201).json({
        error: false,
        message: 'Specification added successfully',
      });
    } catch (error) {
      return this.handleError(next, error.message || 'An unexpected error occurred', 500);
    }
  }

  async data(req, res, next) {
    try {
      const { specificationId, data } = req.body;

      if (!specificationId || !Array.isArray(data)) {
        return this.handleError(next, 'specificationId and a valid data array are required', 400);
      }

      // Find the Specification document
      const specification = await Specification.findOne({ _id: specificationId });

      if (!specification) {
        return this.handleError(next, 'Specification not found', 404);
      }

      // Ensure specification.data exists
      if (!specification.data) {
        specification.data = {}; // Initialize if empty
      }

      // Iterate over the incoming data array and update sections dynamically
      data.forEach((section) => {
        const { name, data: sectionData } = section;

        if (!specification.data[name]) {
          specification.data[name] = []; // Initialize if missing
        }

        specification.data[name] = sectionData; // Update the field
      });

      await specification.save(); // Save the updated document

      return res.status(200).json({
        error: false,
        message: 'Specification data updated successfully',
      });
    } catch (error) {
      return this.handleError(next, error.message || 'An unexpected error occurred', 500);
    }
  }

  async info(req, res, next) {
    try {
      const { id } = req.params;
      const specification = await Specification.findById(id)
        .populate('adminId', 'name')
        .populate('categoryId', 'name')
        .populate('subCategoryId', 'name')
        .populate('brandId', 'name');

      if (!specification) {
        return this.handleError(next, 'Specification not found', 404);
      }

      return res.status(200).json({
        error: false,
        specification,
      });
    } catch (error) {
      return this.handleError(next, error.message || 'An unexpected error occurred', 500);
    }
  }

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const updates = req.body;

      if (!id) {
        return this.handleError(next, 'Specification ID is required', 400);
      }

      const specification = await Specification.findById(id);
      if (!specification) {
        return this.handleError(next, 'Specification not found', 404);
      }

      // Prevent updating protected fields (e.g., `_id`, `adminId`)
      const protectedFields = ['_id', 'adminId'];
      protectedFields.forEach((field) => delete updates[field]);

      // If updating image, handle image upload
      let image = specification.image; // Preserve existing image
      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          const fieldname = file.fieldname;
          const fileName = file.originalname;
          const filePath = this.createPath('specification/' + fieldname + '/', fileName);
          const attachedPath = this.attachPath(filePath);

          // Check file size (Max: 2MB)
          const maxSize = 2 * 1024 * 1024;
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

            if (fieldname === 'image') {
              image = attachedPath;
            }
          } catch (uploadError) {
            return this.handleError(next, 'An error occurred during image upload', 500);
          }
        }
      }

      // Apply updates to the Specification document
      Object.assign(specification, updates);
      specification.image = image; // Update image if changed

      await specification.save();

      return res.status(200).json({
        error: false,
        message: 'Specification updated successfully',
      });
    } catch (error) {
      return this.handleError(next, error.message || 'An unexpected error occurred', 500);
    }
  }

  async status(req, res, next) {
    try {
      const { id } = req.params;

      const filters = { isDeleted: false, _id: id };
      const specification = await Specification.findOne(filters);
      if (!specification) {
        return this.handleError(next, 'Specification not found', 404);
      }

      specification.status = !specification.status;

      await specification.save();

      return res.status(200).json({
        error: false,
        message: `Specification status updated successfully to ${specification.status ? 'Active' : 'De-Active'}`,
      });
    } catch (error) {
      return this.handleError(next, error.message || 'An unexpected error occurred', 500);
    }
  }

  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const specification = await Specification.findById(id);
      if (!specification) {
        return this.handleError(next, 'Specification not found', 404);
      }

      specification.isDeleted = !specification.isDeleted;
      await specification.save();

      return res.status(200).json({
        error: false,
        message: `Specification has been ${specification.isDeleted ? 'deleted' : 'restored'} successfully`,
      });
    } catch (error) {
      return this.handleError(next, error.message || 'An unexpected error occurred', 500);
    }
  }

  async deleteData(req, res, next) {
    try {
      const { id } = req.params;
      const { sectionName, entryId } = req.body;

      if (!sectionName || !entryId) {
        return this.handleError(next, 'sectionName, and entryId are required', 400);
      }

      // Find the specification document
      const specification = await Specification.findById(id);
      if (!specification) {
        return this.handleError(next, 'Specification not found', 404);
      }

      // Check if the section exists and is an array
      if (!specification.data || !Array.isArray(specification.data[sectionName])) {
        return this.handleError(next, `Section '${sectionName}' not found or not an array`, 404);
      }

      // Filter out the specific entry by ID
      specification.data[sectionName] = specification.data[sectionName].filter((item) => item._id.toString() !== entryId);

      // Save the updated document
      await specification.save();

      return res.status(200).json({
        error: false,
        message: `Entry with ID '${entryId}' deleted from section '${sectionName}'`,
      });
    } catch (error) {
      return this.handleError(next, error.message || 'An unexpected error occurred', 500);
    }
  }
}

export default new SpecificationController();
