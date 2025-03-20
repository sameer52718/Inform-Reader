import { Router } from 'express';
import authController from '../../../../controllers/admin/authController.js';
import upload from '../../../../multer.js';
import isUser from '../../../../middlewares/isUser.js';
const router = Router();

router.post('/signin', authController.signin);

router.post('/forgot', authController.forgot);
router.post('/change-password', isUser, authController.changePassword);

export default router;
