import { Router } from 'express';
import ConfigController from '../../../../controllers/admin/configController.js';
import isUser from '../../../../middlewares/isUser.js';
import upload from '../../../../multer.js';

const router = Router();

router.post('/', isUser, upload.any(), ConfigController.update);

export default router;
