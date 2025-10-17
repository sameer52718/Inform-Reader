import { Router } from 'express';
import MetalController from '../../../../controllers/website/metalController.js';

const router = Router();

router.get('/', MetalController.getMetalPrices);
router.get('/convert', MetalController.convertToMetal);
router.get('/price/:currency', MetalController.getMetalPricesByCurrency);
router.get('/:metal', MetalController.getMetalByName);
router.get('/rate/:pair', MetalController.getMetalCurrencyPair);
router.get('/compare/:metal', MetalController.compareMetals);
export default router;
