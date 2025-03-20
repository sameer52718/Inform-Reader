import { Router } from 'express';
import authController from '../../../../controllers/user/authController.js';
import upload from '../../../../multer.js';
import isUser from '../../../../middlewares/isUser.js';
const router = Router();

router.post('/signup', upload.any(), authController.signup);
router.post('/verify',isUser ,authController.verify);
router.get('/resend',isUser , authController.resend);
router.post('/signin', authController.signin);

router.post('/forgot', authController.forgot);
router.post('/change-password', isUser, authController.changePassword);

export default router;
