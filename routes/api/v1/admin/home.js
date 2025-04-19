import { Router } from 'express';
import HomeController from '../../../../controllers/admin/homeController.js';
import upload from '../../../../multer.js';
import isUser from '../../../../middlewares/isUser.js';
const router = Router();

router.use(isUser);

router.get('/', HomeController.get);


export default router;
