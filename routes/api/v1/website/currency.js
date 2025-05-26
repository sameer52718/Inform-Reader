import { Router } from 'express';
import CurrencyConversionController from '../../../../controllers/website/currencyConversionController.js';

const router = Router();

router.get('/', CurrencyConversionController.getCurrencies);
router.get('/convert', CurrencyConversionController.convert);

export default router;
