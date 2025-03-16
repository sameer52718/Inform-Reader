import { Router } from 'express';
import SpecificationController from '../../../../controllers/website/specificationController.js';

const router = Router();

router.get('/', SpecificationController.get);

export default router;
