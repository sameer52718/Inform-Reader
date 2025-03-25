import { Router } from 'express';
import SoftwareController from '../../../../controllers/admin/softwareController.js';
import isUser from '../../../../middlewares/isUser.js';
import upload from '../../../../multer.js';
const router = Router();

router.get('/',isUser, SoftwareController.get);
router.post('/', isUser, upload.any(), SoftwareController.insert);
router.get('/:id',isUser, SoftwareController.info);
router.put('/:id',isUser, upload.any(), SoftwareController.update);
router.patch('/:id',isUser, SoftwareController.status);
router.delete('/:id',isUser, SoftwareController.delete);

export default router;
