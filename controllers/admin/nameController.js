import BaseController from '../BaseController.js';
import Name from '../../models/Name.js';

class NameController extends BaseController {
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
            let { page = 1, limit = 10, isDeleted } = req.query;

            page = parseInt(page);
            limit = parseInt(limit);
            const skip = (page - 1) * limit;

            const filters = { isDeleted: false };

            if (isDeleted) {
                filters.isDeleted = true;
            }

            const names = await Name.find(filters)
                .populate('adminId', 'name')
                .populate('religionId', 'name')
                .select('name origion status createdAt')
                .skip(skip)
                .limit(limit);

            const totalNames = await Name.countDocuments(filters);
            const totalPages = Math.ceil(totalNames / limit);

            return res.status(200).json({
                error: false,
                names,
                pagination: {
                    totalItems: totalNames,
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
            const { religionId, name, shortMeaning, longMeaning, gender, origion, shortName } = req.body;
    
            if (!religionId || !name || !shortMeaning || !longMeaning || !gender || !origion || !shortName) {
                return this.handleError(next, 'All fields (religionId, name, shortMeaning, longMeaning, gender, origion, shortName) are required', 400);
            }
    
            // Extract initial letter and name length
            const initialLetter = name.charAt(0).toUpperCase(); // First letter in uppercase
            const nameLength = name.length.toString(); // Convert length to string
    
            const existingName = await Name.findOne({ name });
            if (existingName) {
                return this.handleError(next, 'Name with this name already exists', 400);
            }
    
            const newName = await Name.create({
                adminId: _id,
                religionId,
                name,
                shortMeaning,
                longMeaning,
                gender,
                origion,
                shortName,
                initialLetter,  // Added
                nameLength      // Added
            });
    
            return res.status(201).json({
                error: false,
                message: 'Name created successfully',
            });
    
        } catch (error) {
            return this.handleError(next, error.message || 'An unexpected error occurred', 500);
        }
    }
    

    async info(req, res, next) {
        try {
            let { id } = req.params;

            const filters = { isDeleted: false, _id: id };
            const name = await Name.findOne(filters)
            .populate('adminId', 'name')
            .populate('religionId', 'name')
            .populate('categoryId', 'name');

            return res.status(200).json({
                error: false,
                name,
            });

        } catch (error) {
            return this.handleError(next, error.message || 'An unexpected error occurred', 500);
        }
    }

    async update(req, res, next) {
        try {
            const { _id } = req.user;
            const { id } = req.params;
            const { religionId, name, shortMeaning, longMeaning, gender, origion, shortName } = req.body;
    
            if (!religionId || !name || !shortMeaning || !longMeaning || !gender || !origion || !shortName) {
                return this.handleError(next, 'All fields (religionId, name, shortMeaning, longMeaning, gender, origion, shortName) are required', 400);
            }
    
            const existingName = await Name.findById(id);
            if (!existingName) {
                return this.handleError(next, 'Name not found', 404);
            }
    
            const duplicateName = await Name.findOne({ name, _id: { $ne: id } });
            if (duplicateName) {
                return this.handleError(next, 'Name with this name already exists', 400);
            }
    
            // Update initial letter and name length
            const initialLetter = name.charAt(0).toUpperCase();
            const nameLength = name.length.toString();
    
            // Update the existing name
            existingName.religionId = religionId;
            existingName.name = name;
            existingName.shortMeaning = shortMeaning;
            existingName.longMeaning = longMeaning;
            existingName.gender = gender;
            existingName.origion = origion;
            existingName.shortName = shortName;
            existingName.initialLetter = initialLetter; // Updated dynamically
            existingName.nameLength = nameLength;       // Updated dynamically
            existingName.adminId = _id; // Track the admin who updated it
    
            await existingName.save();
    
            return res.status(200).json({
                error: false,
                message: 'Name updated successfully',
            });
    
        } catch (error) {
            return this.handleError(next, error.message || 'An unexpected error occurred', 500);
        }
    }
    

    async status(req, res, next) {
        try {
            const { id } = req.params;

            const filters = { isDeleted: false, _id: id };
            const name = await Name.findOne(filters);
            if (!name) {
                return this.handleError(next, 'Name not found', 404);
            }

            name.status = !name.status;

            await name.save();

            return res.status(200).json({
                error: false,
                message: `Name status updated successfully to ${name.status ? 'Active' : 'De-Active'}`,
            });

        } catch (error) {
            return this.handleError(next, error.message || 'An unexpected error occurred', 500);
        }
    }

    async delete(req, res, next) {
        try {
            const { id } = req.params;

            const name = await Name.findById(id);
            if (!name) {
                return this.handleError(next, 'Name not found', 404);
            }

            name.isDeleted = !name.isDeleted;
            await name.save();

            return res.status(200).json({
                error: false,
                message: `Name has been ${name.isDeleted ? 'deleted' : 'restored'} successfully`,
            });

        } catch (error) {
            return this.handleError(next, error.message || 'An unexpected error occurred', 500);
        }
    }

}

export default new NameController();
