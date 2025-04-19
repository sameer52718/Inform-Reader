import { Router } from 'express';
import NewsLetterController from '../../../../controllers/website/newsLetterController.js';

const router = Router();

router.post('/', NewsLetterController.insert);

export default router;
