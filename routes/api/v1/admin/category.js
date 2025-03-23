import { Router } from 'express';
import CategoryController from '../../../../controllers/admin/categoryController.js';
import isUser from '../../../../middlewares/isUser.js';
const router = Router();

router.get('/',isUser, CategoryController.get);
router.post('/',isUser, CategoryController.insert);
router.get('/:id',isUser, CategoryController.info);
router.put('/:id',isUser, CategoryController.update);
router.patch('/:id',isUser, CategoryController.status);
router.delete('/:id',isUser, CategoryController.delete);


export default router;
