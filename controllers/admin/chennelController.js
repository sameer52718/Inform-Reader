import BaseController from '../BaseController.js';
import Chennel from '../../models/Chennel.js';
import path from 'path';
import { getIo } from '../../socket.js';

class ChennelController extends BaseController {
    constructor() {
        super();
        this.insert = this.insert.bind(this);
        this.get = this.get.bind(this);
        this.update = this.update.bind(this);
        this.status = this.status.bind(this);
        this.delete = this.delete.bind(this);
        this.messageInsert = this.messageInsert.bind(this);
        this.messageGet = this.messageGet.bind(this);
    }

    async insert(req, res, next) {
        try {

            const { name, description, adminId } = req.body;
            if (!name || !description || !adminId) {
                return res.status(400).json({ error: true, message: 'name, description, adminId are required.' });
            }

            // Handle profile and banner picture upload if a file is provided
            let profile = '';
            let cover = '';

            if (req.files && req.files.length > 0) {
                for (const file of req.files) {
                    const fieldname = file.fieldname;
                    const fileName = file.originalname;
                    const filePath = this.createPath('chennel/' + fieldname + '/', fileName);
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
                        if (fieldname === 'profile') {
                            profile = attachedPath;
                        } else if (fieldname === 'cover') {
                            cover = attachedPath;
                        }

                    } catch (uploadError) {
                        return this.handleError(next, 'An error occurred during image upload', 500);
                    }
                }
            }

            const newChennel = await Chennel.create({
                name,
                description,
                adminId,
                profile,
                cover,
            });

            // Respond with success
            return res.status(200).json({
                error: false,
                message: 'Chennel Created Successfully',
            });

        } catch (error) {
            return this.handleError(next, error.message);
        }
    }

    async get(req, res, next) {
        try {

            const channels = await Chennel.find({ status: 'ACTIVE', deleted: false })
                .select('name profile lastMessage updatedAt status')
                .sort({ updatedAt: -1 })
                .exec();

            if (!channels || channels.length === 0) {
                return res.status(404).json({ error: true, message: 'No channels found.' });
            }

            return res.status(200).json({
                error: false,
                channels: channels,
            });

        } catch (error) {
            return this.handleError(next, error.message);
        }
    }

    async update(req, res, next) {
        try {

            const { name, description } = req.body;
            const { id } = req.params;
            if (!name || !description) {
                return res.status(400).json({ error: true, message: 'name, description are required.' });
            }

            const chennel = await Chennel.findById(id);
            if (!chennel) {
                return res.status(404).json({ error: true, message: 'Chennel not found.' });
            }

            // Handle profile and banner picture upload if a file is provided
            let profile = chennel.profile;
            let cover = chennel.cover;

            if (req.files && req.files.length > 0) {
                for (const file of req.files) {
                    const fieldname = file.fieldname;
                    const fileName = file.originalname;
                    const filePath = this.createPath('chennel/' + fieldname + '/', fileName);
                    const attachedPath = this.attachPath(filePath);

                    // Check if the file size is greater than 2MB (2MB = 2 * 1024 * 1024 bytes)
                    const maxSize = 2 * 1024 * 1024; // 2MB
                    if (file.size > maxSize) {
                        return res.status(400).json({ error: true, message: `${fieldname} size exceeds 2MB limit.` });
                    }

                    try {
                        const isUploaded = await this.uploadFile({
                            Key: filePath,
                            Body: file.buffer,
                            ContentType: file.mimetype,
                        });

                        if (!isUploaded) {
                            return res.status(400).json({ error: true, message: `${fieldname} upload failed.` });
                        }

                        // Assign the appropriate field based on the fieldname
                        if (fieldname === 'profile') {
                            profile = attachedPath;
                        } else if (fieldname === 'cover') {
                            cover = attachedPath;
                        }

                    } catch (uploadError) {
                        return this.handleError(next, 'An error occurred during image upload', 500);
                    }
                }
            }

            // Update the chennel object with the new data
            chennel.name = name;
            chennel.description = description;
            chennel.profile = profile;
            chennel.cover = cover;

            await chennel.save();

            // Respond with success
            return res.status(200).json({
                error: false,
                message: 'Chennel Updated Successfully',
            });

        } catch (error) {
            return this.handleError(next, error.message);
        }
    }

    async status(req, res, next) {
        try {
            const { id } = req.params;

            const chennel = await Chennel.findById(id);
            if (!chennel) {
                return res.status(404).json({ error: true, message: 'Chennel not found.' });
            }

            const newStatus = chennel.status === 'ACTIVE' ? 'DEACTIVE' : 'ACTIVE';

            const updatedChennel = await Chennel.findByIdAndUpdate(id, { status: newStatus }, { new: true });

            return res.status(200).json({
                error: false,
                message: 'Chennel Status Updated Successfully',
            });

        } catch (error) {
            return this.handleError(next, error.message);
        }
    }

    async delete(req, res, next) {
        try {
            const { id } = req.params;

            const chennel = await Chennel.findById(id);
            if (!chennel) {
                return res.status(404).json({ error: true, message: 'Chennel not found.' });
            }

            const updatedChennel = await Chennel.findByIdAndUpdate(id, { deleted: true }, { new: true });

            return res.status(200).json({
                error: false,
                message: 'Chennel Deleted Successfully',
            });

        } catch (error) {
            return this.handleError(next, error.message);
        }
    }
    
    async messageInsert(req, res, next) {
        try {

            const { content } = req.body;
            const { files } = req;
            const { id } = req.params;

            if (!content && (!files || files.length === 0)) {
                return res.status(400).json({ error: true, message: 'Content & Attachments Both Are Empty!' });
            }

            const chennel = await Chennel.findById(id);
            if (!chennel) {
                return res.status(404).json({ error: true, message: 'Chennel not found.' });
            }

            let attachments = [];
            if (files && files.length > 0) {
                for (const file of files) {
                    const fileName = file.originalname;
                    const filePath = this.createPath('chennel/attachments/', fileName);
                    const attachedPath = this.attachPath(filePath);

                    try {
                        const isUploaded = await this.uploadFile({
                            Key: filePath,
                            Body: file.buffer, 
                            ContentType: file.mimetype,
                        });

                        if (!isUploaded) {
                            return this.handleError(next, 'Attachment upload failed', 400);
                        }

                        const attachment = {
                            fileUrl: attachedPath,
                            fileType: file.mimetype,
                            fileExtension: path.extname(fileName),
                            fileSize: file.size,
                        };

                        attachments.push(attachment);
                    } catch (uploadError) {
                        return this.handleError(next, uploadError, 500);
                    }
                }
            }

            const message = {
                content,
                attachments,
                isAdmin: true,
            };

            chennel.messages.push(message);
            await chennel.save();

            var messages = await Chennel.findById(id).populate('messages.senderId', 'name profile');

            const io = getIo();
            io.to(id).emit('newMessage', messages);

            return res.status(200).json({
                error: false,
                message: 'Message Sent Successfully',
            });

        } catch (error) {
            return this.handleError(next, error.message);
        }
    }

    async messageGet(req, res, next) {
        try {
            const { id } = req.params;
            const chennel = await Chennel.findById(id).populate('messages.senderId', 'name profile');
            if (!chennel) {
                return res.status(404).json({ error: true, message: 'chennel not found.' });
            }
    
            return res.status(200).json({
                error: false,
                message: chennel.messages,
            });
    
        } catch (error) {
            return this.handleError(next, error.message);
        }
    }


}

export default new ChennelController();
