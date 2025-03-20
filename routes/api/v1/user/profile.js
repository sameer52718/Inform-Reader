import { Router } from 'express';
import profileController from '../../../../controllers/user/profileController.js';
import isUser from '../../../../middlewares/isUser.js';
const router = Router();

router.post('/',isUser, profileController.update);
router.post('/change-password',isUser, profileController.changePassword);

export default router;
