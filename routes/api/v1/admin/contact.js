import { Router } from 'express';
import ContactController from '../../../../controllers/admin/contactController.js';
import isUser from '../../../../middlewares/isUser.js';
const router = Router();

router.use(isUser);

router.get('/', ContactController.get);


export default router;
