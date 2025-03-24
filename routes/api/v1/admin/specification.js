import { Router } from 'express';
import SpecificationController from '../../../../controllers/admin/specificationController.js';
import isUser from '../../../../middlewares/isUser.js';
import upload from '../../../../multer.js';
const router = Router();

router.get('/',isUser, SpecificationController.get);
router.post('/', isUser, upload.any(), SpecificationController.insert);
router.post('/data', isUser, SpecificationController.data);
router.get('/:id',isUser, SpecificationController.info);
router.put('/:id',isUser, upload.any(), SpecificationController.update);
router.patch('/:id',isUser, SpecificationController.status);
router.delete('/:id',isUser, SpecificationController.delete);
router.delete('/data/:id',isUser, SpecificationController.deleteData);


export default router;
