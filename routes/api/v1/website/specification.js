import { Router } from 'express';
import SpecificationController from '../../../../controllers/website/specificationController.js';
import isUser from '../../../../middlewares/isUser.js';
const router = Router();

router.get('/', SpecificationController.get);
router.get('/:category', SpecificationController.getAll);
router.get('/:category/:id', SpecificationController.detail);
router.post('/wishlist', isUser, SpecificationController.wishlist);

export default router;
