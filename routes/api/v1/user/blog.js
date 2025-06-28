import { Router } from 'express';
import BlogController from '../../../../controllers/user/blogController.js';
import isUser from '../../../../middlewares/isUser.js';
import upload from '../../../../multer.js';
const router = Router();

router.get('/', isUser, BlogController.get);
router.post('/', isUser, upload.any(), BlogController.insert);
router.get('/:id', isUser, BlogController.info);
router.put('/:id', isUser, upload.any(), BlogController.update);
router.patch('/:id', isUser, BlogController.status);
router.delete('/:id', isUser, BlogController.delete);

export default router;
