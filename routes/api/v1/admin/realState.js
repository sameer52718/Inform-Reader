import { Router } from 'express';
import RealStateController from '../../../../controllers/admin/realStateController.js';
import isUser from '../../../../middlewares/isUser.js';
import upload from '../../../../multer.js';
const router = Router();

router.get('/',isUser, RealStateController.get);
router.post('/', isUser, upload.any(), RealStateController.insert);
router.get('/:id',isUser, RealStateController.info);
router.put('/:id',isUser, upload.any(), RealStateController.update);
router.patch('/:id',isUser, RealStateController.status);
router.delete('/:id',isUser, RealStateController.delete);
router.post('/image/:id',isUser, RealStateController.deleteImage);

export default router;
