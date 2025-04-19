import { Router } from 'express';
import UserController from '../../../../controllers/admin/userController.js';
import isUser from '../../../../middlewares/isUser.js';
const router = Router();

router.use(isUser);

router.get('/', UserController.get);


export default router;
