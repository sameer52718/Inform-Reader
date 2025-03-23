import { Router } from 'express';
import SubCategoryController from '../../../../controllers/admin/subCategoryController.js';
import isUser from '../../../../middlewares/isUser.js';
const router = Router();

router.get('/',isUser, SubCategoryController.get);
router.post('/',isUser, SubCategoryController.insert);
router.get('/:id',isUser, SubCategoryController.info);
router.put('/:id',isUser, SubCategoryController.update);
router.patch('/:id',isUser, SubCategoryController.status);
router.delete('/:id',isUser, SubCategoryController.delete);


export default router;
