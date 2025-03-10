import { Router } from 'express';
import BankCodeController from '../../../../controllers/scraping/bankCodeController.js';
// import isUser from '../../../../middlewares/isUser.js';

const router = Router();

router.post('/', BankCodeController.insert);

export default router;
