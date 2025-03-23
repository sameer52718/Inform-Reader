import { Router } from 'express';
import BrandController from '../../../../controllers/admin/brandController.js';
import isUser from '../../../../middlewares/isUser.js';
const router = Router();

router.get('/',isUser, BrandController.get);
router.post('/',isUser, BrandController.insert);
router.get('/:id',isUser, BrandController.info);
router.put('/:id',isUser, BrandController.update);
router.patch('/:id',isUser, BrandController.status);
router.delete('/:id',isUser, BrandController.delete);


export default router;
