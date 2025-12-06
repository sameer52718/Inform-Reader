import { Router } from 'express';
import SpecificationController from '../../../../controllers/website/specificationController.js';
import isUser from '../../../../middlewares/isUser.js';
const router = Router();

router.get('/', SpecificationController.get);
router.get('/:categorySlug', SpecificationController.getBrands);
router.get('/:categorySlug/:brandSlug', SpecificationController.getAll);
router.get('/:categorySlug/:brandSlug/:slug', SpecificationController.detail);
router.post('/wishlist', isUser, SpecificationController.wishlist);

export default router;
