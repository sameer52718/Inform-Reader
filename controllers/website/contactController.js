import BaseController from '../BaseController.js';
import Contact from '../../models/Contact.js';

class ContactController extends BaseController {
    constructor() {
        super();
        this.insert = this.insert.bind(this);
    }

    async insert(req, res, next) {
        try {
            const { name, email, subject, message } = req.body;

            if (!email || !subject || !message || !name) {
                return this.handleError(next, 'Email, Message, Name or Subject is required', 400);
            }

            const newContact = new Contact({
                name,
                email,
                message,
                subject,
            });

            await newContact.save();

            return res.status(201).json({
                error: false,
                message: 'Contact Message Submited Successfully',
            });

        } catch (error) {
            // Handle errors gracefully
            return this.handleError(next, error.message || 'An unexpected error occurred');
        }
    }

}

export default new ContactController();
