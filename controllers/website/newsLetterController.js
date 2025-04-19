import BaseController from '../BaseController.js';
import NewsLetter from '../../models/NewsLetter.js';

class NewsLetterController extends BaseController {
    constructor() {
        super();
        this.insert = this.insert.bind(this);
    }

    async insert(req, res, next) {
        try {
            const { email } = req.body;

            if (!email) {
                return this.handleError(next, 'Email is required', 400);
            }

            const existingEmail = await NewsLetter.findOne({ email });

            if (existingEmail) {
                return res.status(409).json({
                    error: true,
                    message: 'Email is already subscribed',
                });
            }

            const newNewsLetter = new NewsLetter({ email });
            await newNewsLetter.save();

            return res.status(201).json({
                error: false,
                message: 'Newsletter subscribed successfully',
            });

        } catch (error) {
            // Handle errors gracefully
            return this.handleError(next, error.message || 'An unexpected error occurred');
        }
    }


}

export default new NewsLetterController();
