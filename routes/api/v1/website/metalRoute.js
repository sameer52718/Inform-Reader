import { Router } from 'express';
import MetalController from '../../../../controllers/website/metalController.js';

const router = Router();

router.get('/', MetalController.getMetalPrices);
router.get('/convert', MetalController.convertToMetal);

export default router;
