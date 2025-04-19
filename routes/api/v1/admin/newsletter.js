import { Router } from 'express';
import NewsLetterController from '../../../../controllers/admin/newsLetterController.js';
import isUser from '../../../../middlewares/isUser.js';
const router = Router();

router.use(isUser);

router.get('/', NewsLetterController.get);

export default router;
