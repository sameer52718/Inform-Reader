import { Router } from 'express';
import SpecificationController from '../../../../controllers/website/specificationController.js';

const router = Router();

router.get('/', SpecificationController.get);
router.get('/:category', SpecificationController.getAll);
router.get('/:category/:id', SpecificationController.detail);

export default router;
