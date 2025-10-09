import { Router } from 'express';
import MerchantController from '../../../../controllers/website/merchantController.js';

const router = Router();

router.get('/', MerchantController.get);
router.get('/:id', MerchantController.info);
    
export default router;
