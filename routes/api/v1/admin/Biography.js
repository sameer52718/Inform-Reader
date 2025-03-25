import { Router } from 'express';
import BiographyController from '../../../../controllers/admin/biographyController.js';
import isUser from '../../../../middlewares/isUser.js';
import upload from '../../../../multer.js';
const router = Router();

router.get('/',isUser, BiographyController.get);
router.post('/', isUser, upload.any(), BiographyController.insert);
router.post('/general', isUser, BiographyController.general);
router.get('/:id',isUser, BiographyController.info);
router.put('/:id',isUser, upload.any(), BiographyController.update);
router.patch('/:id',isUser, BiographyController.status);
router.delete('/:id',isUser, BiographyController.delete);
router.delete('/general/:id',isUser, BiographyController.deleteGeneralInfo);

export default router;
