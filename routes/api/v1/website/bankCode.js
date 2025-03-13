import { Router } from 'express';
import BankCodeController from '../../../../controllers/website/bankCodeController.js';

const router = Router();

router.get('/', BankCodeController.get);

export default router;
